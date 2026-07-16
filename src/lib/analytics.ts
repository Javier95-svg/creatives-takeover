import posthog from 'posthog-js';
import * as amplitude from '@amplitude/analytics-browser';
import { getSafeSessionStorage, getSafeLocalStorage } from '@/lib/safeStorage';
import { logWarn } from '@/lib/logger';

type AnalyticsProperties = Record<string, unknown>;
type PostHogWithLoaded = typeof posthog & { __loaded?: boolean };
type StoredAuthMethod = 'google' | 'linkedin' | 'email' | 'github' | 'x';
export type ActivationCompletedTrigger =
  | 'icp_completed'
  | 'mentor_saved'
  | 'mentor_intro_sent'
  | 'first_message_sent'
  | 'first_artifact_created'
  | 'icp_seed_prefilled'
  | 'first_workspace_created';
export type PlanId = 'ROOKIE' | 'STARTER' | 'RISING' | 'PRO';
export type UpgradeLocation =
  | 'pricing_page'
  | 'dashboard_banner'
  | 'feature_gate'
  | 'onboarding'
  | 'upgrade_trigger_banner'
  | 'post_icp_nudge'
  | 'dashboard_nudge';
export type UpgradePromptTrigger = 'soft_gate_banner' | 'hard_gate_modal' | 'post_icp_nudge' | 'dashboard_nudge';
export type IcpBuilderOpenedSource = 'dashboard' | 'onboarding' | 'direct' | 'seed_redirect';
export type OnboardingStartedSource = 'signup_redirect' | 'dashboard_prompt' | 'direct';
export type ActivationFunnelEvent =
  | 'dashboard_viewed'
  | 'first_action_opened'
  | 'first_input_submitted'
  | 'first_output_generated'
  | 'first_artifact_saved'
  | 'activation_completed'
  | 'activation_returned_day_2'
  | 'activation_returned_day_7'
  | 'bizmap_ai_opened'
  | 'insighta_test_context_started'
  | 'insighta_test_result_shown'
  | 'pitch_deck_partial_result_shown';
export interface ActivationFunnelProps extends AnalyticsProperties {
  user_id?: string | null;
  activation_intent?: string | null;
  selected_path?: string | null;
  source?: string | null;
  tool?: string | null;
  plan?: string | null;
  days_since_signup?: number | null;
}

export type SignupMethod = 'email' | 'google' | 'github' | 'linkedin' | 'x';
export interface SignupCompletedProps { method: SignupMethod; referrer: string | null; }
export interface OnboardingCompletedProps {
  quiz_completed: boolean;
  creative_niche: string | null;
  business_stage: string | null;
  // Comparison plan fields — present from quiz_version v4 onward.
  quiz_version?: number;
  total_steps?: number;
  total_time_ms?: number;
  assigned_stage?: number;
  stage_confidence?: number;
  pain_point?: string;
  activation_intent?: string;
}
export interface FirstToolUsedProps { tool_name: string; credits_cost: number; credits_remaining: number; days_since_signup: number; }
export interface ICPBuilderCompletedProps { mode: 'fast' | 'guided'; time_to_complete_seconds: number; credits_used: number; }
export interface CreditExhaustedProps { plan: string; days_since_signup: number; last_feature_used: string; }
export interface UpgradePromptShownProps { trigger: UpgradePromptTrigger; credits_remaining: number; current_plan: string; target_plan: string; }

const PH_KEY =
  import.meta.env.VITE_POSTHOG_API_KEY ??
  import.meta.env.VITE_POSTHOG_KEY ??
  'phc_KcKa7xY35m7VqBgjuIAW42UTTalocKV8RLgzI0JZpub';
const PH_HOST =
  import.meta.env.VITE_POSTHOG_API_HOST ??
  import.meta.env.VITE_POSTHOG_HOST ??
  'https://us.i.posthog.com';
const AMPLITUDE_API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY ?? '';

