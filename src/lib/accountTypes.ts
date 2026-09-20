/**
 * The five account types and their approval states.
 *
 * Pure on purpose: the test runner resolves neither the @/ alias nor the
 * Supabase client, so anything worth asserting has to live away from them.
 */

export const REVIEWED_USER_TYPES = ['mentor', 'marketplace', 'investor'] as const;
export type ReviewedUserType = (typeof REVIEWED_USER_TYPES)[number];
export type UserType = 'founder' | 'builder' | ReviewedUserType;
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Self serve. These never produce an application and are approved on arrival. */
export const SELF_SERVE_USER_TYPES = ['founder', 'builder'] as const;

export const USER_TYPE_LABEL: Record<UserType, string> = {
  founder: 'Founder',
  builder: 'Builder',
  mentor: 'Mentor',
  marketplace: 'Marketplace provider',
  investor: 'Investor',
};

export const USER_TYPES: readonly UserType[] = [...SELF_SERVE_USER_TYPES, ...REVIEWED_USER_TYPES];

export function isReviewedUserType(value: string): value is ReviewedUserType {
  return (REVIEWED_USER_TYPES as readonly string[]).includes(value);
}

/** Narrows a value read from the database, which is plain text with no check constraint. */
export function isUserType(value: unknown): value is UserType {
  return typeof value === 'string' && (USER_TYPES as readonly string[]).includes(value);
}

/** True when the account may use the features of its category. */
export function hasCategoryAccess(userType: UserType, approvalStatus: ApprovalStatus): boolean {
  if ((SELF_SERVE_USER_TYPES as readonly string[]).includes(userType)) return true;
  return approvalStatus === 'approved';
}
