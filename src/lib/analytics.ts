import posthog from 'posthog-js';
import { getSafeSessionStorage } from '@/lib/safeStorage';

type AnalyticsProperties = Record<string, unknown>;
type SignupMethod = 'google' | 'linkedin' | 'email';
export type ActivationCompletedTrigger =
  | 'icp_completed'
  | 'mentor_saved'
  | 'first_message_sent'
  | 'first_artifact_created'
  | 'icp_seed_prefilled'
  | 'first_workspace_created';
export type PlanId = 'ROOKIE' | 'STARTER' | 'RISING' | 'PRO';
export type UpgradeLocation = 'pricing_page' | 'dashboard_banner' | 'feature_gate' | 'onboarding';
export type IcpBuilderOpenedSource = 'dashboard' | 'onboarding' | 'direct' | 'seed_redirect';

const PH_KEY =
  import.meta.env.VITE_POSTHOG_API_KEY ??
  import.meta.env.VITE_POSTHOG_KEY ??
  'phc_KcKa7xY35m7VqBgjuIAW42UTTalocKV8RLgzI0JZpub';
const PH_HOST =
  import.meta.env.VITE_POSTHOG_API_HOST ??
  import.meta.env.VITE_POSTHOG_HOST ??
  'https://us.i.posthog.com';

const FIRST_TOUCH_UTM_KEY = 'ct_posthog_first_touch_utms';
const AUTH_METHOD_STORAGE_KEY = 'ct_auth_method';

let posthogClient: typeof posthog | null = null;
let initPromise: Promise<void> | null = null;
let initialized = false;
const queuedEvents: Array<{ eventName: string; properties?: AnalyticsProperties }> = [];
const queuedIdentifies: Array<{ id: string; properties?: AnalyticsProperties }> = [];

const flushQueue = () => {
  if (!posthogClient) {
    return;
  }

  queuedIdentifies.splice(0).forEach(({ id, properties }) => {
    posthogClient?.identify(id, properties);
  });

  queuedEvents.splice(0).forEach(({ eventName, properties }) => {
    posthogClient?.capture(eventName, properties ?? {});
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
  if (!posthogClient) {
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
      posthog.init(PH_KEY as string, {
        api_host: PH_HOST,
        autocapture: true,
        persistence: 'localStorage',
      });
      posthogClient = posthog;
      registerFirstTouchUtms();
      initialized = true;
      flushQueue();
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
  if (posthogClient) {
    try {
      posthogClient.capture(eventName, properties ?? {});
      return;
    } catch (error) {
      console.warn('PostHog capture failed', error);
      return;
    }
  }

  queuedEvents.push({ eventName, properties });
  void initPosthog();
};

export const identify = (id: string, properties?: AnalyticsProperties) => {
  if (posthogClient) {
    try {
      posthogClient.identify(id, properties);
      return;
    } catch (error) {
      console.warn('PostHog identify failed', error);
      return;
    }
  }

  queuedIdentifies.push({ id, properties });
  void initPosthog();
};

export const trackLandingViewed = ({ page, exit_intent }: { page: string; exit_intent?: boolean }) =>
  captureEvent('landing_viewed', {
    page,
    ...(typeof exit_intent === 'boolean' ? { exit_intent } : {}),
  });

export const trackSoftGateShown = ({ trigger }: { trigger: string }) =>
  captureEvent('soft_gate_shown', { trigger });

export const trackSignupStarted = ({ method }: { method: SignupMethod }) =>
  captureEvent('signup_started', { method });

export const trackSignupCompleted = ({ method }: { method: SignupMethod }) =>
  captureEvent('signup_completed', { method });

export const persistAuthMethod = (method: SignupMethod) => {
  if (typeof window === 'undefined') {
    return;
  }

  getSafeSessionStorage().setItem(AUTH_METHOD_STORAGE_KEY, method);
};

export const readAuthMethod = (): SignupMethod | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = getSafeSessionStorage();
  const method = storage.getItem(AUTH_METHOD_STORAGE_KEY);
  storage.removeItem(AUTH_METHOD_STORAGE_KEY);

  return method === 'google' || method === 'linkedin' || method === 'email' ? method : null;
};

export const trackActivationCompleted = (
  properties: AnalyticsProperties & { trigger: ActivationCompletedTrigger },
) => captureEvent('activation_completed', properties);

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

export const trackICPBuilderStarted = (properties?: AnalyticsProperties) =>
  captureEvent('icp_builder_started', properties);

export const trackICPBuilderOpened = (properties: {
  source: IcpBuilderOpenedSource;
  seed_prefilled: boolean;
}) => captureEvent('icp_builder_opened', properties);

export const trackIcpBuilderStartedUngated = (properties: { source: string }) =>
  trackICPBuilderStarted({
    ...properties,
    entry_variant: 'ungated',
  });

export const trackICPBuilderCompleted = (properties?: AnalyticsProperties) =>
  captureEvent('icp_builder_completed', properties);

export const trackICPBuilderStepCompleted = (properties: {
  step: number;
  step_name: string;
  total_steps: number;
  mode: 'fast' | 'guided';
}) => captureEvent('icp_builder_step_completed', properties);

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

export const trackPricingViewed = ({ source }: { source: string }) =>
  captureEvent('pricing_viewed', { source });

export const isLikelyBot = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /bot|crawl|spider|slurp|mediapartners/i.test(navigator.userAgent);
};

export const captureUtmSuperProperties = () => {
  const utms = getFirstTouchUtms();
  if (!posthogClient || Object.keys(utms).length === 0) return;
  try {
    posthogClient.register(utms);
  } catch (e) {
    console.warn('PostHog UTM super-properties failed', e);
  }
};