// Internal/test accounts whose activity must not pollute product metrics. The admin
// account is always included; VITE_INTERNAL_EMAILS (comma-separated) can add more.
const INTERNAL_EMAILS = new Set<string>(
  (import.meta.env.VITE_INTERNAL_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
INTERNAL_EMAILS.add('admin@creatives-takeover.com');

const FIRST_TOUCH_UTM_KEY = 'ct_posthog_first_touch_utms';
const AUTH_METHOD_STORAGE_KEY = 'ct_auth_method';
const SIGNUP_INTENT_STORAGE_KEY = 'ct_signup_intent';
// Honor a stored signup intent for this long. Covers the OAuth round-trip and the
// immediate auto-sign-in after email signup; stale markers (e.g. a much later login)
// are ignored so we never mislabel a returning login as a fresh signup.
const SIGNUP_INTENT_MAX_AGE_MS = 30 * 60 * 1000;

let posthogClient: typeof posthog | null = null;
let initPromise: Promise<void> | null = null;
let initialized = false;
let amplitudeInitialized = false;
// When true, all capture() calls are dropped so internal/admin activity never
// enters the event stream. Set from AuthContext once the signed-in email is known.
let internalUser = false;
const queuedEvents: Array<{ eventName: string; properties?: AnalyticsProperties }> = [];
const queuedIdentifies: Array<{ id: string; properties?: AnalyticsProperties }> = [];

const PII_PROPERTY_KEYS = new Set([
  'email',
  'full_name',
  'fullName',
  'name',
  'first_name',
  'last_name',
  'username',
  'avatar_url',
  'avatarUrl',
  'ip',
  'ip_address',
  'linkedin_url',
  'github_url',
  'twitter_url',
  'instagram_url',
  'facebook_url',
  'youtube_url',
  'website_url',
]);

const sanitizeAnalyticsProperties = (properties?: AnalyticsProperties): AnalyticsProperties => {
  if (!properties) return {};

  return Object.entries(properties).reduce<AnalyticsProperties>((safe, [key, value]) => {
    if (PII_PROPERTY_KEYS.has(key) || typeof value === 'undefined') {
      return safe;
    }

    safe[key === 'userId' ? 'user_id' : key] = value;
    return safe;
  }, {});
};

export const initAmplitudeWithUser = (userId: string) => {
  if (typeof window === 'undefined' || !AMPLITUDE_API_KEY) return;
  try {
    amplitude.init(AMPLITUDE_API_KEY, userId, { defaultTracking: { pageViews: false, sessions: true } });
    amplitudeInitialized = true;
  } catch (error) {
    logWarn('Amplitude init failed', error);
  }
};

export const resetAmplitude = () => {
  if (!amplitudeInitialized) return;
  try {
    amplitude.reset();
    amplitudeInitialized = false;
  } catch (error) {
    logWarn('Amplitude reset failed', error);
  }
};

const captureAmplitudeEvent = (eventName: string, properties?: AnalyticsProperties) => {
  if (!amplitudeInitialized) return;

  try {
    amplitude.track(eventName, sanitizeAnalyticsProperties(properties));
  } catch (error) {
    logWarn('Amplitude capture failed', error);
  }
};

const identifyAmplitudeUser = (id: string, properties?: AnalyticsProperties) => {
  if (!amplitudeInitialized) return;

  try {
    amplitude.setUserId(id);
    const sanitized = sanitizeAnalyticsProperties(properties);
    if (Object.keys(sanitized).length > 0) {
      const identifyEvent = new amplitude.Identify();
      Object.entries(sanitized).forEach(([key, value]) => {
        identifyEvent.set(key, value as string | number | boolean | string[] | number[] | boolean[] | null);
      });
      amplitude.identify(identifyEvent);
    }
  } catch (error) {
    logWarn('Amplitude identify failed', error);
  }
};

const isPosthogReady = (client: typeof posthog | null): client is typeof posthog =>
  typeof window !== 'undefined' && Boolean((client as PostHogWithLoaded | null)?.__loaded);

const flushQueue = () => {
  if (!isPosthogReady(posthogClient)) {
    return;
  }

  queuedIdentifies.splice(0).forEach(({ id, properties }) => {
    posthogClient.identify(id, sanitizeAnalyticsProperties(properties));
  });

  queuedEvents.splice(0).forEach(({ eventName, properties }) => {
    posthogClient.capture(eventName, sanitizeAnalyticsProperties(properties));
  });
};

const getFirstTouchUtms = (): AnalyticsProperties => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(FIRST_TOUCH_UTM_KEY);
    if (stored) {
      return JSON.parse(stored) as AnalyticsProperties;
    }
  } catch (error) {
    logWarn('Failed to read stored PostHog UTMs', error);
  }

  const params = new URLSearchParams(window.location.search);
  const firstTouchUtms = {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
  };

  const hasAnyUtm = Object.values(firstTouchUtms).some(Boolean);
  if (!hasAnyUtm) {
    return {};
  }

  try {
    window.localStorage.setItem(FIRST_TOUCH_UTM_KEY, JSON.stringify(firstTouchUtms));
  } catch (error) {
    logWarn('Failed to persist first-touch UTMs', error);
  }

  return firstTouchUtms;
};

