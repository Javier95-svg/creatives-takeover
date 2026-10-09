import { hasAnalyticsConsent } from '@/lib/consent';

const STORAGE_KEY = '_cta_attr';

interface CTAAttribution {
  ctaId: string;
  page: string;
  section?: string;
  clickedAt: number;
}

// Without analytics consent nothing is stored on the device: the last CTA
// click is held in memory for this page load. With consent it also goes to
// sessionStorage so it survives a full reload such as an OAuth redirect.
let memoryAttribution: CTAAttribution | null = null;

export function useCTAAttribution() {
  const set = (ctaId: string, page: string, section?: string) => {
    const payload: CTAAttribution = { ctaId, page, clickedAt: Date.now(), ...(section ? { section } : {}) };
    memoryAttribution = payload;
    if (!hasAnalyticsConsent()) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage unavailable — the in-memory copy still covers this page load
    }
  };

  const get = (): CTAAttribution | null => {
    if (memoryAttribution || !hasAnalyticsConsent()) return memoryAttribution;
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as CTAAttribution | null;
    } catch {
      return null;
    }
  };

  const clear = () => {
    memoryAttribution = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  return { set, get, clear };
}
