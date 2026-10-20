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
  className: string;
};

const ACCOUNT_TAG_STYLES = {
  founder: 'border-blue-500/35 bg-blue-500/10 text-blue-800 dark:text-blue-200',
  builder: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200',
  mentor: 'border-violet-500/35 bg-violet-500/10 text-violet-800 dark:text-violet-200',
  marketplace: 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  investor: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
} as const;

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
  if (account.isMentor) return { label: 'Mentor', className: ACCOUNT_TAG_STYLES.mentor };
  if (account.isMarketplace) return { label: 'Marketplace', className: ACCOUNT_TAG_STYLES.marketplace };

  const approved = account.approvalStatus == null || account.approvalStatus === 'approved';
  if (account.userType === 'investor') {
    return approved ? { label: 'Investor', className: ACCOUNT_TAG_STYLES.investor } : null;
  }
  if (account.userType === 'mentor') return approved ? { label: 'Mentor', className: ACCOUNT_TAG_STYLES.mentor } : null;
  if (account.userType === 'marketplace') return approved ? { label: 'Marketplace', className: ACCOUNT_TAG_STYLES.marketplace } : null;

  const segment = account.userType === 'founder' || account.userType === 'builder'
    ? account.userType
    : account.founderSegment;
  if (segment === 'founder') return { label: 'Founder', className: ACCOUNT_TAG_STYLES.founder };
  if (segment === 'builder') return { label: 'Builder', className: ACCOUNT_TAG_STYLES.builder };
  return null;
}