const registerFirstTouchUtms = () => {
  if (!isPosthogReady(posthogClient)) {
    return;
  }

  const utmProperties = getFirstTouchUtms();
  if (Object.keys(utmProperties).length === 0) {
    return;
  }

  try {
    posthogClient.register(utmProperties);
  } catch (error) {
    logWarn('PostHog UTM registration failed', error);
  }
};

export const initPosthog = () => {
  if (typeof window === 'undefined' || !PH_KEY) {
    return Promise.resolve();
  }

  if (initialized) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await new Promise<void>((resolve) => {
        posthog.init(PH_KEY as string, {
          api_host: PH_HOST,
          autocapture: true,
          // SPA route changes must emit $pageview; the legacy default only fires
          // on full page loads, which made every <Link> navigation invisible.
          capture_pageview: 'history_change',
          persistence: 'localStorage',
          loaded: (client) => {
            posthogClient = client as typeof posthog;
            registerFirstTouchUtms();
            initialized = true;
            flushQueue();
            resolve();
          },
        });

        posthogClient = posthog;
        if (isPosthogReady(posthogClient)) {
          registerFirstTouchUtms();
          initialized = true;
          flushQueue();
          resolve();
        }
      });
    } catch (error) {
      logWarn('PostHog init failed', error);
    }
  })();

  return initPromise;
};

export const getPosthogClient = () => posthog;

export const bootstrapPosthog = () => {
  const start = () => {
    void initPosthog();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start);
    return;
  }

  setTimeout(start, 1500);
};

/** True when `email` belongs to an internal/test account excluded from analytics. */
export const isInternalEmail = (email?: string | null): boolean =>
  !!email && INTERNAL_EMAILS.has(email.trim().toLowerCase());

/**
 * Flag the current visitor as internal (admin/test). While set, captureEvent is a
 * no-op for both PostHog and Amplitude, and identify tags the person `is_internal`
 * so PostHog's "filter internal and test users" setting can also exclude autocapture.
 */
export const setInternalUser = (value: boolean) => {
  internalUser = value;
};

export const isInternalUser = () => internalUser;

export const captureEvent = (eventName: string, properties?: AnalyticsProperties) => {
  // Drop all events from internal/admin accounts so they never pollute metrics.
  if (internalUser) {
    return;
  }

  const safeProperties = sanitizeAnalyticsProperties(properties);
  captureAmplitudeEvent(eventName, safeProperties);

  if (isPosthogReady(posthogClient)) {
    try {
      posthogClient.capture(eventName, safeProperties);
      return;
    } catch (error) {
      logWarn('PostHog capture failed', error);
      return;
    }
  }

  queuedEvents.push({ eventName, properties: safeProperties });
  void initPosthog();
};

export const identify = (id: string, properties?: AnalyticsProperties) => {
  const safeProperties = sanitizeAnalyticsProperties(properties);
  // Tag internal accounts on the person record so PostHog-side internal-user
  // filtering (which also covers autocapture) can exclude them.
  if (internalUser) {
    safeProperties.is_internal = true;
  }
  identifyAmplitudeUser(id, safeProperties);

  if (isPosthogReady(posthogClient)) {
    try {
      posthogClient.identify(id, safeProperties);
      return;
    } catch (error) {
      logWarn('PostHog identify failed', error);
      return;
    }
  }

  queuedIdentifies.push({ id, properties: safeProperties });
  void initPosthog();
};

export const captureAuthenticatedEvent = (
  eventName: string,
  userId: string | null | undefined,
  properties?: AnalyticsProperties,
  identifyProperties?: AnalyticsProperties,
) => {
  if (userId) {
    identify(userId, identifyProperties);
  }

  captureEvent(eventName, {
    ...properties,
    ...(userId ? { user_id: userId } : {}),
  });
};

export const trackLandingViewed = ({ page, exit_intent }: { page: string; exit_intent?: boolean }) =>
  captureEvent('landing_viewed', {
    page,
    ...(typeof exit_intent === 'boolean' ? { exit_intent } : {}),
  });

