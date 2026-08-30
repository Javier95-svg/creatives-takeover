import { getSafeLocalStorage, getSafeSessionStorage } from './safeStorage.ts';

/**
 * Analytics consent, the single source of truth for whether any tracking may run.
 *
 * This module must NEVER import analytics.ts — the dependency is one-directional
 * (analytics depends on consent, not the reverse) so that importing the gate can
 * never pull the vendor SDKs into the bundle it is supposed to be gating.
 */

export type ConsentStatus = 'unknown' | 'granted' | 'denied';

export const CONSENT_STORAGE_KEY = 'ct_cookie_consent_v1';

/** Written by attribution.ts; must not survive a rejection. */
const ATTRIBUTION_KEYS = ['ct_first_touch_v1', 'ct_posthog_first_touch_utms'];

/** Durable analytics outbox (sessionStorage); must never silently replay after a rejection. */
const EVENT_OUTBOX_KEY = 'ct_analytics_event_outbox_v1';

/** PostHog persists to localStorage (persistence: 'localStorage'), not cookies. */
const POSTHOG_KEY_PREFIXES = ['ph_', '__ph_opt_in_out_'];

interface ConsentRecord {
  analytics: 'granted' | 'denied';
  decided_at: string;
  version: 1;
}

type ConsentListener = (status: ConsentStatus) => void;

const listeners = new Set<ConsentListener>();

/**
 * In-memory fallback for the decision, used only when storage cannot answer
 * (private mode, blocked site data). Storage stays authoritative when readable,
 * so a decision made in one tab is visible in another.
 */
let fallback: ConsentStatus | null = null;

/** Memo so the hot path (every captureEvent) does not re-parse JSON. */
let memoRaw: string | null = null;
let memoStatus: ConsentStatus = 'unknown';

export function getAnalyticsConsent(): ConsentStatus {
  if (typeof window === 'undefined') return fallback ?? 'unknown';

  let raw: string | null = null;
  try {
    raw = getSafeLocalStorage().getItem(CONSENT_STORAGE_KEY) as string | null;
  } catch {
    return fallback ?? 'unknown';
  }

  // No stored record: either genuinely undecided, or the visitor decided but
  // storage refused the write. The in-memory fallback covers the second case.
  if (!raw) return fallback ?? 'unknown';

  if (raw === memoRaw) return memoStatus;

  try {
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    memoStatus =
      parsed?.analytics === 'granted' ? 'granted' : parsed?.analytics === 'denied' ? 'denied' : 'unknown';
  } catch {
    // Corrupt record — treat as undecided and re-ask.
    memoStatus = 'unknown';
  }
  memoRaw = raw;

  return memoStatus;
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'granted';
}

export function setAnalyticsConsent(status: 'granted' | 'denied'): void {
  fallback = status;

  const record: ConsentRecord = {
    analytics: status,
    decided_at: new Date().toISOString(),
    version: 1,
  };

  try {
    getSafeLocalStorage().setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked. `fallback` still holds for this session.
  }

  if (status === 'denied') {
    purgeAnalyticsStorage();
  }

  for (const listener of listeners) {
    try {
      listener(status);
    } catch (error) {
      console.warn('Consent listener failed:', error);
    }
  }
}

/**
 * Clears the stored decision so the banner is shown again. Exported for a future
 * "change your cookie choice" control on the privacy page.
 */
export function clearAnalyticsConsent(): void {
  fallback = null;
  memoRaw = null;
  memoStatus = 'unknown';
  try {
    getSafeLocalStorage().removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // no-op
  }
  for (const listener of listeners) {
    try {
      listener('unknown');
    } catch (error) {
      console.warn('Consent listener failed:', error);
    }
  }
}

export function onConsentChange(callback: ConsentListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Remove everything the analytics stack wrote before the visitor said no. Without
 * this, a queued event or a stored first-touch UTM would be replayed on the next
 * bootstrap and the rejection would leak.
 */
function purgeAnalyticsStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    getSafeSessionStorage().removeItem(EVENT_OUTBOX_KEY);
  } catch {
    // no-op
  }

  const local = getSafeLocalStorage();

  for (const key of ATTRIBUTION_KEYS) {
    try {
      local.removeItem(key);
    } catch {
      // no-op
    }
  }

  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (POSTHOG_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        local.removeItem(key);
      }
    }
  } catch {
    // Storage enumeration blocked — nothing was written either.
  }
}
