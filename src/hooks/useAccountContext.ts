import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ApprovalStatus, UserType } from '@/lib/accountTypes';

export interface AccountContext {
  userType: UserType;
  approvalStatus: ApprovalStatus;
  /** False only for a mentor, marketplace member or investor still awaiting review. */
  hasCategoryAccess: boolean;
  roleProfile: Record<string, unknown>;
  requiresProject: boolean;
  hasProject: boolean;
  startupName: string | null;
  investorMatchVisible: boolean;
  investmentStage: string | null;
}

/** No category privileges until a validated account context has loaded. */
export const DEFAULT_ACCOUNT_CONTEXT: AccountContext = {
  userType: 'founder',
  approvalStatus: 'pending',
  hasCategoryAccess: false,
  roleProfile: {},
  requiresProject: false,
  hasProject: false,
  startupName: null,
  investorMatchVisible: false,
  investmentStage: null,
};

const USER_TYPES: UserType[] = ['founder', 'builder', 'mentor', 'marketplace', 'investor'];
const APPROVALS: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

/**
 * One call, one cache entry, read by the shell, the sidebar, the home and the
 * dashboard. They used to need four separate round trips to learn the same
 * facts, and account type had never reached any of them at all.
 */
export function useAccountContext() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['account-context', userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AccountContext> => {
      const { data, error } = await supabase.rpc('account_context' as never);
      if (error) throw error;
      const row = (data ?? {}) as Partial<AccountContext>;
      // Anything unrecognised falls back to the safe default rather than being
      // trusted into a branch it does not belong in.
      if (!USER_TYPES.includes(row.userType as UserType) || !APPROVALS.includes(row.approvalStatus as ApprovalStatus)) {
        throw new Error('Account details are unavailable. Please retry.');
      }
      const userType = row.userType as UserType;
      const approvalStatus = APPROVALS.includes(row.approvalStatus as ApprovalStatus)
        ? (row.approvalStatus as ApprovalStatus)
        : 'pending';
      return {
        userType,
        approvalStatus,
        hasCategoryAccess: row.hasCategoryAccess === true,
        roleProfile: row.roleProfile && typeof row.roleProfile === 'object' ? row.roleProfile : {},
        requiresProject: row.requiresProject === true,
        hasProject: row.hasProject === true,
        startupName: typeof row.startupName === 'string' ? row.startupName : null,
        investorMatchVisible: row.investorMatchVisible === true,
        investmentStage: typeof row.investmentStage === 'string' ? row.investmentStage : null,
      };
    },
  });

  const context = query.data ?? DEFAULT_ACCOUNT_CONTEXT;
  return {
    ...context,
    isLoading: query.isPending,
    isError: query.isError,
    /** True while a reviewed account waits for a decision. */
    awaitingReview: Boolean(query.data) && context.approvalStatus !== 'approved' && !context.hasCategoryAccess,
    refresh: query.refetch,
  };
}
