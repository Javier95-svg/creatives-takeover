type AnalyticsProperties = Record<string, unknown>;
type AnalyticsDestination = 'amplitude' | 'posthog';
type AnalyticsDeliveryStatus = 'sent' | 'skipped' | 'failed';

type AnalyticsDeliveryOutcome = {
  destination: AnalyticsDestination;
  status: AnalyticsDeliveryStatus;
  statusCode?: number;
  errorCode?: string;
};

class AnalyticsDeliveryError extends Error {
  readonly statusCode?: number;
  readonly errorCode: string;

  constructor(message: string, errorCode: string, statusCode?: number) {
    super(message);
    this.name = 'AnalyticsDeliveryError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

let warnedMissingPostHogKey = false;
const internalUserCache = new Map<string, Promise<boolean>>();

const readEnv = (key: string): string | undefined => {
  const denoRuntime = (globalThis as typeof globalThis & {
    Deno?: { env?: { get: (name: string) => string | undefined } };
  }).Deno;
  return denoRuntime?.env?.get(key);
};

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

const INTERNAL_EMAILS = new Set(
  (readEnv('INTERNAL_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
INTERNAL_EMAILS.add('admin@creatives-takeover.com');

const sanitizeProperties = (properties: AnalyticsProperties = {}) =>
  Object.fromEntries(
    Object.entries(properties)
      .filter(([key, value]) => !PII_PROPERTY_KEYS.has(key) && typeof value !== 'undefined')
      .map(([key, value]) => [key === 'userId' ? 'user_id' : key, value]),
  );

export const resolveAnalyticsErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = (error as Record<string, unknown>).errorCode ?? (error as Record<string, unknown>).code;
  if (typeof candidate !== 'string' && typeof candidate !== 'number') return undefined;
  const normalized = String(candidate).trim();
  return normalized ? normalized.slice(0, 100) : undefined;
};

const resolveInternalUser = (userId: string): Promise<boolean> => {
  if (!userId || userId === 'anonymous') return Promise.resolve(false);

  const cached = internalUserCache.get(userId);
  if (cached) return cached;

  const lookup = (async () => {
    const supabaseUrl = readEnv('SUPABASE_URL');
    const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return false;

    try {
      const response = await fetch(
        `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );
      if (!response.ok) return false;

      const payload = await response.json();
      const rawEmail = typeof payload?.email === 'string'
        ? payload.email
        : (typeof payload?.user?.email === 'string' ? payload.user.email : '');
      const email = rawEmail.trim().toLowerCase();
      return email.length > 0 && INTERNAL_EMAILS.has(email);
    } catch {
      // Analytics resolution must fail open and never affect the business request.
      return false;
    }
  })();

  // Edge isolates are short lived, but keep a hard bound for unusually busy ones.
  if (internalUserCache.size >= 1_000) internalUserCache.clear();
  internalUserCache.set(userId, lookup);
  return lookup;
};

const emitAmplitudeEvent = async (
  eventName: string,
  userId: string,
  properties: AnalyticsProperties,
  userProperties?: AnalyticsProperties,
): Promise<AnalyticsDeliveryOutcome> => {
  const apiKey = readEnv('AMPLITUDE_API_KEY');
  if (!apiKey) {
    return { destination: 'amplitude', status: 'skipped', errorCode: 'missing_api_key' };
  }

  const response = await fetch('https://api2.amplitude.com/2/httpapi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      events: [{
        user_id: userId,
        event_type: eventName,
        event_properties: sanitizeProperties(properties),
        user_properties: sanitizeProperties(userProperties),
      }],
    }),
  });
  if (!response.ok) {
    throw new AnalyticsDeliveryError(
      `Amplitude capture failed with status ${response.status}`,
      `http_${response.status}`,
      response.status,
    );
  }

  return { destination: 'amplitude', status: 'sent', statusCode: response.status };
};

const emitPostHogEvent = async (
  eventName: string,
  userId: string,
  properties: AnalyticsProperties,
  userProperties?: AnalyticsProperties,
): Promise<AnalyticsDeliveryOutcome> => {
  const apiKey = readEnv('POSTHOG_PROJECT_API_KEY');
  if (!apiKey) {
    if (!warnedMissingPostHogKey) {
      console.warn('[analytics] POSTHOG_PROJECT_API_KEY is not configured; server events are disabled');
      warnedMissingPostHogKey = true;
    }
    return { destination: 'posthog', status: 'skipped', errorCode: 'missing_api_key' };
  }

  const host = readEnv('POSTHOG_HOST') || 'https://us.i.posthog.com';
  const response = await fetch(`${host.replace(/\/$/, '')}/i/v0/e/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      event: eventName,
      distinct_id: userId,
      properties: {
        ...sanitizeProperties(properties),
        ...(userProperties ? { $set: sanitizeProperties(userProperties) } : {}),
      },
    }),
  });
  if (!response.ok) {
    throw new AnalyticsDeliveryError(
      `PostHog capture failed with status ${response.status}`,
      `http_${response.status}`,
      response.status,
    );
  }

  return { destination: 'posthog', status: 'sent', statusCode: response.status };
};

const toFailureOutcome = (
  destination: AnalyticsDestination,
  error: unknown,
): AnalyticsDeliveryOutcome => ({
  destination,
  status: 'failed',
  ...(error instanceof AnalyticsDeliveryError && error.statusCode
    ? { statusCode: error.statusCode }
    : {}),
  errorCode: error instanceof AnalyticsDeliveryError
    ? error.errorCode
    : (resolveAnalyticsErrorCode(error) ?? 'network_error'),
});

const recordDeliveryHealth = async (
  eventName: string,
  outcomes: AnalyticsDeliveryOutcome[],
) => {
  const supabaseUrl = readEnv('SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey || outcomes.length === 0) return;

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/record_analytics_delivery_health`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_event_name: eventName.slice(0, 120),
          p_results: outcomes.map((outcome) => ({
            destination: outcome.destination,
            status: outcome.status,
            status_code: outcome.statusCode,
            error_code: outcome.errorCode?.slice(0, 100),
          })),
          p_occurred_at: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      console.warn('[analytics-health] Failed to persist delivery health', {
        eventName,
        status: response.status,
      });
    }
  } catch (error) {
    console.warn('[analytics-health] Failed to persist delivery health', {
      eventName,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
};

export const emitBusinessEvent = async ({
  eventName,
  userId,
  properties,
  userProperties,
}: {
  eventName: string;
  userId: string;
  properties: AnalyticsProperties;
  userProperties?: AnalyticsProperties;
}) => {
  const deliver = async () => {
    try {
      if (await resolveInternalUser(userId)) return;

      const deliveries = [
        {
          destination: 'amplitude' as const,
          send: () => emitAmplitudeEvent(eventName, userId, properties, userProperties),
        },
        {
          destination: 'posthog' as const,
          send: () => emitPostHogEvent(eventName, userId, properties, userProperties),
        },
      ];
      const outcomes = await Promise.all(deliveries.map(async ({ destination, send }) => {
        try {
          return await send();
        } catch (error) {
          return toFailureOutcome(destination, error);
        }
      }));

      await recordDeliveryHealth(eventName, outcomes);
      outcomes.forEach((outcome) => {
        if (outcome.status === 'failed') {
          console.warn('[analytics] Event delivery failed', {
            destination: outcome.destination,
            eventName,
            statusCode: outcome.statusCode,
            errorCode: outcome.errorCode,
          });
        }
      });
    } catch (error) {
      console.warn('[analytics] Failed to emit business event', { eventName, userId, error });
    }
  };

  try {
    const edgeRuntime = (globalThis as typeof globalThis & {
      EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
    }).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(deliver());
      return;
    }
    await deliver();
  } catch (error) {
    console.warn('[analytics] Failed to schedule business event', {
      eventName,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
};
