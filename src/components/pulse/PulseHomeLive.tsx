import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardDataProvider, useDashboardData } from '@/contexts/DashboardDataContext';
import { useStartupCommandCenter } from '@/hooks/useStartupCommandCenter';
import { useAssignedStage } from '@/hooks/useAssignedStage';
import { useProjects, useProjectOutcomes } from '@/hooks/useProjects';
import { buildPulseProjectContext } from '@/hooks/usePulseWidget';
import { useAccountContext } from '@/hooks/useAccountContext';
import { useAccountHomeDigest } from '@/hooks/useAccountHomeDigest';
import { personaChips, personaFocus, personaGuidanceContext, personaHome, personaInterestSummary } from '@/lib/personaHome';
import { supabase } from '@/integrations/supabase/client';
import { homePriorities, validateHomeActions, type PulseHomeConcept, type PulseHomeMessage } from '@/lib/pulseHome';
import { streamPulseHome } from '@/services/pulseHomeStream';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import { PulseHomeView } from './PulseHomeView';
import { captureEvent } from '@/lib/analytics';

// Explicit schema keeps these queries typed against the generated public tables.
const homeDb = supabase.schema('public');

function LiveConversation({ concept }: { concept: PulseHomeConcept }) {
  const { user } = useAuth();
  const userId = user!.id;
  const dashboard = useDashboardData();
  const startup = useStartupCommandCenter();
  // The stage the onboarding quiz placed them in, which is what the badge names.
  const assignedStage = useAssignedStage();
  // Pulse reasons about one project at a time. Sending the active project and
  // its six current outcomes is what makes that true rather than assumed: with
  // several projects open, results from one must not inform advice on another.
  const { activeProject, activeProjectId } = useProjects();
  const projectOutcomes = useProjectOutcomes(activeProjectId);
  const founderPriorities = useMemo(() => homePriorities(dashboard.snapshot, dashboard.primaryAction, key => getDashboardTool(key)?.route), [dashboard.snapshot, dashboard.primaryAction]);
  // A mentor, marketplace member or investor gets their own home. Founders and
  // builders resolve to null here, which is the signal to change nothing.
  const { userType, awaitingReview, roleProfile } = useAccountContext();
  const persona = personaHome(userType);
  const personaInterest = personaInterestSummary(userType, roleProfile);
  const guidanceContext = personaGuidanceContext(userType, roleProfile);
  const { digest } = useAccountHomeDigest();
  const chips = useMemo(() => (persona ? personaChips(persona, digest) : []), [persona, digest]);
  const priorities = useMemo(
    () => (persona ? personaFocus(persona, digest, awaitingReview) : founderPriorities),
    [persona, digest, awaitingReview, founderPriorities],
  );
  const [messages, setMessages] = useState<PulseHomeMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyReady, setHistoryReady] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<{ text: string; turnId: string } | null>(null);
  const retryAction = useRef<'restore' | 'send' | 'new'>('restore');
  const controller = useRef<AbortController | null>(null);
  const storageRequests = useRef(new AbortController());
  const alive = useRef(true);
  const busy = useRef(false);
  const refreshContext = useRef(() => {});
  refreshContext.current = () => { void startup.refresh(); void dashboard.refresh(); };

  useEffect(() => {
    alive.current = true;
    storageRequests.current = new AbortController();
    const refresh = () => { if (document.visibilityState === 'visible') refreshContext.current(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { alive.current = false; controller.current?.abort(); storageRequests.current.abort(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const createConversation = async () => {
    const nextSession = crypto.randomUUID();
    const { error } = await homeDb.from('chatbot_conversations').insert({ user_id: user!.id, session_id: nextSession, chat_mode: 'freeform', purpose: 'pulse_home' }).abortSignal(storageRequests.current.signal);
    if (error) throw new Error('Conversation storage is unavailable. Apply the Pulse Home migration and try again.');
    return nextSession;
  };

  const restore = useCallback(async () => {
    const started = performance.now();
    let outcome = 'success';
    retryAction.current = 'restore';
    setLoading(true); setError(''); setHistoryReady(false); pending.current = null;
    try {
      const { data: conversation, error } = await homeDb.from('chatbot_conversations').select('id, session_id').eq('user_id', userId).eq('purpose', 'pulse_home').order('created_at', { ascending: false }).limit(1).abortSignal(storageRequests.current.signal).maybeSingle();
      if (error) throw error;
      if (!conversation) { if (alive.current) { setSessionId(null); setMessages([]); setHistoryReady(true); } return; }
      const { data, error: messageError } = await homeDb.from('chatbot_messages').select('id, role, content, metadata').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(100).abortSignal(storageRequests.current.signal);
      if (messageError) throw messageError;
      if (!alive.current) return;
      setSessionId(conversation.session_id);
      setHistoryReady(true);
      const history = (data ?? []).reverse().filter(row => row.role === 'user' || row.role === 'assistant').map(row => {
        const metadata = row.metadata as Record<string, unknown> | null;
        return { id: metadata?.homeTurnId ? `${metadata.homeTurnId}:${row.role}` : row.id, role: row.role as 'user' | 'assistant', content: row.content, actions: validateHomeActions(metadata?.homeActions) };
      });
      setMessages(history);
      const last = data?.[data.length - 1];
      if (last?.role === 'user') {
        const turnId = (last.metadata as Record<string, unknown> | null)?.homeTurnId;
        if (typeof turnId === 'string') { pending.current = { text: last.content, turnId }; retryAction.current = 'send'; setError('Your last response did not finish. Retry to continue.'); }
      }
    } catch {
      outcome = 'failure';
      if (alive.current) setError('Could not restore your conversation. Check the connection and Pulse Home migration, then retry.');
    } finally { if (alive.current) { setLoading(false); captureEvent('pulse_home_operation', { operation: 'restore', outcome, duration_ms: Math.round(performance.now() - started), workspace_version: 'founder-guide-v1' }); } }
  }, [userId]);
  useEffect(() => { void restore(); }, [restore]); // Account changes remount this component by user ID.

  const send = async (text: string, retry = false) => {
    if (busy.current || loading || !historyReady) return;
    const started = performance.now();
    let outcome = 'success';
    busy.current = true; setStreaming(true); setError('');
    retryAction.current = 'send';
    const turn = retry && pending.current ? pending.current : { text, turnId: crypto.randomUUID() };
    pending.current = turn;
    const assistantId = `${turn.turnId}:assistant`;
    try {
      const id = sessionId ?? await createConversation();
      if (!alive.current) return;
      setSessionId(id);
      setMessages(previous => [...previous.filter(message => message.id !== assistantId), ...(!previous.some(message => message.id === `${turn.turnId}:user`) ? [{ id: `${turn.turnId}:user`, role: 'user' as const, content: turn.text }] : []), { id: assistantId, role: 'assistant', content: '' }]);
      controller.current = new AbortController();
      await streamPulseHome({ sessionId: id, turnId: turn.turnId, message: turn.text, signal: controller.current.signal,
        // A non founder has no project, and the snapshot fabricates a stage for
        // them, so both are withheld rather than sent as facts about them.
        context: { projectContext: persona || startup.loading || startup.error ? null : buildPulseProjectContext(startup.model), stage: persona ? null : dashboard.snapshot?.journey.currentStage ?? null, priorities, contextUnavailable: Boolean(startup.error || dashboard.error), currentPage: '/', currentTool: { name: 'Pulse Home', purpose: persona ? `${persona.composerPurpose}${guidanceContext ? `. Stated preferences: ${guidanceContext}` : ''} and platform navigation` : 'Personalized founder guidance and platform navigation' },
          activeProject: !persona && activeProject ? { id: activeProject.id, title: activeProject.title, ideaSummary: activeProject.ideaSummary } : null,
          projectOutcomes: persona ? null : projectOutcomes.data ?? null },
        onText: chunk => { if (alive.current) setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, content: message.content + chunk } : message)); },
        onActions: actions => { if (alive.current) setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, actions } : message)); },
      });
      pending.current = null;
    } catch (error) {
      outcome = 'failure';
      if (alive.current) setError(error instanceof Error ? error.message : 'Pulse was interrupted. Please retry.');
    } finally { busy.current = false; if (alive.current) { setStreaming(false); captureEvent('pulse_home_operation', { operation: 'stream', outcome, retry, duration_ms: Math.round(performance.now() - started), workspace_version: 'founder-guide-v1' }); } }
  };

  const newConversation = async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    retryAction.current = 'new';
    try { const id = await createConversation(); if (alive.current) { setSessionId(id); setMessages([]); setHistoryReady(true); pending.current = null; } }
    catch (error) { if (alive.current) setError(error instanceof Error ? error.message : 'Could not start a conversation.'); }
    finally { busy.current = false; if (alive.current) setLoading(false); }
  };
  const displayName = dashboard.snapshot?.profile?.fullName || user?.user_metadata?.full_name || '';
  return <PulseHomeView concept={concept} name={String(displayName).trim().split(/\s+/)[0] || undefined} stage={persona ? undefined : dashboard.snapshot?.journey.currentStage}
    persona={persona} personaChips={chips} personaInterest={personaInterest}
    projectName={persona || startup.loading || startup.error ? null : startup.model?.manual?.startupName} assignedStage={persona ? null : assignedStage} priorities={priorities} messages={messages}
    loading={loading || dashboard.isLoading || startup.loading} streaming={streaming} error={error}
    unavailable={!loading && !historyReady ? 'Conversation history is unavailable. Retry before continuing.' : undefined}
    contextNotice={startup.error || dashboard.error ? 'Some saved context is unavailable. Pulse will ask rather than guess.' : undefined}
    onSend={text => { void send(text); }} onNew={() => { void newConversation(); }} onRetry={() => {
      if (retryAction.current === 'new') void newConversation();
      else if (retryAction.current === 'send' && pending.current) void send(pending.current.text, true);
      else void restore();
    }} />;
}

export default function PulseHomeLive({ concept }: { concept: PulseHomeConcept }) {
  const { user, loading } = useAuth();
  if (loading) return <PulseHomeView concept={concept} loading />;
  if (!user) return <PulseHomeView concept={concept} unavailable="Sign in to talk to Pulse and load your saved priorities." />;
  return <DashboardDataProvider key={user.id}><LiveConversation key={user.id} concept={concept} /></DashboardDataProvider>;
}
