import type { ApprovalStatus, UserType } from './accountTypes.ts';

export type AccountTagTarget = {
  isMentor?: boolean;
  isMarketplace?: boolean;
  founderSegment?: 'founder' | 'builder' | null;
  /** The five-way category. Supersedes founderSegment where it is set. */
  userType?: UserType | null;
  approvalStatus?: ApprovalStatus | null;
};

export type AccountTag = {
  label: 'Mentor' | 'Marketplace' | 'Investor' | 'Founder' | 'Builder';
  variant: 'outline' | 'secondary';
};

/**
 * The single tag an account carries in search.
 *
 * One tag per account is a rule, not a layout preference. Mentors, marketplace
 * providers and investors are not regular users of the platform, so they are
 * never also labelled Founder or Builder.
 *
 * Mentor outranks Marketplace for anyone who is both, matching where search
 * already sends them: the mentorship profile carries the booking flow. The
 * directory tables win over user_type because an account can hold a live mentor
 * or service listing regardless of what it answered in the quiz.
 *
 * An unapproved investor is tagged as nothing rather than as Investor. The
 * claim is theirs until an admin agrees with it, and until then it should not
 * appear to the network as a fact.
 */
export function accountTag(account: AccountTagTarget): AccountTag | null {
  if (account.isMentor) return { label: 'Mentor', variant: 'outline' };
  if (account.isMarketplace) return { label: 'Marketplace', variant: 'outline' };

  const approved = account.approvalStatus == null || account.approvalStatus === 'approved';
  if (account.userType === 'investor') {
    return approved ? { label: 'Investor', variant: 'outline' } : null;
  }
  if (account.userType === 'mentor') return approved ? { label: 'Mentor', variant: 'outline' } : null;
  if (account.userType === 'marketplace') return approved ? { label: 'Marketplace', variant: 'outline' } : null;

  const segment = account.userType === 'founder' || account.userType === 'builder'
    ? account.userType
    : account.founderSegment;
  if (segment === 'founder') return { label: 'Founder', variant: 'secondary' };
  if (segment === 'builder') return { label: 'Builder', variant: 'secondary' };
  return null;
}
