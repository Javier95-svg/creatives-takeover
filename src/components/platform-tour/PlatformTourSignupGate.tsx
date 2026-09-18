import { Suspense, lazy } from 'react';
import { TOUR_PANEL_LIMIT, TOUR_QUESTION_LIMIT } from '@/lib/platformTour/tourLimits';
import type { TourGateReason } from './PlatformTourGateContext';

/**
 * Signing up is the tour's only exit into the product, so it uses the same
 * dialog /build uses: email, Google and GitHub, one implementation. That dialog
 * was inline in BuildPage until this route needed it, and a second copy here
 * would have drifted from it.
 *
 * Lazy, because that modal reaches the auth context and the database client to
 * do its job. Loading it only when a visitor asks to sign up keeps the tour's
 * eager module graph free of both, which is what tests/platform-tour enforces.
 */
const AccountSignupDialog = lazy(() => import('@/components/auth/AccountSignupDialog'));

const REASONS: Record<TourGateReason, { title: string; body: string }> = {
  pulse: {
    title: 'Pulse answers with your own project',
    body: 'Pulse is not answering live in the tour, because there is no project of yours for it to reason about. With a free account it reads your stage, your saved tool outputs and your open tasks, and answers against those.',
  },
  credits: {
    title: 'Credits belong to an account',
    body: 'The meter in the header shows what the sample founder has left. Every plan including the free one comes with a monthly allowance.',
  },
  account: {
    title: 'This part needs an account',
    body: 'Profiles, messages and settings are tied to a real person. The tour has a sample founder instead, so there is nothing here to open.',
  },
  tool: {
    title: 'Running a tool needs an account',
    body: 'The tour shows what each tool produces and what finishing it takes. Running one writes a saved artifact against a project, which is why it needs an account.',
  },
  network: {
    title: 'The directories are real, the tour is not',
    body: 'Mentors, co-founders, investors and service providers are real people who opted in. Reaching them needs an account so they know who is contacting them.',
  },
  inbox: {
    title: 'Messages and notifications need an account',
    body: 'Connection requests, direct messages and notifications belong to a real person, and the counts you would normally see here are somebody’s actual inbox.',
  },
  project: {
    title: 'Projects belong to an account',
    body: 'This is where a founder switches project and creates a new one. The platform holds one result per stage per project, so a second project is a real commitment rather than a blank page.',
  },
  questions: {
    title: `That is the ${TOUR_QUESTION_LIMIT} questions the tour answers`,
    body: 'The assistant only means anything against your own project. Create a free account and it answers from your stage, your saved outputs and your open tasks, with no cap.',
  },
  depth: {
    title: 'You have seen most of the platform',
    body: `The tour opens ${TOUR_PANEL_LIMIT} panels and you have now used them. Everything past this point is the same product working on a real project instead of a sample one.`,
  },
};

export function PlatformTourSignupGate({ reason, open, onOpenChange, context }: {
  reason: TourGateReason;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The panel the visitor was on, echoed back so the dialog is not abrupt. */
  context: string;
}) {
  if (!open) return null;
  const copy = REASONS[reason];
  return <Suspense fallback={null}>
    <AccountSignupDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={copy.title}
      subtitle={copy.body}
      contextLabel="Where you were"
      contextValue={context}
      // Back to the tour after signing up, so a visitor who converts mid-tour
      // does not lose the panel they were reading.
      returnPath="/demo"
    />
  </Suspense>;
}
