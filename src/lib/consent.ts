import { getSafeLocalStorage, getSafeSessionStorage } from './safeStorage.ts';

/**
 * Analytics consent, the single source of truth for whether tracking that
 * stores anything on the device may run. Without it, visits are only counted
 * cookieless (PostHog's server-side hash), with nothing stored and no
 * identity, recordings, interaction capture or other vendors.
 *
 * This module must NEVER import analytics.ts — the dependency is one-directional
 * (analytics depends on consent, not the reverse) so that importing the gate can
 * never pull the vendor SDKs into the bundle it is supposed to be gating.
 */

export type ConsentStatus = 'unknown' | 'granted' | 'denied';

export const CONSENT_STORAGE_KEY = 'ct_cookie_consent_v1';

/**
 * Bump when the Privacy Policy changes what a choice covers, so everyone is
 * asked again. 2: anonymous visit counting, product usage records and, with
 * consent, time spent per section (9 Oct 2026).
 */
export const CONSENT_VERSION = 2;
/** A decision older than this is asked again. */
export const CONSENT_MAX_AGE_DAYS = 365;

/** Written by attribution.ts; must not survive a rejection. */
const ATTRIBUTION_KEYS = ['ct_first_touch_v1', 'ct_posthog_first_touch_utms'];

/** Durable analytics outbox (sessionStorage); must never silently replay after a rejection. */
const EVENT_OUTBOX_KEY = 'ct_analytics_event_outbox_v1';

/** PostHog persists to localStorage (persistence: 'localStorage'), not cookies. */
const POSTHOG_KEY_PREFIXES = ['ph_', '__ph_opt_in_out_'];

interface ConsentRecord {
  analytics: 'granted' | 'denied';
  decided_at: string;
  version: number;
}

/** The stored decision, for the settings view and the account record. */
export interface ConsentDecision {
  status: 'granted' | 'denied';
  decidedAt: string;
  version: number;
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
let memoDecision: ConsentDecision | null = null;

/** A decision made under an older policy version, or too long ago, is asked again. */
function isCurrent(record: Partial<ConsentRecord>): boolean {
  if (record.version !== CONSENT_VERSION) return false;
  const decided = Date.parse(record.decided_at ?? '');
  return Number.isFinite(decided) && Date.now() - decided < CONSENT_MAX_AGE_DAYS * 86_400_000;
}

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

  if (raw !== memoRaw) {
    memoRaw = raw;
    memoDecision = null;
    try {
      const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
      if ((parsed?.analytics === 'granted' || parsed?.analytics === 'denied') && typeof parsed.decided_at === 'string') {
        memoDecision = { status: parsed.analytics, decidedAt: parsed.decided_at, version: Number(parsed.version) || 1 };
      }
    } catch {
      // Corrupt record — treat as undecided and re-ask.
    }
  }
  // Checked on every read, not memoised: a decision can expire while the tab is open.
  memoStatus = memoDecision && isCurrent({ analytics: memoDecision.status, decided_at: memoDecision.decidedAt, version: memoDecision.version })
    ? memoDecision.status
    : 'unknown';
  return memoStatus;
}

/** The stored decision, even if it is out of date and about to be asked again. */
export function getConsentDecision(): ConsentDecision | null {
  getAnalyticsConsent();
  return memoDecision ?? (fallback === 'granted' || fallback === 'denied' ? { status: fallback, decidedAt: new Date().toISOString(), version: CONSENT_VERSION } : null);
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'granted';
}

export function setAnalyticsConsent(status: 'granted' | 'denied'): void {
  fallback = status;

  const record: ConsentRecord = {
    analytics: status,
    decided_at: new Date().toISOString(),
    version: CONSENT_VERSION,
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

/** Clears the stored decision so the banner is shown again. */
export function clearAnalyticsConsent(): void {
  fallback = null;
  memoRaw = null;
  memoStatus = 'unknown';
  memoDecision = null;
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

const settingsListeners = new Set<() => void>();

/** Reopen the consent choice (Cookie settings in the footer and account settings). */
export function openCookieSettings(): void {
  for (const listener of settingsListeners) {
    try {
      listener();
    } catch (error) {
      console.warn('Cookie settings listener failed:', error);
    }
  }
}

export function onCookieSettingsRequest(callback: () => void): () => void {
  settingsListeners.add(callback);
  return () => {
    settingsListeners.delete(callback);
  };
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
    const keys: string[] = [];
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (POSTHOG_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        local.removeItem(key);
      }
    }
  } catch {
    // Storage enumeration blocked — nothing was written either.
  }
}
