type AnalyticsProperties = Record<string, unknown>;

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
) => {
  const apiKey = readEnv('AMPLITUDE_API_KEY');
  if (!apiKey) return;

  await fetch('https://api2.amplitude.com/2/httpapi', {
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
};

const emitPostHogEvent = async (
  eventName: string,
  userId: string,
  properties: AnalyticsProperties,
  userProperties?: AnalyticsProperties,
) => {
  const apiKey = readEnv('POSTHOG_PROJECT_API_KEY');
  if (!apiKey) {
    if (!warnedMissingPostHogKey) {
      console.warn('[analytics] POSTHOG_PROJECT_API_KEY is not configured; server events are disabled');
      warnedMissingPostHogKey = true;
    }
    return;
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
    throw new Error(`PostHog capture failed with status ${response.status}`);
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

      const results = await Promise.allSettled([
        emitAmplitudeEvent(eventName, userId, properties, userProperties),
        emitPostHogEvent(eventName, userId, properties, userProperties),
      ]);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn('[analytics] Event delivery failed', {
            destination: index === 0 ? 'amplitude' : 'posthog',
            eventName,
            reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
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
