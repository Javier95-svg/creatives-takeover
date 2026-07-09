import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Compass, FileText, Gift, Layers3, Repeat2, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFounderCommandSignals } from '@/hooks/useFounderCommandSignals';

const TAB_COPY: Record<string, { icon: typeof Compass; label: string; title: string; body: string }> = {
  '/dashboard/files': {
    icon: FileText,
    label: 'Files',
    title: 'Artifacts should prove the foundation exists.',
    body: 'Keep the proof of your customer, product, and launch work close at hand.',
  },
  '/dashboard/tasks': {
    icon: Target,
    label: 'Tasks',
    title: 'Today gets one command, not a recycled checklist.',
    body: 'Pick the action that moves today forward and close it before stacking more work.',
  },
  '/dashboard/routine': {
    icon: Repeat2,
    label: 'Routine',
    title: 'Habits and weekly mission stay above setup noise.',
    body: 'Protect the repeatable actions that keep founder momentum visible.',
  },
  '/dashboard/referral': {
    icon: Gift,
    label: 'Referral',
    title: 'Growth prompts wait for enough product foundation.',
    body: 'Share once the offer, proof, or waitlist is clear enough to send with confidence.',
  },
  '/dashboard/focus-funnel': {
    icon: Compass,
    label: 'Focus',
    title: 'Stage progress decides the next action.',
    body: 'Use the active stage and next action as the map for focused work.',
  },
};

export function DashboardCommandSignalStrip() {
  const { pathname } = useLocation();
  const {
    completedFoundationCount,
    currentStage,
    foundationalMilestones,
    hasProductFoundation,
    incompleteFoundations,
    isLoading,
  } = useFounderCommandSignals();
  const copy = TAB_COPY[pathname];

  if (!copy) return null;
  if (isLoading) return <Skeleton className="mb-5 h-24 rounded-2xl" />;

  const Icon = copy.icon;
  const nextFoundation = incompleteFoundations[0];
  const referralReadyLabel = pathname === '/dashboard/referral'
    ? hasProductFoundation ? 'Foundation ready' : 'Build foundation first'
    : `Stage ${currentStage}`;

  return (
    <section className="mb-5 rounded-2xl border border-border/60 bg-card/78 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {copy.label}
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Layers3 className="h-3.5 w-3.5" />
              {completedFoundationCount}/{foundationalMilestones.length} setup
            </Badge>
            <Badge variant="outline">{referralReadyLabel}</Badge>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">{copy.body}</p>
          </div>
        </div>

        {nextFoundation ? (
          <Button asChild variant="outline" className="shrink-0">
            <Link to={nextFoundation.route}>
              {nextFoundation.title}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-2 text-sm font-semibold text-success dark:text-success">
            <CheckCircle2 className="h-4 w-4" />
            Setup complete
          </div>
        )}
      </div>
    </section>
  );
}
