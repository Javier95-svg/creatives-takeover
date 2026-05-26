const STORAGE_KEY = '_cta_attr';

interface CTAAttribution {
  ctaId: string;
  page: string;
  section?: string;
  clickedAt: number;
}

export function useCTAAttribution() {
  const set = (ctaId: string, page: string, section?: string) => {
    try {
      const payload: CTAAttribution = { ctaId, page, clickedAt: Date.now(), ...(section ? { section } : {}) };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage unavailable — proceed without attribution
    }
  };

  const get = (): CTAAttribution | null => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as CTAAttribution | null;
    } catch {
      return null;
    }
  };

  const clear = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  return { set, get, clear };
}