export const trackSeoLandingView = (properties: {
  path: string;
  referrer: string | null;
}) => captureEvent('seo_landing_view', properties);

export const trackSeoCtaClick = (properties: {
  source_path: string;
  destination: string;
  link_text?: string;
}) => captureEvent('seo_cta_click', properties);

export const trackSoftGateShown = ({ trigger }: { trigger: string }) =>
  captureEvent('soft_gate_shown', { trigger });

export const trackSignupStarted = ({ method }: { method: StoredAuthMethod }) =>
  captureEvent('signup_started', { method });

export const trackSignupCompleted = (properties: SignupCompletedProps) =>
  captureEvent('signup_completed', properties);

export const persistAuthMethod = (method: StoredAuthMethod) => {
  if (typeof window === 'undefined') {
    return;
  }

  getSafeSessionStorage().setItem(AUTH_METHOD_STORAGE_KEY, method);
};

export const readAuthMethod = (): StoredAuthMethod | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = getSafeSessionStorage();
  const method = storage.getItem(AUTH_METHOD_STORAGE_KEY);
  storage.removeItem(AUTH_METHOD_STORAGE_KEY);

  return method === 'google' || method === 'linkedin' || method === 'email' || method === 'github' || method === 'x' ? method : null;
};

/**
 * Mark that the current visitor just initiated a *signup* (not a login), so the
 * subsequent SIGNED_IN handler can emit `signup_completed` to PostHog reliably.
 *
 * Stored in localStorage (survives the OAuth redirect round-trip) with a timestamp
 * so stale markers are ignored. Replaces the old profile-existence heuristic, which
 * broke once the signup DB trigger began provisioning the profile before sign-in.
 */
export const persistSignupIntent = (method: SignupMethod) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    getSafeLocalStorage().setItem(
      SIGNUP_INTENT_STORAGE_KEY,
      JSON.stringify({ method, ts: Date.now() }),
    );
  } catch (error) {
    logWarn('Failed to persist signup intent', error);
  }
};

/** Read-and-clear the signup intent marker. Returns null if absent or stale. */
export const consumeSignupIntent = (): SignupMethod | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = getSafeLocalStorage();
  let raw: string | null = null;
  try {
    raw = storage.getItem(SIGNUP_INTENT_STORAGE_KEY);
    storage.removeItem(SIGNUP_INTENT_STORAGE_KEY);
  } catch (error) {
    logWarn('Failed to read signup intent', error);
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { method?: unknown; ts?: unknown };
    if (typeof parsed?.method !== 'string' || typeof parsed.ts !== 'number') {
      return null;
    }
    if (Date.now() - parsed.ts > SIGNUP_INTENT_MAX_AGE_MS) {
      return null;
    }
    const method = parsed.method;
    return method === 'email' || method === 'google' || method === 'github' || method === 'linkedin' || method === 'x'
      ? method
      : null;
  } catch {
    return null;
  }
};

export const trackActivationCompleted = (
  properties: AnalyticsProperties & { trigger: ActivationCompletedTrigger },
) => captureEvent('activation_completed', properties);

const ACTIVATION_EVENT_ALIASES: Partial<Record<ActivationFunnelEvent, string>> = {
  first_action_opened: 'activation_first_action_opened',
  first_input_submitted: 'activation_first_input_submitted',
  first_output_generated: 'activation_first_output_generated',
  first_artifact_saved: 'activation_first_artifact_saved',
};

export const trackActivationFunnelEvent = (
  eventName: ActivationFunnelEvent,
  properties?: ActivationFunnelProps,
) => {
  const canonicalName = ACTIVATION_EVENT_ALIASES[eventName] ?? eventName;
  captureEvent(canonicalName, properties);
};

export const trackOnboardingPathSelected = (properties: { path: 'icp' | 'mentor' }) =>
  captureEvent('onboarding_path_selected', properties);

/** Top of the forced-onboarding funnel: the path chooser rendered. */
export const trackOnboardingGateShown = () => captureEvent('onboarding_gate_shown');

/** The funnel leak: user dismissed the chooser without picking a path. */
export const trackOnboardingPathSkipped = (properties: { view: 'choose' | 'mentor' }) =>
  captureEvent('onboarding_path_skipped', properties);

export const trackOnboardingStarted = (properties: {
  source: OnboardingStartedSource;
  userId?: string;
  page_path?: string;
  quiz_version?: number;
}) => captureAuthenticatedEvent('onboarding_started', properties.userId, properties);

