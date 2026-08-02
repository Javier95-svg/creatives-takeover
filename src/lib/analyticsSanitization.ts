const SECRET_QUERY_KEYS = new Set(['resume', 'guest']);
const SECRET_PROPERTY_KEYS = new Set([
  'resumeToken',
  'resume_token',
  'guestToken',
  'guest_token',
  'prompt',
  'raw_prompt',
]);

const hasSensitiveQuery = (value: string) =>
  /(?:^|[?&])(resume|guest)=/i.test(value) || /(?:resume|guest)%3d/i.test(value);

/** Removes opaque artifact secrets while preserving a usable route shape. */
export function redactSensitiveUrlParams(value: string): string {
  if (!hasSensitiveQuery(value)) return value;
  try {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
    const url = new URL(value, 'https://analytics.invalid');
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
        continue;
      }
      const nested = url.searchParams.get(key);
      if (nested && hasSensitiveQuery(nested)) {
        url.searchParams.set(key, redactSensitiveUrlParams(nested));
      }
    }
    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value
      .replace(/([?&])(resume|guest)=[^&#]*/gi, '$1')
      .replace(/[?&]+$/, '')
      .replace('?&', '?');
  }
}

export function sanitizeAnalyticsValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactSensitiveUrlParams(value);
  if (depth >= 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeAnalyticsValue(item, depth + 1));

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((safe, [key, item]) => {
    if (SECRET_PROPERTY_KEYS.has(key) || typeof item === 'undefined') return safe;
    safe[key] = sanitizeAnalyticsValue(item, depth + 1);
    return safe;
  }, {});
}
