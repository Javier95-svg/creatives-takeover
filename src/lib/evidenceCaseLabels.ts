/**
 * Names for PMF Lab evidence cases, as founders see them in the idea picker.
 *
 * Cases opened without a customer profile used to be stored as "Unscoped
 * evidence case", which reads as internal jargon and makes every such case
 * look the same. Those, and cases with no label, are shown by the day they
 * started instead, and any names that still collide get a number.
 *
 * Pure so node:test can load it.
 */

export const LEGACY_UNSCOPED_LABEL = 'Unscoped evidence case';

export interface NamedCase {
  id: string;
  label: string | null;
  created_at: string;
}

function startedLabel(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Untitled idea';
  return `Idea started ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

/** Display name per case id, unique within the list (oldest keeps the plain name). */
export function evidenceCaseLabels(cases: readonly NamedCase[]): Map<string, string> {
  const base = (item: NamedCase) => {
    const label = item.label?.trim();
    return label && label !== LEGACY_UNSCOPED_LABEL ? label : startedLabel(item.created_at);
  };
  const oldestFirst = [...cases].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const seen = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const item of oldestFirst) {
    const name = base(item);
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    labels.set(item.id, count === 1 ? name : `${name} (${count})`);
  }
  return labels;
}