export const trackOnboardingCompleted = (properties: OnboardingCompletedProps) =>
  captureEvent('onboarding_completed', properties);

export const trackOnboardingStepCompleted = (properties: {
  step: number;
  step_name: string;
  total_steps: number;
  /** Milliseconds since the quiz started — enables per-step timing in PostHog. */
  elapsed_ms?: number;
  /** Milliseconds spent on this specific step (since the previous one). */
  step_time_ms?: number;
  quiz_version?: number;
} & AnalyticsProperties) => captureEvent('onboarding_step_completed', properties);

/** Fired when an authenticated user leaves /onboarding without completing it. */
export const trackOnboardingAbandoned = (properties: {
  last_step: number;
  last_step_name: string;
  total_steps: number;
  elapsed_ms: number;
  quiz_version?: number;
} & AnalyticsProperties) => captureEvent('onboarding_abandoned', properties);

// ─── Retention: BizMap AI events ─────────────────────────────────────────────

export const trackBizMapFirstMessage = (properties?: AnalyticsProperties) =>
  captureEvent('bizmap_first_message_sent', properties);

export const trackBizMapOutputGenerated = (properties?: AnalyticsProperties) =>
  captureEvent('bizmap_first_output_generated', properties);

export const trackBizMapOutputSaved = (properties?: AnalyticsProperties) =>
  captureEvent('bizmap_output_saved', properties);

export const trackBizMapDemoStarted = (properties?: AnalyticsProperties) =>
  captureEvent('bizmap_demo_started', properties);

export const trackBizMapDemoCompleted = (properties?: AnalyticsProperties) =>
  captureEvent('bizmap_demo_completed', properties);

export const trackBizMapDemoConverted = (properties?: AnalyticsProperties) =>
  captureEvent('bizmap_demo_converted_to_signup', properties);

// ─── Retention: Tool activation events ───────────────────────────────────────

export const trackICPBuilderStarted = (properties?: AnalyticsProperties & { userId?: string }) =>
  captureAuthenticatedEvent('icp_builder_started', properties?.userId as string | undefined, properties);

export const trackICPBuilderOpened = (properties: {
  source: IcpBuilderOpenedSource;
  seed_prefilled: boolean;
}) => captureEvent('icp_builder_opened', properties);

export const trackIcpBuilderStartedUngated = (properties: { source: string }) =>
  trackICPBuilderStarted({
    ...properties,
    entry_variant: 'ungated',
  });

export const trackICPBuilderCompleted = (properties: ICPBuilderCompletedProps) =>
  captureEvent('icp_builder_completed', properties);

export const trackICPBuilderAbandoned = (properties: {
  last_step: string;
  mode: 'fast' | 'guided' | null;
  steps_completed: number;
  total_steps: number;
}) => captureEvent('icp_builder_abandoned', properties);

export const trackICPBuilderStepCompleted = (properties: {
  step: number;
  step_name: string;
  total_steps: number;
  mode: 'fast' | 'guided';
} & AnalyticsProperties) =>
  captureAuthenticatedEvent('icp_builder_step_completed', properties.userId as string | undefined, properties);

export const trackICPBuilderModeSelected = (properties: {
  mode: 'fast' | 'guided';
  is_authenticated: boolean;
}) => captureEvent('icp_builder_mode_selected', properties);

export const trackICPSeedSubmitted = (properties?: AnalyticsProperties) =>
  captureEvent('icp_seed_submitted', properties);

export const trackICPPreviewReady = (properties?: AnalyticsProperties) =>
  captureEvent('icp_preview_ready', properties);

export const trackICPUnlockGateShown = (properties?: AnalyticsProperties) =>
  captureEvent('icp_unlock_gate_shown', properties);

export const trackICPUnlockClicked = (properties?: AnalyticsProperties) =>
  captureEvent('icp_unlock_clicked', properties);

export const trackICPLoginClicked = (properties?: AnalyticsProperties) =>
  captureEvent('icp_login_clicked', properties);

export const trackICPResumeLinkRequested = (properties?: AnalyticsProperties) =>
  captureEvent('icp_resume_link_requested', properties);

export const trackICPResumeRestored = (properties?: AnalyticsProperties) =>
  captureEvent('icp_resume_restored', properties);

