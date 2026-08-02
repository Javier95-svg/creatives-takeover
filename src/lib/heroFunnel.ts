import { captureEvent } from "@/lib/analytics";
import { getSafeSessionStorage } from "@/lib/safeStorage";
import type { HeroRoute, SignupPromptTrigger } from "@/lib/heroFunnelRules";

/**
 * The canonical homepage activation funnel.
 *
 * This replaces per-CTA click tracking across eight hero trigger ids with one
 * funnel: focused -> submitted -> output -> signup prompt -> signup. The north
 * star is `first_output_generated`, which was 0-1 people per week in the 8
 * weeks to 2026-08-01 against ~100 landers a week.
 *
 * `icp_builder_*` events are deliberately left untouched so before/after stays
 * comparable.
 *
 * Note on measurement: PostHog init is deferred ~3s and queues events in memory
 * until it loads, so a visitor who bounces before the flush loses their events
 * entirely. `hero_input_focused` in particular will under-count. That is a known
 * floor on these numbers, and is preferable to un-deferring init and paying for
 * it in LCP.
 */

export {
  containsUrl,
  classifyHeroInput,
  resolveOutputErrorType,
  type HeroRoute,
  type SignupPromptTrigger,
} from "@/lib/heroFunnelRules";

const OUTPUT_MARKER_KEY = "ct_hero_first_output_v1";
const FOCUS_MARKER_KEY = "ct_hero_input_focused_v1";
const PROMPT_DISMISSED_KEY = "ct_hero_signup_prompt_dismissed_v1";

function readMarker(key: string): boolean {
  return getSafeSessionStorage().getItem(key) === "1";
}

function writeMarker(key: string) {
  getSafeSessionStorage().setItem(key, "1");
}

/** Fires at most once per session, on the first focus of the hero field. */
export function trackHeroInputFocused() {
  if (readMarker(FOCUS_MARKER_KEY)) return;
  writeMarker(FOCUS_MARKER_KEY);
  captureEvent("hero_input_focused");
}

export function trackHeroInputSubmitted(properties: {
  char_count: number;
  has_url: boolean;
  routed_to: HeroRoute;
}) {
  captureEvent("hero_input_submitted", properties);
}

/** True once the visitor has generated anything in this session. */
export function hasGeneratedOutputThisSession(): boolean {
  return readMarker(OUTPUT_MARKER_KEY);
}

/**
 * The north star. Fires on completion of a *rendered* output, never on request
 * start, and at most once per person per session - a visitor who regenerates
 * three times is still one activation.
 */
export function trackFirstOutputGenerated(properties: {
  route: HeroRoute;
  latency_ms: number;
  is_anonymous: boolean;
}) {
  if (hasGeneratedOutputThisSession()) return;
  writeMarker(OUTPUT_MARKER_KEY);
  captureEvent("first_output_generated", properties);
}

export function trackOutputGenerationFailed(properties: { route: HeroRoute; error_type: string }) {
  captureEvent("output_generation_failed", properties);
}

export function trackSignupPromptShown(properties: {
  trigger: SignupPromptTrigger;
  has_output: boolean;
}) {
  captureEvent("signup_prompt_shown", properties);
}

/** Dismissing the signup prompt must not re-prompt for the rest of the session. */
export function markSignupPromptDismissed() {
  writeMarker(PROMPT_DISMISSED_KEY);
}

export function wasSignupPromptDismissed(): boolean {
  return readMarker(PROMPT_DISMISSED_KEY);
}
