import posthog from 'posthog-js';

// Prefer environment variable, fallback to provided key if present (use env in production)
const PH_KEY = import.meta.env.VITE_POSTHOG_KEY ?? 'phc_KcKa7xY35m7VqBgjuIAW42UTTalocKV8RLgzI0JZpub';
const PH_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialized = false;

if (typeof window !== 'undefined' && PH_KEY) {
  try {
    posthog.init(PH_KEY as string, {
      api_host: PH_HOST,
      persistence: 'localStorage',
    });
    initialized = true;
  } catch (e) {
    // swallow initialization errors in case PostHog isn't available in the environment
    // This keeps analytics non-blocking for the app.
    // eslint-disable-next-line no-console
    console.warn('PostHog init failed', e);
  }
}

export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  if (!initialized) return;
  try {
    posthog.capture(eventName, properties ?? {});
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('PostHog capture failed', e);
  }
};

export const identify = (id: string, props?: Record<string, any>) => {
  if (!initialized) return;
  try {
    posthog.identify(id);
    if (props) posthog.people && posthog.people.set && posthog.people.set(props);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('PostHog identify failed', e);
  }
};

export default posthog;
