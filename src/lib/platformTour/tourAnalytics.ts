import { captureEvent } from '@/lib/analytics';

/**
 * Telemetry for the guided tour at /demo.
 *
 * captureEvent reaches recordRoadmapAnalyticsEvent, which is the one path from
 * this route to the database. It early-returns for any event name outside
 * tool_opened, tool_output_created and icp_builder_step_completed, so the
 * platform_tour_ prefix can never write roadmap activity. tests/platform-tour
 * asserts that early return rather than trusting it, because the tour is
 * otherwise served entirely from static fixtures and a future event name
 * collision would be silent.
 */
export const trackPlatformTourOpened = (properties: { panel: string; referrer_kind: string }) =>
  captureEvent('platform_tour_opened', properties);

export const trackPlatformTourPanelViewed = (properties: { panel: string }) =>
  captureEvent('platform_tour_panel_viewed', properties);

export const trackPlatformTourGateShown = (properties: { panel: string; reason: string }) =>
  captureEvent('platform_tour_gate_shown', properties);

export const trackPlatformTourPartnershipClicked = (properties: { panel: string; destination: string }) =>
  captureEvent('platform_tour_partnership_clicked', properties);

/** Coarse source bucket, so no referring URL is ever sent. */
export function referrerKind(referrer: string, host: string) {
  if (!referrer) return 'direct';
  try {
    const source = new URL(referrer).hostname;
    if (source === host) return 'internal';
    return /mail|outlook|gmail/.test(source) ? 'email' : /linkedin|twitter|x\.com|facebook/.test(source) ? 'social' : 'referral';
  } catch { return 'direct'; }
}
