import type * as AmplitudeBrowser from '@amplitude/analytics-browser';
import { getSafeSessionStorage, getSafeLocalStorage } from '@/lib/safeStorage';
import { logWarn } from '@/lib/logger';
import { captureFirstTouch } from '@/lib/attribution';
import { sanitizeAnalyticsValue } from '@/lib/analyticsSanitization';

type AnalyticsProperties = Record<string, unknown>;
type PostHogClient = (typeof import('posthog-js'))['default'];
type PostHogWithLoaded = PostHogClient & { __loaded?: boolean };
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
export interface SignupCompletedProps {
  method: SignupMethod;
  referrer: string | null;
  had_output_before_signup?: boolean;
  output_route?: 'icp' | 'demo';
  source?: string;
  time_to_signup_s?: number;
  anonymous_artifact_id?: string;
}
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
  onboarding_session_id?: string;
  flow_version?: string;
  rollout_variant?: string;
  plan?: string;
  device?: string;
  recommendation_overridden?: boolean;
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

const AUTH_METHOD_STORAGE_KEY = 'ct_auth_method';
const SIGNUP_INTENT_STORAGE_KEY = 'ct_signup_intent';
// Honor a stored signup intent for this long. Covers the OAuth round-trip and the
// immediate auto-sign-in after email signup; stale markers (e.g. a much later login)
// are ignored so we never mislabel a returning login as a fresh signup.
const SIGNUP_INTENT_MAX_AGE_MS = 30 * 60 * 1000;

let posthogClient: PostHogClient | null = null;
let posthogLoadPromise: Promise<PostHogClient> | null = null;
let initPromise: Promise<void> | null = null;
let initialized = false;
let amplitude: typeof AmplitudeBrowser | null = null;
let amplitudeLoadPromise: Promise<typeof AmplitudeBrowser> | null = null;
let amplitudeInitialized = false;
let amplitudeGeneration = 0;
let posthogBootstrapScheduled = false;
let sessionRecordingScheduled = false;
let sessionRecordingGeneration = 0;
// When true, all capture() calls are dropped so internal/admin activity never
// enters the event stream. Set from AuthContext once the signed-in email is known.
let internalUser = false;
// A sign-out can race the deferred PostHog bootstrap. Remember the reset and
// apply it from the loaded callback before any queued identity is flushed.
let posthogResetPending = false;
const queuedEvents: Array<{ eventName: string; properties?: AnalyticsProperties }> = [];
const queuedIdentifies: Array<{ id: string; properties?: AnalyticsProperties }> = [];
const posthogReadyListeners = new Set<(client: PostHogClient) => void>();
const DURABLE_EVENT_OUTBOX_KEY = 'ct_analytics_event_outbox_v1';
const DURABLE_EVENT_NAMES = new Set([
  'landing_viewed',
  'hero_input_focused',
  'hero_input_submitted',
  'first_output_generated',
  'deep_output_generated',
  'output_generation_failed',
  'signup_prompt_shown',
  'signup_started',
  'signup_completed',
  'artifact_claim_succeeded',
  'artifact_claim_failed',
]);
let durableOutboxRestored = false;

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
  'startupBrief',
  'startup_brief',
  'country',
  'free_form_answer',
  'freeFormAnswer',
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

export const sanitizeAnalyticsProperties = (properties?: AnalyticsProperties): AnalyticsProperties => {
  if (!properties) return {};

  return Object.entries(properties).reduce<AnalyticsProperties>((safe, [key, value]) => {
    if (PII_PROPERTY_KEYS.has(key) || typeof value === 'undefined') {
      return safe;
    }

    safe[key === 'userId' ? 'user_id' : key] = sanitizeAnalyticsValue(value);
    return safe;
  }, {});
};

const loadAmplitude = () => {
  if (!amplitudeLoadPromise) {
    amplitudeLoadPromise = import('@amplitude/analytics-browser').then((module) => {
      amplitude = module;
      return module;
    });
  }

  return amplitudeLoadPromise;
};

const createAnalyticsEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `event_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const readDurableEventOutbox = (): Array<{ eventName: string; properties?: AnalyticsProperties }> => {
  try {
    const raw = getSafeSessionStorage().getItem(DURABLE_EVENT_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.eventName === 'string' && DURABLE_EVENT_NAMES.has(item.eventName))
      .slice(-50);
  } catch {
    return [];
  }
};

const restoreDurableEventOutbox = () => {
  if (durableOutboxRestored) return;
  durableOutboxRestored = true;
  queuedEvents.push(...readDurableEventOutbox());
};

const persistDurableEvent = (eventName: string, properties: AnalyticsProperties) => {
  if (!DURABLE_EVENT_NAMES.has(eventName)) return properties;
  const durableProperties = {
    ...properties,
    $insert_id: typeof properties.$insert_id === 'string' ? properties.$insert_id : createAnalyticsEventId(),
  };
  const outbox = readDurableEventOutbox();
  outbox.push({ eventName, properties: durableProperties });
  getSafeSessionStorage().setItem(DURABLE_EVENT_OUTBOX_KEY, JSON.stringify(outbox.slice(-50)));
  return durableProperties;
};

const loadPosthog = () => {
  if (!posthogLoadPromise) {
    posthogLoadPromise = import('posthog-js').then((module) => module.default);
  }

  return posthogLoadPromise;
};

export const initAmplitudeWithUser = (userId: string) => {
  if (typeof window === 'undefined' || !AMPLITUDE_API_KEY) return;
  const generation = ++amplitudeGeneration;

  void loadAmplitude().then(() => {
    if (!amplitude || generation !== amplitudeGeneration) return;
    try {
      amplitude.init(AMPLITUDE_API_KEY, userId, { defaultTracking: { pageViews: false, sessions: true } });
      amplitudeInitialized = true;
    } catch (error) {
      logWarn('Amplitude init failed', error);
    }
  }).catch((error) => {
    logWarn('Amplitude load failed', error);
  });
};

export const resetAmplitude = () => {
  amplitudeGeneration += 1;
  if (!amplitudeInitialized || !amplitude) return;
  try {
    amplitude.reset();
    amplitudeInitialized = false;
  } catch (error) {
    logWarn('Amplitude reset failed', error);
  }
};

const captureAmplitudeEvent = (eventName: string, properties?: AnalyticsProperties) => {
  if (!amplitudeInitialized || !amplitude) return;

  try {
    amplitude.track(eventName, sanitizeAnalyticsProperties(properties));
  } catch (error) {
    logWarn('Amplitude capture failed', error);
  }
};

const identifyAmplitudeUser = (id: string, properties?: AnalyticsProperties) => {
  if (!amplitudeInitialized || !amplitude) return;

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

const isPosthogReady = (client: PostHogClient | null): client is PostHogClient =>
  typeof window !== 'undefined' && Boolean((client as PostHogWithLoaded | null)?.__loaded);

const notifyPosthogReady = (client: PostHogClient) => {
  posthogReadyListeners.forEach((listener) => listener(client));
};

const scheduleAuthenticatedSessionRecording = (client: PostHogClient) => {
  if (sessionRecordingScheduled || typeof window === 'undefined') return;
  sessionRecordingScheduled = true;
  const generation = sessionRecordingGeneration;

  const start = () => {
    if (generation !== sessionRecordingGeneration) return;
    try {
      client.startSessionRecording();
    } catch (error) {
      logWarn('PostHog session recording start failed', error);
    }
  };

  // Session replay is useful inside authenticated workspaces, but loading the
  // recorder on anonymous landing pages blocked the mobile main thread for
  // several seconds. Start it only after identity exists and the browser is
  // idle so it cannot compete with the route's first interaction.
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 5_000 });
  } else {
    setTimeout(start, 2_000);
  }
};

const flushQueue = () => {
  if (!isPosthogReady(posthogClient)) {
    return;
  }

  const identifies = queuedIdentifies.splice(0);
  identifies.forEach(({ id, properties }) => {
    posthogClient.identify(id, sanitizeAnalyticsProperties(properties));
  });
  if (identifies.length > 0) {
    scheduleAuthenticatedSessionRecording(posthogClient);
  }

  let allDelivered = true;
  queuedEvents.splice(0).forEach(({ eventName, properties }) => {
    try {
      posthogClient.capture(eventName, sanitizeAnalyticsProperties(properties));
    } catch (error) {
      allDelivered = false;
      queuedEvents.push({ eventName, properties });
      logWarn('PostHog queued capture failed', error);
    }
  });
  if (allDelivered) getSafeSessionStorage().removeItem(DURABLE_EVENT_OUTBOX_KEY);
};

const getFirstTouchUtms = (): AnalyticsProperties => {
  const firstTouch = captureFirstTouch();
  if (!firstTouch) return {};
  return {
    utm_source: firstTouch.utm_source,
    utm_medium: firstTouch.utm_medium,
    utm_campaign: firstTouch.utm_campaign,
    utm_content: firstTouch.utm_content,
    utm_term: firstTouch.utm_term,
  };
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
      const posthog = await loadPosthog();
      await new Promise<void>((resolve) => {
        posthog.init(PH_KEY as string, {
          api_host: PH_HOST,
          autocapture: true,
          disable_session_recording: true,
          disable_surveys: true,
          capture_performance: false,
          capture_dead_clicks: false,
          // SPA route changes must emit $pageview; the legacy default only fires
          // on full page loads, which made every <Link> navigation invisible.
          capture_pageview: 'history_change',
          before_send: (captureResult) => {
            if (!captureResult) return null;
            return {
              ...captureResult,
              properties: sanitizeAnalyticsValue(captureResult.properties) as Record<string, unknown>,
            };
          },
          persistence: 'localStorage',
          loaded: (client) => {
            posthogClient = client as PostHogClient;
            if (posthogResetPending) {
              posthogClient.reset();
              posthogResetPending = false;
            }
            registerFirstTouchUtms();
            initialized = true;
            flushQueue();
            notifyPosthogReady(posthogClient);
            resolve();
          },
        });

        posthogClient = posthog;
        if (isPosthogReady(posthogClient)) {
          registerFirstTouchUtms();
          initialized = true;
          flushQueue();
          notifyPosthogReady(posthogClient);
          resolve();
        }
      });
    } catch (error) {
      logWarn('PostHog init failed', error);
    }
  })();

  return initPromise;
};

export const getPosthogClient = () => posthogClient;

export const onPosthogReady = (listener: (client: PostHogClient) => void) => {
  if (isPosthogReady(posthogClient)) {
    listener(posthogClient);
    return () => {};
  }

  posthogReadyListeners.add(listener);
  return () => posthogReadyListeners.delete(listener);
};

export const bootstrapPosthog = () => {
  restoreDurableEventOutbox();
  if (posthogBootstrapScheduled || initialized || initPromise) return;
  posthogBootstrapScheduled = true;

  const start = () => {
    posthogBootstrapScheduled = false;
    void initPosthog();
  };

  // Give the app's first paint and LCP a clean window. Events emitted during
  // this delay remain in the in-memory queue and flush once PostHog is ready.
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: 5_000 });
      return;
    }
    start();
  }, 3_000);
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

/**
 * Start a fresh analytics identity after sign-out or an in-browser account
 * switch. Clearing the queues prevents events captured for the old account from
 * being flushed under the next identity while PostHog is still bootstrapping.
 */
export const resetAnalyticsIdentity = () => {
  queuedEvents.length = 0;
  queuedIdentifies.length = 0;
  getSafeSessionStorage().removeItem(DURABLE_EVENT_OUTBOX_KEY);
  resetAmplitude();
  sessionRecordingGeneration += 1;
  sessionRecordingScheduled = false;

  if (!isPosthogReady(posthogClient)) {
    posthogResetPending = true;
    return;
  }

  try {
    posthogClient.reset();
    posthogResetPending = false;
    sessionRecordingScheduled = false;
    posthogClient.stopSessionRecording();
  } catch (error) {
    posthogResetPending = true;
    logWarn('PostHog identity reset failed', error);
  }
};

export const captureEvent = (eventName: string, properties?: AnalyticsProperties) => {
  // Drop all events from internal/admin accounts so they never pollute metrics.
  if (internalUser) {
    return;
  }

  restoreDurableEventOutbox();
  const baseProperties = sanitizeAnalyticsProperties(properties);
  const safeProperties = isPosthogReady(posthogClient)
    ? baseProperties
    : persistDurableEvent(eventName, baseProperties);
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
  bootstrapPosthog();
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
      scheduleAuthenticatedSessionRecording(posthogClient);
      return;
    } catch (error) {
      logWarn('PostHog identify failed', error);
      return;
    }
  }

  queuedIdentifies.push({ id, properties: safeProperties });
  bootstrapPosthog();
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
  onboarding_session_id?: string;
  flow_version?: string;
  rollout_variant?: string;
  plan?: string | null;
  device?: string | null;
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
  | 'traction_engine'
  | 'pitch_deck_analyzer'
  | 'tech_stack'
  | 'insighta_test'
  | 'demo_studio_try';

export const trackToolOpened = (tool: CoreToolName, properties?: AnalyticsProperties) =>
  captureEvent('tool_opened', { tool, ...properties });

/**
 * One call for the public tool surfaces, so `free_tool_opened` (the existing
 * taxonomy) and `tool_opened` (the cross-tool funnel) can never disagree on the
 * tool name or the auth flag.
 *
 * `auth_resolved` exists because these fire before AuthContext settles — see
 * useFreeToolOpened for why we don't wait. Filter the funnel on
 * `is_authenticated = false`, and use `auth_resolved` to size the error bar.
 */
export const trackFreeToolOpened = (
  tool: CoreToolName,
  context: { isAuthenticated: boolean; authResolved: boolean },
) => {
  const properties = {
    tool,
    is_authenticated: context.isAuthenticated,
    auth_resolved: context.authResolved,
  };
  captureEvent('free_tool_opened', properties);
  captureEvent('tool_opened', properties);
};

/** First real input on an anonymous tool run — the step 93% never reach. */
export const trackAnonymousToolInputSubmitted = (tool: CoreToolName, properties?: AnalyticsProperties) =>
  captureEvent('activation_first_input_submitted', { tool, is_authenticated: false, ...properties });

/** First rendered output on an anonymous tool run. */
export const trackAnonymousToolOutputGenerated = (tool: CoreToolName, properties?: AnalyticsProperties) =>
  captureEvent('activation_first_output_generated', { tool, is_authenticated: false, ...properties });

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

// Evidence-driven founder execution cycle. Contact/customer PII is deliberately
// excluded: analytics receives only the loop, evidence type, source, and mode.
export const trackCycleLoopAssigned = (properties: {
  loop: 'PROVE' | 'SELL' | 'GROW';
  assignment_source: 'onboarding' | 'evidence' | 'legacy_fallback' | 'override';
  business_model?: string | null;
}) => captureEvent('cycle_loop_assigned', properties);

export const trackCyclePrimaryActionStarted = (properties: {
  loop: 'PROVE' | 'SELL' | 'GROW';
  action_key: string;
  expected_evidence: string;
}) => captureEvent('cycle_primary_action_started', properties);

export const trackCustomerEvidenceRecorded = (properties: {
  loop: 'PROVE' | 'SELL' | 'GROW';
  evidence_type: string;
  contact_source: string;
  verification_mode: string;
}) => captureEvent('customer_evidence_recorded', properties);

export const trackCostlyCommitmentRecorded = (properties: {
  loop: 'PROVE' | 'SELL' | 'GROW';
  commitment_type: 'commitment' | 'payment';
  verification_mode: string;
}) => captureEvent('costly_commitment_recorded', properties);

export const trackCycleLoopExited = (properties: {
  from_loop: 'PROVE' | 'SELL';
  to_loop: 'SELL' | 'GROW';
  exit_evidence: string;
}) => captureEvent('cycle_loop_exited', properties);

export const trackRaiseTrackActivated = (properties: {
  operating_loop: 'PROVE' | 'SELL' | 'GROW';
  activation_source: 'onboarding' | 'settings';
}) => captureEvent('raise_track_activated', properties);

export type FirstCustomerSprintEvent =
  | 'first_customer_sprint_application_viewed'
  | 'first_customer_sprint_application_submitted'
  | 'first_customer_sprint_viewed'
  | 'first_customer_sprint_started'
  | 'first_customer_sprint_prospect_target_reached'
  | 'first_customer_sprint_message_selected'
  | 'first_customer_sprint_mentor_brief_created'
  | 'first_customer_sprint_checkpoint_requested'
  | 'first_customer_sprint_checkpoint_scheduled'
  | 'first_customer_sprint_checkpoint_verified'
  | 'first_customer_sprint_checkpoint_cancelled'
  | 'first_customer_sprint_checkpoint_recommendation_recorded'
  | 'first_customer_sprint_outreach_target_reached'
  | 'first_customer_sprint_first_conversation'
  | 'first_customer_sprint_completed'
  | 'first_customer_sprint_review_submitted'
  | 'first_customer_sprint_continuation_checkout_started'
  | 'first_customer_sprint_abandoned';

// Only operational dimensions are accepted here. Do not add message bodies,
// contact names, URLs, mentor brief text, or founder notes.
export const trackFirstCustomerSprint = (event: FirstCustomerSprintEvent, properties: {
  sprint_id?: string;
  application_id?: string;
  status?: string;
  business_model?: string | null;
  acquisition_source?: string;
  qualified?: boolean;
  customer_count?: number;
  attached_count?: number;
  outreach_count?: number;
  conversation_count?: number;
  message_variant_key?: string;
  decision_category?: string;
  mentor_id?: string;
  discovery_call_id?: string;
  value_score?: number;
  primary_value?: string;
  primary_friction?: string;
  would_recommend?: boolean;
  pack_id?: string;
  price_cents?: number;
  credits_deducted?: number;
}) => captureEvent(event, properties);

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
