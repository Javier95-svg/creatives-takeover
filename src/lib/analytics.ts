import posthog from 'posthog-js';

type AnalyticsProperties = Record<string, unknown>;

const PH_KEY =
  import.meta.env.VITE_POSTHOG_API_KEY ??
  import.meta.env.VITE_POSTHOG_KEY ??
  'phc_KcKa7xY35m7VqBgjuIAW42UTTalocKV8RLgzI0JZpub';
const PH_HOST =
  import.meta.env.VITE_POSTHOG_API_HOST ??
  import.meta.env.VITE_POSTHOG_HOST ??
  'https://us.i.posthog.com';

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

export const trackWeeklyMissionCompleted = (properties?: AnalyticsProperties) =>
  captureEvent('weekly_mission_completed', properties);