export const trackICPDashboardOpened = (properties?: AnalyticsProperties) =>
  captureEvent('icp_dashboard_opened', properties);

export const trackICPUnlockedDraftOpened = (properties?: AnalyticsProperties) =>
  captureEvent('icp_unlocked_draft_opened', properties);

export const trackWaitlistCreated = (properties?: AnalyticsProperties) =>
  captureEvent('waitlist_created', properties);

export const trackToolFirstUse = (toolName: string, properties?: AnalyticsProperties) =>
  captureEvent('tool_first_use', { tool: toolName, ...properties });

export const trackFirstToolUsed = (properties: FirstToolUsedProps) => {
  const storage = getSafeLocalStorage();
  const guardKey = 'first_tool_tracked';
  if (storage.getItem(guardKey) === 'true') return;
  storage.setItem(guardKey, 'true');
  captureEvent('first_tool_used', properties);
};

export const trackCreditExhausted = (properties: CreditExhaustedProps) => {
  const storage = getSafeSessionStorage();
  const guardKey = `credit_exhausted_tracked_${properties.plan}_${properties.last_feature_used}`;
  if (storage.getItem(guardKey) === 'true') return;
  storage.setItem(guardKey, 'true');
  captureEvent('credit_exhausted', properties);
};

// ─── Retention: Share events ──────────────────────────────────────────────────

export const trackShareLinkCreated = (properties?: AnalyticsProperties) =>
  captureEvent('share_link_created', properties);

export const trackShareLinkViewed = (properties?: AnalyticsProperties) =>
  captureEvent('share_link_viewed', properties);

export const trackShareLinkConverted = (properties?: AnalyticsProperties) =>
  captureEvent('share_link_converted', properties);

// ─── Retention: Weekly mission events ────────────────────────────────────────

export const trackWeeklyMissionViewed = (properties?: AnalyticsProperties) =>
  captureEvent('weekly_mission_viewed', properties);

export const trackWeeklyMissionCreated = (properties?: AnalyticsProperties) =>
  captureEvent('weekly_mission_created', properties);

export const trackWeeklyMissionCompleted = (properties?: AnalyticsProperties) =>
  captureEvent('weekly_mission_completed', properties);

export const trackWeeklyMissionMissed = (properties?: AnalyticsProperties) =>
  captureEvent('weekly_mission_missed', properties);

export const trackDashboardAccountabilityStateViewed = (properties?: AnalyticsProperties) =>
  captureEvent('dashboard_accountability_state_viewed', properties);

export const trackDashboardAccountabilityInterventionClicked = (properties?: AnalyticsProperties) =>
  captureEvent('dashboard_accountability_intervention_clicked', properties);

// ─── Dashboard founder journey panel ─────────────────────────────────────────
// The connected command-center view: stage rail + cross-tool progress tiles.

export const trackDashboardJourneyPanelViewed = (properties?: AnalyticsProperties) =>
  captureEvent('dashboard_journey_panel_viewed', properties);

export const trackDashboardJourneyStageClicked = (properties?: AnalyticsProperties) =>
  captureEvent('dashboard_journey_stage_clicked', properties);

export const trackDashboardJourneyToolOpened = (properties?: AnalyticsProperties) =>
  captureEvent('dashboard_journey_tool_opened', properties);

export const trackDashboardJourneyContinueClicked = (properties?: AnalyticsProperties) =>
  captureEvent('dashboard_journey_continue_clicked', properties);

export const trackDashboardFounderSignalsExpanded = (properties?: AnalyticsProperties) =>
  captureEvent('dashboard_founder_signals_expanded', properties);

export const trackToolMilestoneDashboardReturnClicked = (properties?: AnalyticsProperties) =>
  captureEvent('tool_milestone_dashboard_return_clicked', properties);

// ─── Demo Studio activation funnel ───────────────────────────────────────────
// The founder's creation funnel (project → brief → demo → step → publish → share)
// plus the downstream lead event. Build a PostHog funnel from these to find where
// founders drop off before sharing a demo. demo_lead_captured fires on the public
// launch page (a visitor, not the founder), so keep it out of the founder funnel.

export type DemoStudioFunnelEvent =
  | 'demo_project_created'
  | 'demo_brief_generated'
  | 'demo_created'
  | 'demo_step_added'
  | 'demo_published'
  | 'demo_shared'
  | 'demo_lead_captured';

export const trackDemoStudioFunnel = (event: DemoStudioFunnelEvent, properties?: AnalyticsProperties) =>
  captureEvent(event, properties);

