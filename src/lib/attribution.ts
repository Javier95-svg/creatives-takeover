/**
 * First-touch signup attribution for Creatives Takeover.
 *
 * `captureFirstTouch()` runs when the browser application starts.
 * `getSignupMetadata()` supplies metadata to Supabase email signup.
 * `persistAttributionAfterAuth()` covers OAuth and the direct-signup fallback.
 */
export const ATTRIBUTION_STORAGE_KEY = "ct_first_touch_v1";
const LEGACY_POSTHOG_STORAGE_KEY = "ct_posthog_first_touch_utms";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

const CLICK_SOURCE_KEYS = [
  ["gclid", "google"],
  ["fbclid", "meta"],
  ["twclid", "twitter"],
  ["msclkid", "bing"],
  ["ttclid", "tiktok"],
  ["li_fat_id", "linkedin"],
] as const;

export interface FirstTouch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  captured_at?: string;
}

export interface AttributionRpcClient {
  rpc: (
    fn: "capture_my_attribution",
    args: Record<string, unknown>,
  ) => PromiseLike<{ error: unknown }>;
}

const truncate = (value: string | null | undefined, maxLength: number): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
};

const normalizeStoredTouch = (value: unknown): FirstTouch | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const touch: FirstTouch = {};

  for (const key of UTM_KEYS) {
    if (typeof candidate[key] === "string") {
      const value = truncate(candidate[key] as string, 255);
      if (value) touch[key] = value;
    }
  }
  if (typeof candidate.referrer === "string") touch.referrer = truncate(candidate.referrer, 500);
  if (typeof candidate.landing_page === "string") touch.landing_page = truncate(candidate.landing_page, 500);
  if (typeof candidate.captured_at === "string") touch.captured_at = truncate(candidate.captured_at, 50);

  return Object.values(touch).some(Boolean) ? touch : null;
};

const safeGet = (): FirstTouch | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? normalizeStoredTouch(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const safeSet = (value: FirstTouch): void => {
  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Attribution is best-effort when browser storage is unavailable.
  }
};

const readLegacyPosthogUtms = (): FirstTouch => {
  try {
    const raw = window.localStorage.getItem(LEGACY_POSTHOG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = normalizeStoredTouch(JSON.parse(raw));
    if (!parsed) return {};
    return Object.fromEntries(
      UTM_KEYS.flatMap((key) => parsed[key] ? [[key, parsed[key]]] : []),
    ) as FirstTouch;
  } catch {
    return {};
  }
};

const isSameSiteHostname = (left: string, right: string): boolean =>
  left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);

const getExternalReferrer = (): string | undefined => {
  const raw = truncate(document.referrer, 2_000);
  if (!raw) return undefined;

  try {
    const referrer = new URL(raw);
    if (isSameSiteHostname(referrer.hostname.toLowerCase(), window.location.hostname.toLowerCase())) {
      return undefined;
    }
    // Query strings can contain email addresses or tokens. Origin + path is enough
    // for channel classification without persisting those values to the profile.
    return truncate(`${referrer.origin}${referrer.pathname}`, 500);
  } catch {
    return undefined;
  }
};

const getSafeLandingPage = (params: URLSearchParams): string => {
  const safeParams = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = truncate(params.get(key), 255);
    if (value) safeParams.set(key, value);
  }
  const query = safeParams.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`.slice(0, 500);
};

export function captureFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const existing = safeGet();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  // Preserve the UTM first touch already collected by the existing PostHog setup
  // for browsers that visited before database attribution was introduced.
  const touch: FirstTouch = readLegacyPosthogUtms();

  if (!UTM_KEYS.some((key) => touch[key])) {
    for (const key of UTM_KEYS) {
      const value = truncate(params.get(key), 255);
      if (value) touch[key] = value;
    }
  }

  if (!touch.utm_source) {
    const clickSource = CLICK_SOURCE_KEYS.find(([key]) => params.has(key));
    if (clickSource) touch.utm_source = clickSource[1];
  }

  touch.referrer = getExternalReferrer();
  touch.landing_page = getSafeLandingPage(params);
  touch.captured_at = new Date().toISOString();
  safeSet(touch);
  return touch;
}

export function getSignupMetadata(): Record<string, string> {
  const touch = safeGet() ?? captureFirstTouch() ?? {};
  const data: Record<string, string> = {};

  for (const key of UTM_KEYS) {
    if (touch[key]) data[key] = touch[key] as string;
  }
  if (touch.referrer) data.signup_referrer = touch.referrer;
  if (touch.landing_page) data.landing_page = touch.landing_page;
  return data;
}

export async function persistAttributionAfterAuth(client: AttributionRpcClient): Promise<void> {
  const touch = safeGet() ?? captureFirstTouch();
  if (!touch) return;

  try {
    // Call for direct visits too: the database derives signup_channel="direct"
    // from an empty source/referrer while preserving the landing page.
    const { error } = await client.rpc("capture_my_attribution", {
      p_utm_source: touch.utm_source ?? null,
      p_utm_medium: touch.utm_medium ?? null,
      p_utm_campaign: touch.utm_campaign ?? null,
      p_utm_term: touch.utm_term ?? null,
      p_utm_content: touch.utm_content ?? null,
      p_referrer: touch.referrer ?? null,
      p_landing_page: touch.landing_page ?? null,
    });
    if (error) console.warn("[attribution] Failed to persist first-touch attribution");
  } catch {
    // Attribution must never block authentication or profile initialization.
    console.warn("[attribution] First-touch persistence was unavailable");
  }
}
