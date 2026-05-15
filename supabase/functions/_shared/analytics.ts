type AnalyticsProperties = Record<string, unknown>;

const sanitizeProperties = (properties: AnalyticsProperties = {}) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => typeof value !== 'undefined')
  );

const emitAmplitudeEvent = async (
  eventName: string,
  userId: string,
  properties: AnalyticsProperties,
  userProperties?: AnalyticsProperties,
) => {
  const apiKey = Deno.env.get('AMPLITUDE_API_KEY');
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
  const apiKey = Deno.env.get('POSTHOG_PROJECT_API_KEY');
  if (!apiKey) return;

  const host = Deno.env.get('POSTHOG_HOST') || 'https://us.i.posthog.com';
  await fetch(`${host.replace(/\/$/, '')}/capture/`, {
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
  try {
    await Promise.allSettled([
      emitAmplitudeEvent(eventName, userId, properties, userProperties),
      emitPostHogEvent(eventName, userId, properties, userProperties),
    ]);
  } catch (error) {
    console.warn('[analytics] Failed to emit business event', { eventName, userId, error });
  }
};
