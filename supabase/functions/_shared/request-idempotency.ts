const DEFAULT_TIME_BUCKET_MS = 30_000;
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 240;
const MAX_FINGERPRINT_LENGTH = 3_000;

interface FingerprintObject {
  [key: string]: FingerprintValue;
}

type FingerprintValue = string | number | boolean | null | undefined | FingerprintValue[] | FingerprintObject;

function sanitizeFingerprint(value: FingerprintValue, depth = 0): FingerprintValue {
  if (value === null || value === undefined) return value;
  if (depth >= MAX_DEPTH) return '[max-depth]';

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeFingerprint(item, depth + 1));
  }

  const entries = Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, sanitizeFingerprint(item as FingerprintValue, depth + 1)]);

  return Object.fromEntries(entries);
}

function stableStringify(value: FingerprintValue): string {
  return JSON.stringify(value) ?? 'null';
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CreditIdempotencyOptions {
  userId: string;
  feature: string;
  sessionId?: string;
  requestFingerprint?: unknown;
  timeBucketMs?: number;
}

/**
 * Resolve a credit deduction idempotency key from request headers, or build
 * a deterministic fallback key to dedupe duplicate submits/retries.
 */
export async function resolveCreditIdempotencyKey(
  req: Request,
  options: CreditIdempotencyOptions
): Promise<string> {
  const providedKey = req.headers.get('Idempotency-Key')?.trim();
  if (providedKey) {
    return providedKey;
  }

  const timeBucketMs = options.timeBucketMs && options.timeBucketMs > 0
    ? options.timeBucketMs
    : DEFAULT_TIME_BUCKET_MS;

  const timeBucket = Math.floor(Date.now() / timeBucketMs);
  const pathname = (() => {
    try {
      return new URL(req.url).pathname;
    } catch {
      return req.url;
    }
  })();

  const sanitizedFingerprint = sanitizeFingerprint(options.requestFingerprint as FingerprintValue);
  const serializedFingerprint = stableStringify(sanitizedFingerprint).slice(0, MAX_FINGERPRINT_LENGTH);
  const seed = [
    'credit-deduction',
    options.userId,
    options.feature,
    options.sessionId ?? '',
    req.method,
    pathname,
    serializedFingerprint,
    String(timeBucket),
  ].join('|');

  const digest = await sha256Hex(seed);
  return `auto-${digest.slice(0, 40)}`;
}
