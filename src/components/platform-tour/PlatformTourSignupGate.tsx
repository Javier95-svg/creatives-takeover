import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { appendReturnParam } from '@/lib/authRedirect';
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
