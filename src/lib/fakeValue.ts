/**
 * A claim that sounds like a reason to buy but is not one: how the product is
 * made, what every option already does, a feature that does not drive the
 * choice, the company's own values, or a promise nothing backs.
 *
 * Mirrors supabase/functions/_shared/fake-value.ts, which produces these flags
 * for GTM Strategist and Demo Studio. Edge code cannot import from src/, so the
 * type is restated here with the founder-facing labels.
 */
export interface FakeValueFlag {
  /** The exact wording that falls into the trap. */
  text: string;
  trap: 'process' | 'category_generic' | 'bolted_on_feature' | 'shared_values' | 'messaging_only';
  /** What to say or do instead. */
  fix: string;
}

export const FAKE_VALUE_TRAP_LABELS: Record<FakeValueFlag['trap'], string> = {
  process: 'Describes how it is made, not what they get',
  category_generic: 'Every option in the category already offers this',
  bolted_on_feature: 'A feature that does not decide the choice',
  shared_values: 'About your values, not what is in it for them',
  messaging_only: 'A claim nothing backs up yet',
};

/** Flags from a stored or model-returned value, keeping only well-formed rows. */
export function readFakeValueFlags(value: unknown): FakeValueFlag[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FakeValueFlag =>
    Boolean(item)
    && typeof item.text === 'string' && item.text.trim().length > 0
    && typeof item.fix === 'string' && item.fix.trim().length > 0
    && Object.prototype.hasOwnProperty.call(FAKE_VALUE_TRAP_LABELS, item.trap));
}
