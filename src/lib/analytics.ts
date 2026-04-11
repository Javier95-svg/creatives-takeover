import posthog from 'posthog-js';

type AnalyticsProperties = Record<string, unknown>;
type SignupMethod = 'google' | 'linkedin' | 'email';

const PH_KEY =
  import.meta.env.VITE_POSTHOG_API_KEY ??
  import.meta.env.VITE_POSTHOG_KEY ??
  'phc_KcKa7xY35m7VqBgjuIAW42UTTalocKV8RLgzI0JZpub';
const PH_HOST =
  import.meta.env.VITE_POSTHOG_API_HOST ??
  import.meta.env.VITE_POSTHOG_HOST ??
  'https://us.i.posthog.com';

const FIRST_TOUCH_UTM_KEY = 'ct_posthog_first_touch_utms';

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

  window.setTimeout(start, 1500);
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

export const trackActivationCompleted = ({ artifact }: { artifact: string }) =>
  captureEvent('activation_completed', { artifact });

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

export const trackIcpBuilderStartedUngated = (properties: { source: string }) =>
  trackICPBuilderStarted({
    ...properties,
    entry_variant: 'ungated',
  });

export const trackICPBuilderCompleted = (properties?: AnalyticsProperties) =>
  captureEvent('icp_builder_completed', properties);

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
