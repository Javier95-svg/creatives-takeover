type AnalyticsProperties = Record<string, unknown>;

const PH_KEY =
  import.meta.env.VITE_POSTHOG_API_KEY ??
  import.meta.env.VITE_POSTHOG_KEY ??
  'phc_KcKa7xY35m7VqBgjuIAW42UTTalocKV8RLgzI0JZpub';
const PH_HOST =
  import.meta.env.VITE_POSTHOG_API_HOST ??
  import.meta.env.VITE_POSTHOG_HOST ??
  'https://us.i.posthog.com';

let posthogClient: (typeof import('posthog-js'))['default'] | null = null;
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
      const { default: posthog } = await import('posthog-js');
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
