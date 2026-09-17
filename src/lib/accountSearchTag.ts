export type AccountTagTarget = {
  isMentor?: boolean;
  isMarketplace?: boolean;
  founderSegment?: 'founder' | 'builder' | null;
};

export type AccountTag = {
  label: 'Mentor' | 'Marketplace' | 'Founder' | 'Builder';
  variant: 'outline' | 'secondary';
};

/**
 * The single tag an account carries in search.
 *
 * One tag per account is a rule, not a layout preference. Mentors and
 * marketplace providers are not regular users of the platform, so they are
 * never also labelled Founder or Builder even though the segment is stored for
 * every account.
 *
 * Mentor outranks Marketplace for anyone who is both, matching where search
 * already sends them: the mentorship profile carries the booking flow.
 */
export function accountTag(account: AccountTagTarget): AccountTag | null {
  if (account.isMentor) return { label: 'Mentor', variant: 'outline' };
  if (account.isMarketplace) return { label: 'Marketplace', variant: 'outline' };
  if (account.founderSegment === 'founder') return { label: 'Founder', variant: 'secondary' };
  if (account.founderSegment === 'builder') return { label: 'Builder', variant: 'secondary' };
  return null;
}
