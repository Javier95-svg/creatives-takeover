import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { appendReturnParam } from '@/lib/authRedirect';
import { TOUR_PANEL_LIMIT, TOUR_QUESTION_LIMIT } from '@/lib/platformTour/tourLimits';
import type { TourGateReason } from './PlatformTourGateContext';

const REASONS: Record<TourGateReason, { title: string; body: string }> = {
  pulse: {
    title: 'Pulse answers with your own project',
    body: 'Pulse is not answering live in the tour, because there is no project of yours for it to reason about. With a free account it reads your stage, your saved tool outputs and your open tasks, and answers against those. The PMF Lab panel has a worked example.',
  },
  credits: {
    title: 'Credits belong to an account',
    body: 'The meter in the header shows what the sample founder has left. Every plan including the free one comes with a monthly allowance, and you can see exactly what each tool costs on the pricing page.',
  },
  account: {
    title: 'This part needs an account',
    body: 'Profiles, messages and settings are tied to a real person. The tour has a sample founder instead, so there is nothing here to open.',
  },
  tool: {
    title: 'Running a tool needs an account',
    body: 'The tour shows you what each tool produces and what it takes to finish it. Running one writes a saved artifact against a project, which is why it needs an account.',
  },
  network: {
    title: 'The directories are real, the tour is not',
    body: 'Mentors, co-founders, investors and service providers are real people who have opted in. Reaching them needs an account so they know who is contacting them.',
  },
  inbox: {
    title: 'Messages and notifications need an account',
    body: 'Connection requests, direct messages and notifications belong to a real person. The sample founder has none to show you, and the badge counts you would normally see here are somebody’s actual inbox.',
  },
  project: {
    title: 'Projects belong to an account',
    body: 'This is where a founder switches between projects and creates a new one. The platform holds one result per stage per project on purpose, so starting a second project is a real commitment rather than a fresh blank page.',
  },
  questions: {
    title: `That is the ${TOUR_QUESTION_LIMIT} questions the tour answers`,
    body: 'The assistant is the part that has to work against your own project to mean anything. Create a free account and it answers against your stage, your saved outputs and your open tasks, with no cap.',
  },
  depth: {
    title: 'You have seen most of the platform',
    body: `The tour opens ${TOUR_PANEL_LIMIT} panels, and you have now used them. Everything past this point is the same product working on a real project instead of a sample one.`,
  },
};

export function PlatformTourSignupGate({ reason, open, onOpenChange }: {
  reason: TourGateReason;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const copy = REASONS[reason];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.body}</DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Nothing you do in this tour is saved, and no account has been created for you.
      </p>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep looking around</Button>
        <Button asChild>
          <Link to={appendReturnParam('/signup', '/demo')}>
            Create a free account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
