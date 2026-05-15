import posthog from 'posthog-js';
import * as amplitude from '@amplitude/analytics-browser';
import { getSafeSessionStorage } from '@/lib/safeStorage';

type AnalyticsProperties = Record<string, unknown>;
type PostHogWithLoaded = typeof posthog & { __loaded?: boolean };
type StoredAuthMethod = 'google' | 'linkedin' | 'email' | 'github';
export type ActivationCompletedTrigger =
  | 'icp_completed'
  | 'mentor_saved'
  | 'first_message_sent'
  | 'first_artifact_created'
  | 'icp_seed_prefilled'
  | 'first_workspace_created';
export type PlanId = 'ROOKIE' | 'STARTER' | 'RISING' | 'PRO';
export type UpgradeLocation = 'pricing_page' | 'dashboard_banner' | 'feature_gate' | 'onboarding' | 'upgrade_trigger_banner';
export type UpgradePromptTrigger = 'soft_gate_banner' | 'hard_gate_modal' | 'post_icp_nudge' | 'dashboard_nudge';
export type IcpBuilderOpenedSource = 'dashboard' | 'onboarding' | 'direct' | 'seed_redirect';
export type OnboardingStartedSource = 'signup_redirect' | 'dashboard_prompt' | 'direct';

export interface SignupCompletedProps { method: 'email' | 'google' | 'github'; referrer: string | null; }
export interface OnboardingCompletedProps { quiz_completed: boolean; creative_niche: string | null; business_stage: string | null; }
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

const FIRST_TOUCH_UTM_KEY = 'ct_posthog_first_touch_utms';
const AUTH_METHOD_STORAGE_KEY = 'ct_auth_method';

let posthogClient: typeof posthog | null = null;
let initPromise: Promise<void> | null = null;
let initialized = false;
let amplitudeInitialized = false;
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

export const initAmplitude = () => {
  if (typeof window === 'undefined' || !AMPLITUDE_API_KEY || amplitudeInitialized) {
    return;
  }

  try {
    amplitude.init(AMPLITUDE_API_KEY);
    amplitudeInitialized = true;
  } catch (error) {
    console.warn('Amplitude init failed', error);
  }
};

const captureAmplitudeEvent = (eventName: string, properties?: AnalyticsProperties) => {
  initAmplitude();
  if (!amplitudeInitialized) return;

  try {
    amplitude.track(eventName, sanitizeAnalyticsProperties(properties));
  } catch (error) {
    console.warn('Amplitude capture failed', error);
  }
};

const identifyAmplitudeUser = (id: string, properties?: AnalyticsProperties) => {
  initAmplitude();
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
    console.warn('Amplitude identify failed', error);
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
    console.warn('Failed to read stored PostHog UTMs', error);
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
    console.warn('Failed to persist first-touch UTMs', error);
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
    console.warn('PostHog UTM registration failed', error);
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
      console.warn('PostHog init failed', error);
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

export const captureEvent = (eventName: string, properties?: AnalyticsProperties) => {
  const safeProperties = sanitizeAnalyticsProperties(properties);
  captureAmplitudeEvent(eventName, safeProperties);

  if (isPosthogReady(posthogClient)) {
    try {
      posthogClient.capture(eventName, safeProperties);
      return;
    } catch (error) {
      console.warn('PostHog capture failed', error);
      return;
    }
  }

  queuedEvents.push({ eventName, properties: safeProperties });
  void initPosthog();
};

export const identify = (id: string, properties?: AnalyticsProperties) => {
  const safeProperties = sanitizeAnalyticsProperties(properties);
  identifyAmplitudeUser(id, safeProperties);

  if (isPosthogReady(posthogClient)) {
    try {
      posthogClient.identify(id, safeProperties);
      return;
    } catch (error) {
      console.warn('PostHog identify failed', error);
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

  return method === 'google' || method === 'linkedin' || method === 'email' || method === 'github' ? method : null;
};

export const trackActivationCompleted = (
  properties: AnalyticsProperties & { trigger: ActivationCompletedTrigger },
) => captureEvent('activation_completed', properties);

export const trackOnboardingStarted = (properties: {
  source: OnboardingStartedSource;
  userId?: string;
  page_path?: string;
}) => captureAuthenticatedEvent('onboarding_started', properties.userId, properties);

export const trackOnboardingCompleted = (properties: OnboardingCompletedProps) =>
  captureEvent('onboarding_completed', properties);

export const trackOnboardingStepCompleted = (properties: {
  step: number;
  step_name: string;
  total_steps: number;
} & AnalyticsProperties) => captureEvent('onboarding_step_completed', properties);

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
  const storage = getSafeSessionStorage();
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
  current_plan,
  target_plan,
});

// TODO(dashboard_nudge): when a dedicated dashboard upgrade nudge is added, call
// trackUpgradePromptShown({ trigger: 'dashboard_nudge', credits_remaining, current_plan, target_plan });

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
}) => captureEvent('credit_action_completed', properties);

export const trackCreditActivityViewed = (properties?: AnalyticsProperties) =>
  captureEvent('credit_activity_viewed', properties);

export const trackPricingViewed = ({ source }: { source: string }) =>
  captureEvent('pricing_viewed', { source });

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
    console.warn('PostHog UTM super-properties failed', e);
  }
};
