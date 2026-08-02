import { captureEvent } from "@/lib/analytics";
import { getSafeSessionStorage } from "@/lib/safeStorage";
import type { HeroMode, HeroRoute, SignupPromptTrigger } from "@/lib/heroFunnelRules";

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
 * Canonical events are also kept in a small session outbox by analytics.ts, so
 * the deferred SDK does not lose a fast bounce.
 */

export {
  containsUrl,
  classifyHeroInput,
  resolveOutputErrorType,
  type HeroRoute,
  type SignupPromptTrigger,
} from "@/lib/heroFunnelRules";

const OUTPUT_MARKER_KEY = "ct_hero_first_output_v1";
const DEEP_OUTPUT_MARKER_KEY = "ct_hero_deep_output_v1";
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
  captureEvent("hero_input_focused", { source: "homepage_hero" });
}

export function trackHeroInputSubmitted(properties: {
  char_count: number;
  has_url: boolean;
  routed_to: HeroRoute;
  source: string;
  mode: HeroMode;
}) {
  captureEvent("hero_input_submitted", properties);
}

/** True once the visitor has generated anything in this session. */
export function hasGeneratedOutputThisSession(): boolean {
  return readMarker(OUTPUT_MARKER_KEY);
}

/**
 * The north star. Fires on completion of a *rendered* output, never on request
 * start, and once per artifact/run. The separate session marker still answers
 * the coarser question of whether this visitor has seen any output.
 */
type OutputEventProperties = {
  route: HeroRoute;
  tool: "icp_builder" | "demo_studio";
  source: string;
  generation_run_id: string;
  anonymous_artifact_id: string;
  latency_ms: number;
  is_anonymous: boolean;
};

export function trackFirstOutputGenerated(properties: OutputEventProperties) {
  const artifactMarker = `${OUTPUT_MARKER_KEY}:${properties.anonymous_artifact_id}`;
  if (readMarker(artifactMarker)) return;
  writeMarker(artifactMarker);
  writeMarker(OUTPUT_MARKER_KEY);
  captureEvent("first_output_generated", properties);
}

export function trackDeepOutputGenerated(properties: OutputEventProperties) {
  const artifactMarker = `${DEEP_OUTPUT_MARKER_KEY}:${properties.anonymous_artifact_id}`;
  if (readMarker(artifactMarker)) return;
  writeMarker(artifactMarker);
  captureEvent("deep_output_generated", properties);
}

export function trackOutputGenerationFailed(properties: {
  route: HeroRoute;
  source: string;
  generation_run_id: string;
  anonymous_artifact_id?: string;
  failure_stage: "compact" | "deep" | "demo";
  error_type: string;
}) {
  captureEvent("output_generation_failed", properties);
}

export function trackSignupPromptShown(properties: {
  trigger: SignupPromptTrigger;
  has_output: boolean;
  route: HeroRoute;
  source: string;
  anonymous_artifact_id: string;
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
