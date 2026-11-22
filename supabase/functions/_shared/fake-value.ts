/**
 * Claims that sound like value but are not.
 *
 * Value is something the buyer wants and cannot easily get elsewhere. These
 * five kinds of claim fill positioning copy without being either: they describe
 * how the product is made, what every option already does, a feature that does
 * not drive the choice, the company's own values, or a promise nothing backs.
 * Shared by GTM Strategist (positioning) and Demo Studio (pitch and promise) so
 * both name the traps the same way and the founder sees one vocabulary.
 */

export type FakeValueTrap =
  | "process"
  | "category_generic"
  | "bolted_on_feature"
  | "shared_values"
  | "messaging_only";

export const FAKE_VALUE_TRAPS: readonly FakeValueTrap[] = [
  "process",
  "category_generic",
  "bolted_on_feature",
  "shared_values",
  "messaging_only",
] as const;

export interface FakeValueFlag {
  /** The exact wording that falls into the trap. */
  text: string;
  trap: FakeValueTrap;
  /** What to say or do instead. */
  fix: string;
}

/** Prompt lines describing each trap, for any generator that runs the check. */
export const FAKE_VALUE_TRAP_GUIDE = `  process: how it is made or delivered (for example "AI-powered", "proprietary method") instead of what the buyer gets;
  category_generic: what every option in the category already delivers (saves time, easy to use, affordable), which matters but does not decide the choice;
  bolted_on_feature: a single feature or quirk that does not drive why someone would choose this;
  shared_values: mission, purpose or company values instead of what is in it for the buyer;
  messaging_only: a claim the product does not deliver, or that nothing in the input supports.`;

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Drops malformed rows and repeats. Never invents a flag. */
export function normalizeFakeValueFlags(value: unknown): FakeValueFlag[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const flags: FakeValueFlag[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const text = clean(raw.text, 300);
    const fix = clean(raw.fix, 400);
    if (!text || !fix || !(FAKE_VALUE_TRAPS as readonly unknown[]).includes(raw.trap)) continue;
    const key = `${raw.trap}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flags.push({ text, trap: raw.trap as FakeValueTrap, fix });
    if (flags.length === 6) break;
  }
  return flags;
}

/**
 * A stretch idea for GTM: people outside the category who want what it gives
 * them in the abstract, and a channel the category does not use to reach them.
 * Kept only when every part is filled in; half an idea is not actionable.
 */
export interface BeyondCategoryIdea {
  abstractValue: string;
  audience: string;
  howToShowIt: string;
  channel: string;
}

export function normalizeBeyondCategory(value: unknown): BeyondCategoryIdea | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const idea = {
    abstractValue: clean(raw.abstractValue, 300),
    audience: clean(raw.audience, 300),
    howToShowIt: clean(raw.howToShowIt, 400),
    channel: clean(raw.channel, 200),
  };
  return Object.values(idea).every((part) => part.length > 0) ? idea : null;
}

/**
 * JSON.parse that forgives a trailing comma before } or ], the most common
 * slip in long model answers. Anything else still throws.
 */
export function parseLenientJson(content: string): Record<string, any> {
  try {
    return JSON.parse(content);
  } catch (error) {
    try {
      return JSON.parse(content.replace(/,(\s*[}\]])/g, "$1"));
    } catch {
      throw error;
    }
  }
}
