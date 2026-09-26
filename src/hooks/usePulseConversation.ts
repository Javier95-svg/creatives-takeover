import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { streamPulseHome } from '@/services/pulseHomeStream';
import { validateHomeActions, type PulseHomeMessage } from '@/lib/pulseHome';
import { pulseSourceNotice, validatePulseSources } from '@/lib/pulseSources';
import type { PulseScope } from '@/lib/pulseScope';

const db = supabase.schema('public');
// Widget history deliberately stays separate from Home, but uses exactly the
// same authenticated endpoint, context resolver and recommendation pipeline.
export function usePulseConversation(userId: string | undefined, scope: PulseScope, enabled: boolean, pagePath: string) {
  const key = `${userId}:${scope.userType}:${scope.projectId ?? 'account'}`;
  const currentKey = useRef(key); currentKey.current = key;
  const [state, setState] = useState({ key, messages: [] as PulseHomeMessage[], ready: false, streaming: false, error: '', notice: '' });
  const session = useRef<string | null>(null);
  const pending = useRef<{ text: string; turnId: string } | null>(null);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const [reload, setReload] = useState(0);
  const ready = enabled && state.key === key && state.ready;
  useEffect(() => {
    const generation = ++epoch.current;
    const abort = new AbortController(); controller.current = abort;
    busy.current = false; session.current = null; pending.current = null;
    setState({ key, messages: [], ready: false, streaming: false, error: '', notice: '' });
    if (enabled && userId) void (async () => {
      try {
        const { data: conversation, error } = await db.from('chatbot_conversations').select('id,session_id')
          .eq('user_id', userId).eq('purpose', 'pulse_home')
          .contains('business_context', { pulseScope: { ...scope, channel: 'widget' } })
          .order('created_at', { ascending: false }).limit(1).abortSignal(abort.signal).maybeSingle();
        if (error) throw error;
        const { data, error: historyError } = conversation ? await db.from('chatbot_messages').select('id,role,content,metadata')
          .eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(100).abortSignal(abort.signal) : { data: [], error: null };
        if (historyError) throw historyError;
        if (generation !== epoch.current || currentKey.current !== key || abort.signal.aborted) return;
        session.current = conversation?.session_id ?? null;
        const messages = [...(data ?? [])].reverse().filter(row => row.role === 'user' || row.role === 'assistant').map(row => {
          const metadata = row.metadata as Record<string, unknown> | null;
          return { id: metadata?.homeTurnId ? `${metadata.homeTurnId}:${row.role}` : row.id, role: row.role as 'user' | 'assistant', content: row.content,
            actions: validateHomeActions(metadata?.homeActions), sources: validatePulseSources(metadata?.contextSources) };
        });
        const last = data?.[0];
        const turnId = (last?.metadata as Record<string, unknown> | null)?.homeTurnId;
        if (last?.role === 'user' && typeof turnId === 'string') pending.current = { text: last.content, turnId };
        setState({ key, messages, ready: true, streaming: false, notice: '', error: pending.current ? 'Your last response did not finish. Retry to continue.' : '' });
      } catch {
        if (!abort.signal.aborted && generation === epoch.current && currentKey.current === key) setState(previous => ({ ...previous, error: 'Could not restore this conversation. Please retry.' }));
      }
    })();
    return () => { abort.abort(); controller.current?.abort(); epoch.current = generation + 1; };
  }, [key, enabled, reload, userId, scope]);

  const send = useCallback(async (text: string, retry = false) => {
    if (!ready || !userId || busy.current || !text.trim()) return;
    busy.current = true;
    const generation = epoch.current;
    const abort = new AbortController(); controller.current = abort;
    const alive = () => currentKey.current === key && generation === epoch.current && !abort.signal.aborted;
    const turn = retry && pending.current ? pending.current : { text: text.trim(), turnId: crypto.randomUUID() };
    pending.current = turn;
    const assistantId = `${turn.turnId}:assistant`;
    setState(previous => ({ ...previous, streaming: true, error: '', messages: [...previous.messages.filter(message => message.id !== assistantId),
      ...(!previous.messages.some(message => message.id === `${turn.turnId}:user`) ? [{ id: `${turn.turnId}:user`, role: 'user' as const, content: turn.text }] : []),
      { id: assistantId, role: 'assistant', content: '' }] }));
    try {
      if (!session.current) {
        const id = crypto.randomUUID();
        const { error } = await db.from('chatbot_conversations').insert({ user_id: userId, session_id: id, chat_mode: 'freeform', purpose: 'pulse_home', business_context: { pulseScope: { ...scope, channel: 'widget' } } }).abortSignal(abort.signal);
        if (error) throw new Error('Could not create this conversation. Please retry.');
        if (!alive()) return;
        session.current = id;
      }
      const update = (transform: (message: PulseHomeMessage) => PulseHomeMessage) => {
        if (alive()) setState(previous => ({ ...previous, messages: previous.messages.map(message => message.id === assistantId ? transform(message) : message) }));
      };
      await streamPulseHome({ sessionId: session.current, turnId: turn.turnId, message: turn.text, projectId: scope.projectId, surface: 'pulse_widget', pagePath, signal: abort.signal,
        onText: chunk => update(message => ({ ...message, content: message.content + chunk })),
        onActions: actions => update(message => ({ ...message, actions })),
        onSources: sources => { update(message => ({ ...message, sources })); if (alive()) setState(previous => ({ ...previous, notice: pulseSourceNotice(sources) })); },
      });
      if (alive()) pending.current = null;
    } catch (error) {
      if (alive()) setState(previous => ({ ...previous, error: error instanceof Error ? error.message : 'Pulse was interrupted. Please retry.' }));
    } finally {
      if (alive()) { busy.current = false; setState(previous => ({ ...previous, streaming: false })); }
    }
  }, [ready, userId, key, scope, pagePath]);
  return {
    messages: state.key === key ? state.messages : [], ready,
    streaming: state.key === key && state.streaming,
    error: state.key === key ? state.error : '', notice: state.key === key ? state.notice : '', send,
    retry: () => pending.current && ready ? void send(pending.current.text, true) : setReload(value => value + 1),
  };
}