// ─── Cross-tool journey events ───────────────────────────────────────────────
// Standardized events so one funnel template (tool_opened → tool_output_created)
// works across every core tool, without pageview proxies.

export type CoreToolName =
  | 'icp_builder'
  | 'pmf_lab'
  | 'demo_studio'
  | 'mvp_builder'
  | 'gtm_strategist'
  | 'traction_engine';

export const trackToolOpened = (tool: CoreToolName, properties?: AnalyticsProperties) =>
  captureEvent('tool_opened', { tool, ...properties });

export const trackToolOutputCreated = (tool: CoreToolName, artifactType: string, properties?: AnalyticsProperties) =>
  captureEvent('tool_output_created', { tool, artifact_type: artifactType, ...properties });

// ─── GTM Strategist funnel ───────────────────────────────────────────────────

export const trackGTMOpened = (properties?: AnalyticsProperties) =>
  captureEvent('gtm_opened', properties);

export const trackGTMIntakeCompleted = (properties?: AnalyticsProperties) =>
  captureEvent('gtm_intake_completed', properties);

export const trackGTMPlanGenerated = (properties: { channel_count: number } & AnalyticsProperties) =>
  captureEvent('gtm_plan_generated', properties);

export const trackGTMPlanSaved = (properties: { status: string } & AnalyticsProperties) =>
  captureEvent('gtm_plan_saved', properties);

export const trackGTMPlanShared = (properties?: AnalyticsProperties) =>
  captureEvent('gtm_plan_shared', properties);

// ─── Traction Engine funnel ──────────────────────────────────────────────────

export const trackTractionOpened = (properties?: AnalyticsProperties) =>
  captureEvent('traction_opened', properties);

export const trackTractionSprintCreated = (properties: { channel: string } & AnalyticsProperties) =>
  captureEvent('traction_sprint_created', properties);

export const trackTractionExperimentLogged = (
  properties: { channel: string; decision: string } & AnalyticsProperties
) => captureEvent('traction_experiment_logged', properties);

export const trackTractionWeeklyLogCompleted = (
  properties: { combined_score: number; phase_seven_ready: boolean; experiment_count: number } & AnalyticsProperties
) => captureEvent('traction_weekly_log_completed', properties);

export const trackTractionBoundaryDecision = (
  properties: { decision: string; channel: string } & AnalyticsProperties
) => captureEvent('traction_sprint_boundary_decision', properties);

// ─── MVP Builder funnel ──────────────────────────────────────────────────────

export const trackMVPBuilderOpened = (properties?: AnalyticsProperties) =>
  captureEvent('mvp_builder_opened', properties);

export const trackMVPGenerationCompleted = (properties?: AnalyticsProperties) =>
  captureEvent('mvp_generation_completed', properties);

export const trackMVPDeployed = (properties?: AnalyticsProperties) =>
  captureEvent('mvp_deployed', properties);

export const trackMVPIntegrationConnected = (properties: { integration: 'github' | 'supabase' } & AnalyticsProperties) =>
  captureEvent('mvp_integration_connected', properties);

export const trackMVPCreditsExhausted = (properties?: AnalyticsProperties) =>
  captureEvent('mvp_credits_exhausted', properties);

// ─── PMF Lab additions ───────────────────────────────────────────────────────

export const trackPMFSurveyShared = (properties?: AnalyticsProperties) =>
  captureEvent('pmf_survey_shared', properties);

export const trackPMFEvidenceLogged = (properties: { evidence_type: string } & AnalyticsProperties) =>
  captureEvent('pmf_evidence_logged', properties);

export const normalizePlanId = (planLike?: string | null): PlanId => {
  const normalized = (planLike || '').trim().toLowerCase();
  if (normalized === 'starter') return 'STARTER';
  if (normalized === 'creator' || normalized === 'rising') return 'RISING';
  if (normalized === 'professional' || normalized === 'pro') return 'PRO';
  return 'ROOKIE';
};

export const trackUpgradeClicked = ({
  from_plan,
  to_plan,
  location,
}: {
  from_plan: PlanId;
  to_plan: PlanId;
  location: UpgradeLocation;
}) => captureEvent('upgrade_clicked', { from_plan, to_plan, location });

