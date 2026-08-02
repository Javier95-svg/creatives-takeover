/**
 * Pure classification rules for the homepage activation funnel.
 *
 * Deliberately dependency-free: heroFunnel.ts pulls in analytics.ts (and
 * therefore Vite's import.meta.env), which node:test cannot load. Keeping the
 * logic that is actually worth testing in here keeps it testable, matching how
 * icpUnlockFlow.ts is structured.
 */

export type HeroRoute = "icp" | "demo";
export type SignupPromptTrigger = "post_output" | "second_action" | "rate_limit";

/**
 * The two things a visitor can arrive wanting, and the tool that serves each.
 *
 * This replaces guessing from the text. The earlier build inferred the route by
 * looking for a URL, which meant the product silently decided for the visitor
 * and could be wrong. An explicit toggle costs one glance and is never wrong -
 * and unlike the old "Still an idea? / Have a product?" CTA pair it does not
 * make them choose before they can see the field.
 */
export interface HeroModeConfig {
  /** Which tool the submission is routed to. */
  route: HeroRoute;
  /** Toggle label. */
  label: string;
  /** The question above the field. */
  question: string;
  /** Submit button label. */
  cta: string;
  /**
   * Cycled by the typing animation. Five each, so the field does not loop back
   * to the same example while someone is still deciding what to write, and so
   * the examples themselves teach how specific an answer is worth giving.
   */
  placeholders: readonly string[];
}

export const HERO_MODES = {
  idea: {
    route: "icp",
    label: "Idea",
    // Curly apostrophe, matching "The Founders' Compass" directly above it.
    question: "Who’s your ideal customer?",
    cta: "Define ICP",
    placeholders: [
      "freelance designers who lose track of client revisions",
      "small law firms still booking consultations by phone",
      "indie game studios with no publisher and no marketing budget",
      "boutique fitness studios whose members quietly stop showing up",
      "small importers buried in customs paperwork",
    ],
  },
  product: {
    route: "demo",
    label: "Product",
    question: "What are you building?",
    cta: "Launch a live demo",
    placeholders: [
      "a scheduling tool for independent hairdressers",
      "an invoicing app for freelance photographers",
      "a CRM for mobile car detailers",
      "a booking app for mobile dog groomers",
      "an expense tracker for small construction crews",
    ],
  },
} as const satisfies Record<string, HeroModeConfig>;

export type HeroMode = keyof typeof HERO_MODES;

/** Idea is the default: it is the only path that delivers an output in the hero. */
export const DEFAULT_HERO_MODE: HeroMode = "idea";

// Matches a full URL or a bare domain like acme.io, but not a sentence that
// merely contains a dot. Requires a TLD of 2+ letters and a label immediately
// before it, so "It solves scheduling. Then invoicing." is not read as a domain.
const URL_PATTERN = /(https?:\/\/|www\.)\S+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.[a-z]{2,}(?:\/\S*)?\b/i;

// Suffixes that look like a TLD but are almost always a technology name in this
// context - founders routinely describe building "a tool for Node.js teams" or
// "a Next.js starter". Only applied to the bare-domain branch; an explicit
// https:// or www. prefix is always a URL.
const TECH_SUFFIX_PATTERN = /\.(js|ts|jsx|tsx|py|rb|go|rs|sh|json|md|css|html|sql|env)$/i;

/** True when the founder pasted a link or a bare domain rather than a sentence. */
export function containsUrl(text: string): boolean {
  const trimmed = text.trim();
  const match = URL_PATTERN.exec(trimmed);
  if (!match) return false;
  const matched = match[0];
  if (/^(https?:\/\/|www\.)/i.test(matched)) return true;
  return !TECH_SUFFIX_PATTERN.test(matched);
}

/**
 * Resolves what a submission does, from the mode the visitor picked.
 *
 * `hasUrl` is still recorded on the event - it tells us how many people arrive
 * with something already live, which is the demand signal for Demo Studio - but
 * it no longer decides the route. The visitor does.
 */
export function classifyHeroInput(text: string, mode: HeroMode): { route: HeroRoute; hasUrl: boolean } {
  return { route: HERO_MODES[mode].route, hasUrl: containsUrl(text) };
}

/**
 * Collapses a generation failure into a small, queryable set. Free-text error
 * messages are high-cardinality and would make the funnel unreadable.
 */
export function resolveOutputErrorType(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as { errorCode?: unknown }).errorCode;
    if (typeof code === "string" && code.trim()) return code;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/abort|timeout|timed out/i.test(message)) return "TIMEOUT";
  if (/network|fetch|failed to fetch/i.test(message)) return "NETWORK";
  if (/rate.?limit|429/i.test(message)) return "RATE_LIMITED";
  return "UNKNOWN";
}
