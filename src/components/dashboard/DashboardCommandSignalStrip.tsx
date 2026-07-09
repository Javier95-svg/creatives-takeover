import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Compass, FileText, Gift, Layers3, Repeat2, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFounderCommandSignals } from '@/hooks/useFounderCommandSignals';

const TAB_COPY: Record<string, {
  icon: typeof Compass;
  label: string;
  title: string;
  body: string;
  useFor: string;
  notFor: string;
  actionLabel: string;
  actionRoute: string;
}> = {
  '/dashboard/files': {
    icon: FileText,
    label: 'Files',
    title: 'Your proof shelf.',
    body: 'This is where saved strategy, generated assets, uploads, and business artifacts should live.',
    useFor: 'Review ICP drafts, saved outputs, pitch material, and uploaded documents.',
    notFor: 'Planning what to do today. That belongs in Tasks or Routine.',
    actionLabel: 'Open Tasks',
    actionRoute: '/dashboard/tasks',
  },
  '/dashboard/tasks': {
    icon: Target,
    label: 'Tasks',
    title: 'Your action desk.',
    body: 'This is the place for deadlines, manual tasks, and platform recommendations that need a decision.',
    useFor: 'Accept, finish, reschedule, or reject work that needs action.',
    notFor: 'Long-term habits or saved artifacts. Those have separate homes.',
    actionLabel: 'Add task',
    actionRoute: '/dashboard/tasks',
  },
  '/dashboard/routine': {
    icon: Repeat2,
    label: 'Routine',
    title: 'Your founder rhythm.',
    body: 'This tab is for repeatable daily and weekly behavior, not one-off setup nags.',
    useFor: 'Track habits, weekly commitments, and recurring founder discipline.',
    notFor: 'Single tasks with deadlines. Put those in Tasks.',
    actionLabel: 'Review tasks',
    actionRoute: '/dashboard/tasks',
  },
  '/dashboard/referral': {
    icon: Gift,
    label: 'Referral',
    title: 'Your growth loop.',
    body: 'Referral work is most useful after your offer or product proof is clear enough to share.',
    useFor: 'Copy your referral link, track invites, and see earned rewards.',
    notFor: 'Fixing your product foundation. Use Focus Funnel or Files first.',
    actionLabel: 'Open Focus Funnel',
    actionRoute: '/dashboard/focus-funnel',
  },
  '/dashboard/focus-funnel': {
    icon: Compass,
    label: 'Focus',
    title: 'Your stage map.',
    body: 'This is the strategic map of where the business is in the Startup Development Cycle.',
    useFor: 'See the active stage, stage tasks, and the next strategic move.',
    notFor: 'Managing every small task. Use Tasks for the daily execution layer.',
    actionLabel: 'Open Tasks',
    actionRoute: '/dashboard/tasks',
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
    <section className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--background))_72%)] shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {copy.label}
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Layers3 className="h-3.5 w-3.5" />
              {completedFoundationCount}/{foundationalMilestones.length} setup
            </Badge>
            <Badge variant="outline">{referralReadyLabel}</Badge>
          </div>

          <div className="max-w-3xl">
            <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{copy.body}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">Use this for</p>
              <p className="mt-2 text-sm leading-6 text-foreground">{copy.useFor}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Not for</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.notFor}</p>
            </div>
          </div>
        </div>

        <aside className="border-t border-border/60 bg-background/65 p-5 lg:border-l lg:border-t-0">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quiet setup</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Foundation items stay visible here without hijacking the daily task list.
              </p>
              {nextFoundation ? (
                <div className="mt-4 rounded-xl border border-border/60 bg-card/80 p-4">
                  <p className="text-sm font-semibold text-foreground">{nextFoundation.title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{nextFoundation.description}</p>
                  <Button asChild size="sm" className="mt-4 w-full">
                    <Link to={nextFoundation.route}>
                      Continue setup
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-2 text-sm font-semibold text-success dark:text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Setup complete
                </div>
              )}
            </div>

            <Button asChild variant="outline" className="w-full justify-between">
              <Link to={copy.actionRoute}>
                {copy.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
