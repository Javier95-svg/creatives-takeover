// Relative with an explicit extension so the node test runner can load this
// without the bundler alias, matching pulseHomeRecommendations.ts.
import { generateMentorSlug } from '../utils/mentorSlug.ts';

export type AccountRouteTarget = {
  username?: string | null;
  isMentor?: boolean;
  mentorName?: string | null;
  isMarketplace?: boolean;
  serviceSlug?: string | null;
};

/**
 * Where an account search result should open.
 *
 * Mentors go to their mentorship profile rather than the generic account page.
 * The slug is built from the mentor record's own name because that is what
 * /mentorship/:slug matches against, and it differs from the profile name for
 * 13 of the active mentors ("Samuel Starkman" against the profile "Sam
 * Starkman", "Selma Fetic" against "SF"). Using the profile name would send
 * those to a page that does not resolve.
 *
 * Marketplace providers go to their service listing for the same reason, using
 * the slug stored on the service row, for example get-marketing for Darya
 * Kablash. Mentorship is checked first so someone who is both lands on the
 * mentor page, which carries the booking flow.
 *
 * Falls back to the account profile whenever the listing identifier is missing,
 * which is what the v1 search response returns, so a fallback response still
 * links somewhere real instead of to a URL it cannot build.
 */
export function accountRoute(account: AccountRouteTarget): string | undefined {
  if (account.isMentor && account.mentorName) {
    const slug = generateMentorSlug(account.mentorName);
    if (slug) return `/mentorship/${slug}`;
  }
  if (account.isMarketplace && account.serviceSlug?.trim()) {
    return `/marketplace/${encodeURIComponent(account.serviceSlug.trim())}`;
  }
  return account.username ? `/profile/${encodeURIComponent(account.username)}` : undefined;
}
