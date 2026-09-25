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
  roleProfile: Record<string, unknown>;
  schemaVersion: number;
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
  sessionId?: string;
  fullName?: string | null;
  email?: string | null;
  /** The category fields, collected before the request is filed so a reviewer
      has something to review. The server validates these and snapshots them for review. */
  roleProfile?: Record<string, unknown> | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) throw new Error('Sign in to send this request.');

  // One statement in the database rather than an update and an insert from
  // here. It also marks onboarding complete, which is what stops the entry gate
  // looping these accounts back into the founder quiz forever, and it patches
  // user_preferences server side instead of racing a read modify write.
  const { error } = await supabase.rpc('submit_account_application' as never, {
    p_user_type: input.userType,
    p_session_id: input.sessionId ?? null,
    p_full_name: input.fullName ?? null,
    p_email: input.email ?? auth.user.email ?? null,
    p_role_profile: input.roleProfile ?? {},
  } as never);
  if (error) throw new Error(error.message);
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
