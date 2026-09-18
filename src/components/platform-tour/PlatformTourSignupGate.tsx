import { Suspense, lazy } from 'react';
import { TOUR_PANEL_LIMIT, TOUR_QUESTION_LIMIT } from '@/lib/platformTour/tourLimits';
import type { TourGateReason } from './PlatformTourGateContext';

/**
 * Signing up is the tour's only exit into the product, so it uses the same
 * dialog /build uses: email, Google and GitHub, one implementation. That dialog
 * was inline in BuildPage until this route needed it, and a second copy here
 * would have drifted from it.
 *
 * Lazy, because that dialog reaches the auth context and the database client to
 * do its job. Loading it only when a visitor asks to sign up keeps the tour's
 * eager module graph free of both, which is what tests/platform-tour enforces.
 */
const AccountSignupDialog = lazy(() => import('@/components/auth/AccountSignupDialog'));

/**
 * One line each, and nothing else. An earlier version explained the reason in a
 * paragraph and echoed the panel the visitor came from, which turned a prompt
 * into a page. The heading already says why the wall is there.
 */
const REASONS: Record<TourGateReason, string> = {
  pulse: 'Pulse answers with your own project',
  credits: 'Credits belong to an account',
  account: 'This part needs an account',
  tool: 'Running a tool needs an account',
  network: 'Reaching real people needs an account',
  inbox: 'Messages and notifications need an account',
  project: 'Projects belong to an account',
  questions: `That is the ${TOUR_QUESTION_LIMIT} questions the tour answers`,
  depth: `That is the ${TOUR_PANEL_LIMIT} panels the tour opens`,
};

export function PlatformTourSignupGate({ reason, open, onOpenChange }: {
  reason: TourGateReason;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) return null;
  return <Suspense fallback={null}>
    <AccountSignupDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={REASONS[reason]}
      // Back to the tour after signing up, so a visitor who converts mid-tour
      // does not lose the panel they were reading.
      returnPath="/demo"
    />
  </Suspense>;
}
