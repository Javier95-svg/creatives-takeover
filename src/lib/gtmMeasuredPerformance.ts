// Measured channel performance from Traction Engine experiment logs, keyed by
// channel name. Lets the GTM brief show "predicted fit vs. measured traction"
// next to each recommended channel — the loop that makes the brief empirical
// instead of a one-shot LLM document.
import { supabase } from '@/integrations/supabase/client';

export interface MeasuredChannelPerformance {
  weeksLogged: number;
  passes: number;
  avgEfficiency: number;
  lastDecision: 'double_down' | 'iterate' | 'kill' | null;
}

export type MeasuredPerformanceMap = Map<string, MeasuredChannelPerformance>;

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Look up a channel's measured stats. Exact (normalized) match first, then a
 * containment fallback so "LinkedIn Direct Outreach" still matches a sprint the
 * founder renamed to "LinkedIn outreach".
 */
export function findMeasuredPerformance(
  map: MeasuredPerformanceMap,
  channelName: string,
): MeasuredChannelPerformance | null {
  const key = normalize(channelName);
  const exact = map.get(key);
  if (exact) return exact;
  for (const [candidate, stats] of map) {
    if (candidate.includes(key) || key.includes(candidate)) return stats;
  }
  return null;
}

export async function fetchMeasuredChannelPerformance(userId: string): Promise<MeasuredPerformanceMap> {
  const map: MeasuredPerformanceMap = new Map();
  const { data, error } = await supabase
    .from('traction_engine_experiments' as never)
    .select('channel, pass, efficiency_score, decision, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(400);
  if (error || !data) return map;

  for (const row of data as Array<{
    channel: string | null;
    pass: boolean | null;
    efficiency_score: number | null;
    decision: string | null;
  }>) {
    if (!row.channel?.trim()) continue;
    const key = normalize(row.channel);
    const current = map.get(key) ?? { weeksLogged: 0, passes: 0, efficiencyTotal: 0 };
    current.weeksLogged += 1;
    if (row.pass) current.passes += 1;
    current.efficiencyTotal += Number(row.efficiency_score ?? 0);
    // Rows arrive oldest-first, so the last write wins as the latest decision.
    (current as { lastDecision?: string | null }).lastDecision =
      row.decision === 'double_down' || row.decision === 'iterate' || row.decision === 'kill' ? row.decision : null;
    map.set(key, current as never);
  }

  // Finalize averages into the public shape.
  for (const [key, value] of map) {
    const raw = value as unknown as { weeksLogged: number; passes: number; efficiencyTotal: number; lastDecision?: MeasuredChannelPerformance['lastDecision'] };
    map.set(key, {
      weeksLogged: raw.weeksLogged,
      passes: raw.passes,
      avgEfficiency: raw.weeksLogged > 0 ? Math.round(raw.efficiencyTotal / raw.weeksLogged) : 0,
      lastDecision: raw.lastDecision ?? null,
    });
  }
  return map;
}
