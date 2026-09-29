import { trackPulseGuestLinkClicked } from '@/lib/analytics';
import { rememberIntendedAccountType } from '@/lib/intendedAccountType';
import type { PublicPulseLink } from '@/lib/publicPlatformFacts';

/**
 * Follows a page card or link in a signed-out Pulse reply. A tool link opens the
 * guest quiz with the tool as its return, and remembers Builder or Founder so
 * the quiz skips its first question, exactly as the homepage box does.
 * Returns where to navigate.
 */
export function followPublicPulseLink(link: PublicPulseLink): string {
  if (link.accountType) rememberIntendedAccountType(link.accountType);
  trackPulseGuestLinkClicked({ route: link.route, destination: link.destination });
  return link.destination;
}
