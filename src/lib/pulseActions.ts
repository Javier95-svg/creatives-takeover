/**
 * Actions Pulse proposes and the founder confirms with one tap. Pulse never
 * writes: the chip under the answer does, as the signed-in user, under RLS.
 * Validation is shared with the edge function, so keep this module import-light.
 */

export interface TaskSuggestion {
  /** A short imperative sentence the founder could put on a task list. */
  title: string;
  dueOn: string | null;
}

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

/** Validates proposed tasks from the model or saved metadata: sane titles, real dates, no duplicates, at most two. */
export function parseTaskSuggestions(raw: unknown, limit = 2): TaskSuggestion[] {
  const list = Array.isArray(raw) ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks) ? (raw as { tasks: unknown[] }).tasks : [];
  const seen = new Set<string>();
  const result: TaskSuggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const { title, dueOn } = item as Record<string, unknown>;
    if (typeof title !== 'string') continue;
    const clean = title.replace(/\s+/g, ' ').replace(/^["'\s]+|["'.\s]+$/g, '').slice(0, 140);
    if (clean.length < 3 || seen.has(normalise(clean))) continue;
    seen.add(normalise(clean));
    result.push({ title: clean, dueOn: isDate(dueOn) ? dueOn : null });
    if (result.length === limit) break;
  }
  return result;
}