export const trackUpgradePromptShown = ({
  trigger,
  credits_remaining,
  current_plan,
  target_plan,
}: UpgradePromptShownProps) => captureEvent('upgrade_prompt_shown', {
  trigger,
  credits_remaining,
  current_plan: normalizePlanId(current_plan),
  target_plan,
});

export const trackJourneyUpgradePromptShown = (properties: {
  trigger: string;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  target_plan: 'starter' | 'rising' | 'pro';
  source_tool?: string;
  route?: string;
}) => captureEvent('journey_upgrade_prompt_shown', properties);

export const trackJourneyUpgradePromptClicked = (properties: {
  trigger: string;
  current_plan: PlanId;
  target_plan: PlanId;
  source_tool?: string;
  route?: string;
}) => captureEvent('journey_upgrade_prompt_clicked', properties);

export const trackJourneyUpgradePromptDismissed = (properties: {
  trigger: string;
  source_tool?: string;
  route?: string;
}) => captureEvent('journey_upgrade_prompt_dismissed', properties);

export const trackJourneyRecommendationShown = (properties: {
  recommendation_id: string;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  target_plan?: 'starter' | 'rising' | 'pro';
  stage: string;
  tool_name: string;
  is_locked: boolean;
  route?: string;
}) => captureEvent('journey_recommendation_shown', properties);

export const trackJourneyRecommendationClicked = (properties: {
  recommendation_id: string;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  target_plan?: 'starter' | 'rising' | 'pro';
  stage: string;
  tool_name: string;
  destination: 'tool_preview' | 'plan';
  is_locked: boolean;
  route?: string;
}) => captureEvent('journey_recommendation_clicked', properties);

export const trackSoftPreviewShown = (properties: {
  feature_key: string;
  tool_name: string;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  target_plan?: 'starter' | 'rising' | 'pro';
  surface: string;
  route?: string;
}) => captureEvent('soft_preview_shown', properties);

export const trackSoftPreviewClicked = (properties: {
  feature_key: string;
  tool_name: string;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  target_plan?: 'starter' | 'rising' | 'pro';
  destination: 'tool_preview' | 'plan';
  surface: string;
  route?: string;
}) => captureEvent('soft_preview_clicked', properties);

export const trackMilestoneUpgradeHintShown = (properties: {
  stage: string;
  tool_name: string;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  target_plan: 'starter' | 'rising' | 'pro';
  route?: string;
}) => captureEvent('milestone_upgrade_hint_shown', properties);

export const trackCreditCostDisclosed = (properties: {
  feature_key: string;
  credit_cost: number;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  credits_available: number;
  status: 'free' | 'metered' | 'locked';
  source_tool?: string;
}) => captureEvent('credit_cost_disclosed', properties);

export const trackCreditActionCompleted = (properties: {
  feature_key: string;
  credit_cost: number;
  current_plan: 'rookie' | 'starter' | 'rising' | 'pro';
  balance_after?: number;
  source_tool?: string;
  // Correlation id shared with the matching $ai_generation event so credit
  // revenue can be joined to real model $ cost for per-feature margin (Phase 2.2).
  operation_id?: string;
}) => captureEvent('credit_action_completed', properties);

export const trackCreditActivityViewed = (properties?: AnalyticsProperties) =>
  captureEvent('credit_activity_viewed', properties);

export const trackPricingViewed = ({ source }: { source: string }) =>
  captureEvent('pricing_viewed', { source });

// ─── Conversion funnel attribution ───────────────────────────────────────────

export const trackExitIntentModalShown = (properties: {
  user_state: 'authenticated' | 'anonymous';
  page: string;
}) => captureEvent('exit_intent_modal_shown', properties);

export const trackSignupFormAbandoned = (properties: {
  last_field: string | null;
  fields_touched: string[];
  fields_count: number;
}) => captureEvent('signup_form_abandoned', properties);

export const trackSignupCompletedAttributed = (properties: {
  method: string;
  entry_cta: string;
  entry_page: string;
  minutes_from_cta: number | null;
}) => captureEvent('signup_completed_attributed', properties);

export const isLikelyBot = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /bot|crawl|spider|slurp|mediapartners/i.test(navigator.userAgent);
};

export const captureUtmSuperProperties = () => {
  const utms = getFirstTouchUtms();
  if (!isPosthogReady(posthogClient) || Object.keys(utms).length === 0) return;
  try {
    posthogClient.register(utms);
  } catch (e) {
    logWarn('PostHog UTM super-properties failed', e);
  }
};
