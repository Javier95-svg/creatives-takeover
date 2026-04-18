const STORAGE_KEY = 'ct_referral_code';
const CODE_PATTERN = /^[a-zA-Z0-9_-]{4,32}$/;

export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (code && CODE_PATTERN.test(code)) {
      localStorage.setItem(STORAGE_KEY, code);
    }
  } catch {
    // Ignore storage access errors (private browsing, disabled storage, etc.)
  }
}

export function consumeReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    if (code) localStorage.removeItem(STORAGE_KEY);
    return code && CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function peekReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return code && CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function buildReferralLink(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com');
  return `${base.replace(/\/$/, '')}/?ref=${encodeURIComponent(code)}`;
}
