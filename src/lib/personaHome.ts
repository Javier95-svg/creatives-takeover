import type { UserType } from './accountTypes.ts';

/**
 * What the workspace home says to each account type.
 *
 * Founders and builders resolve to null, which means PulseHomeView renders
 * exactly as it always has. Everything here exists because the founder home is
 * actively wrong for the other three: it offers a rotating headline about their
 * "idea", a stage badge the snapshot fabricates as "Stage 1 Identity" when
 * there is no progress row, and a focus list telling them to define an ICP.
 */

export interface PersonaCount {
  key: string;
  /** Reads as a sentence fragment after the number: "3 open requests". */
  label: string;
}

export interface PersonaFocusItem {
  id: string;
  title: string;
  route: string;
  /** Which digest count drives this line, if any. */
  countKey?: string;
}

export interface PersonaShortcut {
  label: string;
  route: string;
}

export interface PersonaChip {
  key: string;
  label: string;
  count: number;
}

export interface PersonaHome {
  /** The type chip, which replaces the project name a non founder does not have. */
  label: string;
  /** Shown when there is nothing waiting, in place of the founder next step nudge. */
  emptyFocus: string;
  /** Two lines, matching the founder hero's shape. */
  headline: readonly [string, string];
  chips: readonly PersonaCount[];
  focus: readonly PersonaFocusItem[];
  shortcuts: readonly PersonaShortcut[];
  /** Replaces "Personalized founder guidance" in the assistant's context. */
  composerPurpose: string;
}

const MENTOR: PersonaHome = {
  label: 'Mentor',
  emptyFocus: 'Nothing waiting on you right now.',
  headline: ['Founders are waiting on you.', 'Answer, and keep the slot.'],
  chips: [{ key: 'pendingRequests', label: 'open requests' }],
  focus: [
    { id: 'mentor-requests', title: 'Respond to pending call requests', route: '/mentor/bookings', countKey: 'pendingRequests' },
    { id: 'mentor-messages', title: 'Reply to unread messages', route: '/messages', countKey: 'unreadMessages' },
    { id: 'mentor-saves', title: 'See who saved your profile', route: '/account/analytics', countKey: 'newSaves' },
  ],
  shortcuts: [
    { label: 'My bookings', route: '/mentor/bookings' },
    { label: 'My profile', route: '/mentorship' },
    { label: 'Messages', route: '/messages' },
  ],
  composerPurpose: 'Guidance for a mentor working with founders on this platform',
};

const MARKETPLACE: PersonaHome = {
  label: 'Marketplace',
  emptyFocus: 'No new enquiries right now.',
  headline: ['People are looking', 'for what you do.'],
  chips: [{ key: 'newEnquiries', label: 'new enquiries' }],
  focus: [
    { id: 'provider-enquiries', title: 'Answer new enquiries', route: '/marketplace/enquiries', countKey: 'newEnquiries' },
    { id: 'provider-messages', title: 'Reply to unread messages', route: '/messages', countKey: 'unreadMessages' },
    { id: 'provider-listing', title: 'Review how your listing reads', route: '/marketplace' },
  ],
  shortcuts: [
    { label: 'My listing', route: '/marketplace' },
    { label: 'Enquiries', route: '/marketplace/enquiries' },
    { label: 'Messages', route: '/messages' },
  ],
  composerPurpose: 'Guidance for a service provider working with founders on this platform',
};

const INVESTOR: PersonaHome = {
  label: 'Investor',
  emptyFocus: 'No new matches right now.',
  headline: ['New founders to meet.', 'Matched to what you back.'],
  chips: [{ key: 'newMatches', label: 'new matches' }],
  focus: [
    { id: 'investor-matches', title: 'Review founders matching your focus', route: '/investors/matches', countKey: 'newMatches' },
    { id: 'investor-messages', title: 'Reply to unread messages', route: '/messages', countKey: 'unreadMessages' },
  ],
  shortcuts: [
    { label: 'My matches', route: '/investors/matches' },
    { label: 'Browse founders', route: '/co-founder' },
    { label: 'Messages', route: '/messages' },
  ],
  composerPurpose: 'Guidance for an investor meeting founders on this platform',
};

const BY_TYPE: Partial<Record<UserType, PersonaHome>> = {
  mentor: MENTOR,
  marketplace: MARKETPLACE,
  investor: INVESTOR,
};

/**
 * Null for founders and builders, which is the signal to render the existing
 * home untouched. Returning a founder persona instead would mean rewriting the
 * hero for the majority of accounts to change it for a minority.
 */
export function personaHome(userType: UserType): PersonaHome | null {
  return BY_TYPE[userType] ?? null;
}

/** A concise, user-supplied focus, separate from the account classification. */
export function personaInterestSummary(userType: UserType, roleProfile: Record<string, unknown>): string | null {
  const key = userType === 'mentor' ? 'expertise' : userType === 'marketplace' ? 'services' : userType === 'investor' ? 'sectors' : null;
  if (!key) return null;
  const raw = roleProfile[key];
  if (!Array.isArray(raw)) return null;
  const labels = raw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.trim().slice(0, 40)).slice(0, 2);
  return labels.length ? labels.join(', ') : null;
}

export function personaGuidanceContext(userType: UserType, roleProfile: Record<string, unknown>): string | null {
  const focus = personaInterestSummary(userType, roleProfile);
  const stages = Array.isArray(roleProfile.stages)
    ? roleProfile.stages.filter((value): value is string => typeof value === 'string').slice(0, 3).join(', ')
    : '';
  const extra = userType === 'mentor' ? roleProfile.engagement
    : userType === 'marketplace' ? roleProfile.capacity
    : userType === 'investor' ? roleProfile.activity : null;
  const extraLabel = userType === 'mentor' ? 'engagement' : userType === 'marketplace' ? 'capacity' : 'activity';
  const parts = [focus && `focus ${focus}`, stages && `stages ${stages}`,
    typeof extra === 'string' && extra && `${extraLabel} ${extra}`].filter(Boolean);
  return parts.length ? parts.join('; ').slice(0, 240) : null;
}

export type PersonaDigest = Record<string, number>;

/** The chips actually shown: a count is only worth the space when it is not zero. */
export function personaChips(persona: PersonaHome, digest: PersonaDigest) {
  return persona.chips
    .map((chip) => ({ ...chip, count: digest[chip.key] ?? 0 }))
    .filter((chip) => chip.count > 0);
}

/**
 * Focus lines, most urgent first.
 *
 * A line with a count of zero is dropped rather than shown as "0 to do", and a
 * line with no count at all is kept because it is a standing suggestion. An
 * account still awaiting review gets nothing: its category features are not
 * open yet, so offering them would be a lie.
 */
export function personaFocus(persona: PersonaHome, digest: PersonaDigest, awaitingReview = false) {
  if (awaitingReview) return [];
  return persona.focus
    .filter((item) => !item.countKey || (digest[item.countKey] ?? 0) > 0)
    .map((item) => ({
      id: item.id,
      route: item.route,
      title: item.countKey ? `${digest[item.countKey]} ${item.title.toLowerCase()}` : item.title,
    }))
    .slice(0, 3);
}
