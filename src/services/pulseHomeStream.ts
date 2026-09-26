import { getSessionSafely } from '@/integrations/supabase/auth';
import { validateHomeActions, type PulseHomeAction } from '@/lib/pulseHome';

// Pulse Home uses the existing Pulse endpoint, with a durable turn identifier
// and explicit errors instead of silently treating partial streams as success.
export async function streamPulseHome(input: {
  sessionId: string; turnId: string; message: string; projectId: string | null;
  signal: AbortSignal; onText: (text: string) => void; onActions: (actions: PulseHomeAction[]) => void;
  onContext?: (unavailableSources: string[]) => void;
}) {
  const session = await getSessionSafely();
  if (!session) throw new Error('Please sign in again to continue.');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-streaming`, {
    method: 'POST', signal: input.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, 'Idempotency-Key': input.turnId },
    body: JSON.stringify({ surface: 'pulse_home', chatMode: 'pulse', sessionId: input.sessionId, turnId: input.turnId, message: input.message, projectId: input.projectId }),
  });
  if (!response.ok || !response.body) throw new Error(response.status === 401 ? 'Please sign in again to continue.' : response.status === 409 ? 'Your Pulse context changed. Refresh the page to continue in the correct conversation.' : 'Pulse could not load this conversation and its context. Your message is ready to retry.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let complete = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = done ? '' : lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        const event = JSON.parse(raw);
        if (event.type === 'error') throw new Error(event.error || 'Pulse was interrupted. Please retry.');
        if (event.type === 'delta' && typeof event.content === 'string') input.onText(event.content);
        if (event.type === 'recommendations') input.onActions(validateHomeActions(event.actions));
        if (event.type === 'context' && Array.isArray(event.unavailableSources)) input.onContext?.(event.unavailableSources.filter((value: unknown): value is string => typeof value === 'string'));
        if (event.type === 'complete') complete = true;
      }
      if (done) break;
    }
    if (!complete) throw new Error('The response was interrupted. Retry to finish this message.');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
