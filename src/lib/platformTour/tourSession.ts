import { TOUR_EXTERNAL_ROUTES } from './tourPanels.ts';

/**
 * Whether this browser tab is in the platform tour. Set when /demo opens and
 * cleared by "Exit tour", so the public pages a visitor opens from the tour
 * (Community, Newspaper, Pricing…) keep the tour's sidebar and top bar instead
 * of dropping them into the marketing site.
 */
const KEY = 'ct-platform-tour';

export function markTourActive() {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* storage unavailable: pages render without the frame */ }
}

export function clearTour() {
  try { sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

export function isTourActive() {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}

/** A public page the tour links to, or a page inside one (a room, a post, an article). */
export function isTourPublicRoute(pathname: string) {
  return TOUR_EXTERNAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
