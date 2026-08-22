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
    /*
     * Asks for the idea, not the customer.
     *
     * "Who's your ideal customer?" demanded the output as the price of the
     * input: someone who does not know what to do next does not know who their
     * ideal customer is - that is the thing they came here to find out. The
     * generator derives the customer from the idea, so the question was also
     * asking for more than the machine behind it needs.
     *
     * "What's your idea?" rather than product mode's "What are you building?" -
     * the two must stay distinguishable, and someone who has not built anything
     * yet is more comfortable saying "my idea" than "what I'm building".
     *
     * Curly apostrophe, matching "The Founders' Compass" directly above it.
     */
    question: "What’s your idea?",
    // Plain language, not an acronym: "Define ICP" gated the highest-intent
    // moment in the funnel behind a term a first-time founder has no reason to
    // know. This names the question they actually arrive with - whether the
    // idea is worth pursuing at all.
    cta: "Assess viability",
    /*
     * Deliberately looser in register than product mode's crisp "a CRM for
     * mobile car detailers". The previous set were well-specified customer
     * segments, which taught the visitor that this level of precision was the
     * price of entry - the opposite of the truth. "something that..." and "a
     * way to..." teach that a rough sentence is enough, which is the actual bar
     * the generator needs.
     */
    placeholders: [
      "an app that helps barbers stop losing no-shows",
      "something that helps freelance designers handle client revisions",
      "a simpler way for small law firms to book consultations",
      "a way to track expenses for a small construction crew",
      "something that nudges gym members who stopped showing up",
    ],
  },
  product: {
    route: "demo",
    label: "Product",
    question: "What are you building?",
    /*
     * Not "Launch a live demo" any more. The demo needs the founder's real
     * screenshots and URL to be a demo rather than captions over invented
     * frames, so the visitor now lands on a short form instead of watching
     * something generate immediately. A CTA that promises a live demo and
     * delivers a form is the kind of small lie that costs the next click.
     */
    cta: "Build my demo",
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

export type HeroRunState =
  | "idle"
  | "compact_generating"
  | "compact_ready"
  | "deep_generating"
  | "deep_ready"
  | "partial_failure"
  | "failed";

export interface HeroArtifactStateInput {
  hasCompact: boolean;
  hasDeep: boolean;
  generationStatus?: string | null;
  timedOut?: boolean;
}

/**
 * One terminal-state resolver shared by initial generation, polling, resume,
 * and retry. Keeping this pure makes the two independent generation branches
 * impossible to accidentally collapse back into one boolean loading flag.
 */
export function resolveHeroArtifactState({
  hasCompact,
  hasDeep,
  generationStatus,
  timedOut = false,
}: HeroArtifactStateInput): HeroRunState {
  if (hasDeep) return "deep_ready";
  if (timedOut || generationStatus === "deep_failed" || generationStatus === "failed") {
    return hasCompact ? "partial_failure" : "failed";
  }
  if (hasCompact) {
    return generationStatus === "compact_ready" ? "compact_ready" : "deep_generating";
  }
  return "compact_generating";
}

/**
 * Carries the founder's sentence to the demo builder without starting a run.
 *
 * `autostart=1` is gone. Generating on arrival was only possible because the
 * page would accept a description alone, and that path produces generated
 * placeholder frames - AI captions over invented UI, which is what made the
 * output read as a slide deck rather than a demo. The builder now needs the
 * product URL and real screenshots, so the seed prefills the form and the
 * founder completes it.
 */
export function buildHeroProductPath(seed: string): string {
  return `/demo-studio/try?seed=${encodeURIComponent(seed.trim())}&source=hero-product`;
}

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
