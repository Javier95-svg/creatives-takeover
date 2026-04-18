const STORAGE_KEY = 'ct_pending_referral_code';
const OAUTH_AUTH_INTENT_KEY = 'oauth_auth_intent';
const CODE_PATTERN = /^[a-zA-Z0-9_-]{4,32}$/;

export type OAuthAuthIntent = 'signup' | 'login';

function isValidReferralCode(code: string | null | undefined): code is string {
  return Boolean(code && CODE_PATTERN.test(code));
}

export function persistPendingReferralCode(code: string): void {
  if (typeof window === 'undefined') return;
  if (!isValidReferralCode(code)) return;

  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Ignore storage access errors (private browsing, disabled storage, etc.)
  }
}

export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (isValidReferralCode(code)) {
      persistPendingReferralCode(code);
    }
  } catch {
    // Ignore storage access errors (private browsing, disabled storage, etc.)
  }
}

export function getPendingReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return isValidReferralCode(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage access errors.
  }
}

export function buildReferralLink(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com');
  return `${base.replace(/\/$/, '')}/?ref=${encodeURIComponent(code)}`;
}

export function setOAuthAuthIntent(intent: OAuthAuthIntent): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OAUTH_AUTH_INTENT_KEY, intent);
  } catch {
    // Ignore storage access errors.
  }
}

export function getOAuthAuthIntent(): OAuthAuthIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const intent = localStorage.getItem(OAUTH_AUTH_INTENT_KEY);
    return intent === 'signup' || intent === 'login' ? intent : null;
  } catch {
    return null;
  }
}

export function clearOAuthAuthIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OAUTH_AUTH_INTENT_KEY);
  } catch {
    // Ignore storage access errors.
  }
}
