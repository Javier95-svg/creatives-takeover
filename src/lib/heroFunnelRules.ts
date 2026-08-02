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
 * Everyone routes to ICP.
 *
 * The original spec sent URL-havers to Demo Studio, but that generator needs
 * screenshots - given text or a URL alone it returns a generic 3-step
 * placeholder storyboard, a markedly weaker first output than the ICP draft.
 * Routing our highest-intent visitors into filler would waste them. The URL is
 * still recorded on the event so we can size the demo opportunity later, and
 * the demo path is offered as a cross-link once the output has landed.
 */
export function classifyHeroInput(text: string): { route: HeroRoute; hasUrl: boolean } {
  return { route: "icp", hasUrl: containsUrl(text) };
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
