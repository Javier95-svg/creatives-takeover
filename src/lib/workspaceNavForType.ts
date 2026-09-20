import type { UserType } from './accountTypes.ts';

/**
 * Which sidebar sections and tools each account type sees.
 *
 * Founders and builders resolve to null, which means the sidebar renders its
 * own NAV_ITEMS and NAV_TOOLS untouched. That is deliberate: the majority of
 * accounts are founders, and a per type list for them would be a second copy of
 * the nav that could silently drift from the real one.
 *
 * A sixth type is one entry here. No migration, no component change.
 */

export interface NavSlice {
  /** Section labels, in order. */
  sections: readonly string[];
  /** Tools per section. A section absent from this map renders as a plain link. */
  tools: Readonly<Record<string, readonly string[]>>;
}

const MENTOR: NavSlice = {
  sections: ['Dashboard', 'Network', 'Content', 'Resources', 'Pricing'],
  tools: {
    Dashboard: ['Overview', 'My Bookings', 'Analytics', 'Messages'],
    Network: ['Find a Mentor', 'Find a Co-Founder', 'Marketplace'],
    Content: ['Newspaper', 'Podcast'],
    Resources: ['Accelerator Hunt', 'Tech Stack Builder'],
  },
};

const MARKETPLACE: NavSlice = {
  sections: ['Dashboard', 'Network', 'Content', 'Resources', 'Pricing'],
  tools: {
    Dashboard: ['Overview', 'Enquiries', 'Analytics', 'Messages'],
    Network: ['Find a Mentor', 'Find a Co-Founder', 'Marketplace'],
    Content: ['Newspaper', 'Podcast'],
    Resources: ['Accelerator Hunt', 'Tech Stack Builder'],
  },
};

const INVESTOR: NavSlice = {
  sections: ['Dashboard', 'Network', 'Content', 'Pricing'],
  tools: {
    Dashboard: ['Overview', 'Matches', 'Messages'],
    Network: ['Find a Co-Founder', 'Find your Angel', 'Marketplace'],
    Content: ['Newspaper', 'Podcast'],
  },
};

const BY_TYPE: Partial<Record<UserType, NavSlice>> = {
  mentor: MENTOR,
  marketplace: MARKETPLACE,
  investor: INVESTOR,
};

export function navSliceForType(userType: UserType): NavSlice | null {
  return BY_TYPE[userType] ?? null;
}

/**
 * Every type answers, so a new type cannot reach the sidebar without a decision
 * having been made about it. Founders and builders answer "the whole nav".
 */
export function navSectionsForType(userType: UserType, allSections: readonly string[]): readonly string[] {
  const slice = navSliceForType(userType);
  if (!slice) return allSections;
  // Ordered by the sidebar's own list so a slice cannot reorder the product.
  return allSections.filter((section) => slice.sections.includes(section));
}

export function navToolsForType(
  userType: UserType,
  section: string,
  allTools: Readonly<Record<string, readonly string[]>>,
): readonly string[] | undefined {
  const slice = navSliceForType(userType);
  if (!slice) return allTools[section];
  return slice.tools[section];
}
