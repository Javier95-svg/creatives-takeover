import { Clock } from 'lucide-react';
import { useAccountContext } from '@/hooks/useAccountContext';
import { USER_TYPE_LABEL } from '@/lib/accountTypes';

/**
 * Shown to a mentor, marketplace member or investor while their request is
 * being reviewed.
 *
 * A pending account is a member, not a locked door. They get the whole
 * workspace and the network; what waits on the decision is the features of
 * their category. Saying so plainly is better than letting them wonder why
 * their bookings inbox is empty.
 *
 * It renders nothing while the context is loading, until a validated account context is available.
 */
export function AccountReviewBanner() {
  const { awaitingReview, userType, approvalStatus } = useAccountContext();
  if (!awaitingReview) return null;

  const label = USER_TYPE_LABEL[userType] ?? 'account';
  return (
    <div role="status" className="mx-auto mb-4 flex max-w-3xl items-start gap-3 rounded-card border border-border bg-muted/40 px-4 py-3">
      <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-sm leading-6 text-muted-foreground">
        {approvalStatus === 'rejected'
          ? `Your ${label.toLowerCase()} request was not approved. Your account stays active as a member, and you are welcome to apply again.`
          : `Your ${label.toLowerCase()} request is being reviewed. You have full access to the platform and the network in the meantime, and we will email you once there is a decision.`}
      </p>
    </div>
  );
}

export default AccountReviewBanner;
