// Founder memory shapes shared by the Pulse endpoint and the app. Pulse only
// suggests; the founder saves to pulse_memories (RLS, own rows only).

export type MemoryKind = 'decision' | 'hypothesis' | 'commitment' | 'fact';
export interface MemorySuggestion { kind: MemoryKind; text: string; dueOn: string | null }
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
    const { kind, text, dueOn } = item as Record<string, unknown>;
    if (!MEMORY_KINDS.includes(kind as MemoryKind) || typeof text !== 'string') continue;
    const clean = text.replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '').slice(0, 280);
    if (clean.length < 3 || seen.has(normalise(clean))) continue;
    seen.add(normalise(clean));
    result.push({ kind: kind as MemoryKind, text: clean, dueOn: kind === 'commitment' && isDate(dueOn) ? dueOn : null });
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
