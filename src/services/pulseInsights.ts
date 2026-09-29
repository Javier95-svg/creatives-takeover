import { getSessionSafely } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { parsePulseInsights, type PulseInsight } from '@/lib/pulseInsights';

const EVIDENCE_KEYS = ['icp', 'pmf', 'mvp', 'gtm', 'demo', 'traction', 'memory', 'tasks'];

/** Today's "Pulse noticed" set for the project; generated server-side at most once a day. */
export async function fetchPulseInsights(projectId: string | null, signal?: AbortSignal): Promise<{ rowId: string | null; insights: PulseInsight[] }> {
  const session = await getSessionSafely();
  if (!session) return { rowId: null, insights: [] };
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-streaming`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ surface: 'pulse_insights', chatMode: 'pulse', projectId }),
  });
  if (!response.ok) return { rowId: null, insights: [] };
  const body = await response.json().catch(() => null) as { rowId?: unknown; insights?: unknown } | null;
  return {
    rowId: typeof body?.rowId === 'string' ? body.rowId : null,
    // Re-validated here too: anything malformed is simply not shown.
    insights: parsePulseInsights(body?.insights, EVIDENCE_KEYS),
  };
}

/** Hides one insight for the rest of the day (only the dismissed column is writable). */
export async function dismissPulseInsight(rowId: string, dismissed: string[]) {
  await (supabase as any).from('pulse_insights').update({ dismissed }).eq('id', rowId);
}
