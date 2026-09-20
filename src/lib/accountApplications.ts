import { supabase } from '@/integrations/supabase/client';
import type { ApprovalStatus, ReviewedUserType } from '@/lib/accountTypes';

export * from '@/lib/accountTypes';

export interface AccountApplication {
  id: string;
  userId: string;
  userType: ReviewedUserType;
  status: ApprovalStatus;
  fullName: string | null;
  email: string | null;
  username: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  decisionNote: string | null;
}


/**
 * Files a mentor, marketplace or investor request.
 *
 * The profile is marked pending in the same call, so the account is unapproved
 * from the moment the request exists rather than from whenever the admin gets
 * to it. The database trigger on the application row sends the admin alert;
 * nothing here has to remember to.
 */
export async function submitAccountApplication(input: {
  userType: ReviewedUserType;
  fullName?: string | null;
  email?: string | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Sign in to send this request.');

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ user_type: input.userType, approval_status: 'pending' })
    .eq('id', userId);
  if (profileError) throw new Error(profileError.message);

  const { error } = await supabase.from('account_applications').insert({
    user_id: userId,
    user_type: input.userType,
    full_name: input.fullName ?? null,
    email: input.email ?? auth.user?.email ?? null,
  });

  // A second submission hits the one-pending-per-account index. That is the
  // intended outcome, not a failure the applicant needs to see.
  if (error && !/duplicate key|account_applications_one_pending/i.test(error.message)) {
    throw new Error(error.message);
  }
}

/** Admin only; the RPC refuses anyone else whatever the client sends. */
export async function listAccountApplications(status: ApprovalStatus | null = 'pending'): Promise<AccountApplication[]> {
  const { data, error } = await supabase.rpc('list_account_applications' as never, { p_status: status } as never);
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as AccountApplication[];
}

export async function reviewAccountApplication(input: {
  applicationId: string;
  decision: 'approved' | 'rejected';
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('review_account_application' as never, {
    p_application_id: input.applicationId,
    p_decision: input.decision,
    p_note: input.note ?? null,
  } as never);
  if (error) throw new Error(error.message);
}
