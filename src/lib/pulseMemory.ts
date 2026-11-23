// Founder memory shapes shared by the Pulse endpoint and the app. Pulse only
// suggests; the founder saves to pulse_memories (RLS, own rows only).

export type MemoryKind = 'decision' | 'hypothesis' | 'commitment' | 'fact';
/**
 * What an entry is about, so a later entry on the same topic can replace it
 * (history kept) or, when a tool's result disagrees with the founder's own
 * call, be held for the founder to choose (pulse_memories reconcile trigger).
 * Pulse may tag a suggestion with one of these; tools record the rest.
 */
export const PULSE_MEMORY_TOPICS = ['target_customer', 'problem', 'positioning', 'offer', 'product_scope', 'channel', 'pricing', 'goal'] as const;
export type PulseMemoryTopic = typeof PULSE_MEMORY_TOPICS[number];
export interface MemorySuggestion { kind: MemoryKind; text: string; dueOn: string | null; topic?: PulseMemoryTopic | null }

/** Where an entry came from, as shown to the founder. */
export const MEMORY_SOURCE_LABEL: Record<string, string> = {
  pulse: 'Pulse', onboarding: 'Onboarding', founder: 'You',
  icp_builder: 'ICP Builder', pmf_lab: 'PMF Lab', demo_studio: 'Demo Studio',
  mvp_builder: 'MVP Builder', gtm_strategist: 'GTM Strategist', traction_engine: 'Traction Engine',
};
/** How far an entry is proven, as shown to the founder. */
export const MEMORY_EVIDENCE_LABEL: Record<string, string> = {
  assumption: 'Untested', founder_reported: 'Reported by you', verified: 'Measured',
};
export const MEMORY_TOPIC_LABEL: Record<string, string> = {
  idea: 'Idea', goal: 'Goal', blocker: 'Blocker', target_customer: 'Target customer', problem: 'Problem',
  positioning: 'Positioning', offer: 'Offer', product_scope: 'Product', channel: 'Channels', pricing: 'Pricing',
  pmf_finding: 'PMF finding', channel_result: 'Channel result',
};
export function memoryTopicLabel(topic: string | null | undefined): string | null {
  if (!topic) return null;
  const [base, subject] = topic.split(':');
  const label = MEMORY_TOPIC_LABEL[base] ?? null;
  return label && subject ? `${label}: ${subject}` : label;
}
export interface CommitmentCheck { id: string; text: string; dueOn: string | null }

export const MEMORY_KINDS: readonly MemoryKind[] = ['decision', 'hypothesis', 'commitment', 'fact'];
export const MEMORY_KIND_LABEL: Record<MemoryKind, string> = { decision: 'Decision', hypothesis: 'Hypothesis', commitment: 'Commitment', fact: 'Fact' };

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

/**
 * Validates suggestions (from the model, or from saved metadata): known kinds,
 * sane text, real dates only on commitments, at most two, no duplicates of
 * what is already saved.
 */
export function parseMemorySuggestions(raw: unknown, existingTexts: readonly string[] = []): MemorySuggestion[] {
  const list = Array.isArray(raw) ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { memories?: unknown }).memories) ? (raw as { memories: unknown[] }).memories : [];
  const seen = new Set(existingTexts.map(normalise));
  const result: MemorySuggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const { kind, text, dueOn, topic } = item as Record<string, unknown>;
    if (!MEMORY_KINDS.includes(kind as MemoryKind) || typeof text !== 'string') continue;
    const clean = text.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '').slice(0, 280);
    if (clean.length < 3 || seen.has(normalise(clean))) continue;
    seen.add(normalise(clean));
    result.push({
      kind: kind as MemoryKind, text: clean, dueOn: kind === 'commitment' && isDate(dueOn) ? dueOn : null,
      // Commitments are things to do, not positions a tool could contradict.
      topic: kind !== 'commitment' && PULSE_MEMORY_TOPICS.includes(topic as PulseMemoryTopic) ? topic as PulseMemoryTopic : null,
    });
    if (result.length === 2) break;
  }
  return result;
}

export function parseCommitmentCheck(raw: unknown): CommitmentCheck | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, text, dueOn } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !UUID.test(id) || typeof text !== 'string' || !text.trim()) return null;
  return { id, text: text.slice(0, 280), dueOn: isDate(dueOn) ? dueOn : null };
}
