import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_CARD, DashboardSectionTitle } from '@/components/dashboard/DashboardPanel';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import { cn } from '@/lib/utils';
import { captureEvent } from '@/lib/analytics';
import { useFirstCustomerSprint } from '@/hooks/useFirstCustomerSprint';
import { usePlanAccess } from '@/hooks/usePlanAccess';

const MAX_ROWS = 4;
const WEEK_COLUMNS: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

interface TodayRow {
  id: string;
  title: string;
  done: boolean;
}

function TodayList({
  id,
  title,
  count,
  href,
  linkLabel,
  rows,
  alert,
  empty,
}: {
  id: string;
  title: string;
  count: string | null;
  href: string;
  linkLabel: string;
  rows: TodayRow[];
  alert?: ReactNode;
  empty: ReactNode;
}) {
  const shown = rows.slice(0, MAX_ROWS);
  const hidden = rows.length - shown.length;
  return (
    <div className="flex min-w-0 flex-col p-5 sm:p-6" aria-labelledby={id}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 id={id} className="text-sm font-semibold text-foreground">{title}</h3>
          {count ? <span className="text-sm tabular-nums text-muted-foreground">{count}</span> : null}
        </div>
        <Link to={href} className="text-sm font-medium text-primary hover:underline">{linkLabel}</Link>
      </div>
      {alert}
      {shown.length ? (
        <ul className="-mx-2 space-y-0.5">
          {shown.map((row) => (
            <li key={row.id}>
              <Link
                to={href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60"
              >
                {row.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                )}
                <span className={cn('min-w-0 truncate', row.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                  {row.title}
                </span>
                <span className="sr-only">{row.done ? ', done' : ', to do'}</span>
              </Link>
            </li>
          ))}
          {hidden > 0 ? (
            <li className="px-2 pt-1 text-xs text-muted-foreground">+{hidden} more</li>
          ) : null}
        </ul>
      ) : empty}
    </div>
  );
}

function WeekStat({ label, value, detail, progress, to }: { label: string; value: string; detail?: ReactNode; progress?: number; to?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-space-grotesk text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {typeof progress === 'number' ? <Progress value={progress} className="mt-3 h-1" /> : null}
      {detail ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</div> : null}
    </>
  );
  return to ? (
    <Link to={to} className="block min-w-0 p-5 transition-colors hover:bg-muted/40 sm:p-6">{body}</Link>
  ) : (
    <div className="min-w-0 p-5 sm:p-6">{body}</div>
  );
}

function ActiveDays({ active, goal }: { active: number; goal: number }) {
  const total = Math.max(goal, 1);
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={cn('h-1.5 w-5 rounded-full', index < active ? 'bg-primary' : 'bg-muted')} />
      ))}
    </span>
  );
}

/**
 * The top of the Progress Tracker: the one next step, today's list and the
 * week so far. Renders only from the dashboard snapshot; the Tasks and
 * Routine tabs own the writes.
 */
export default function DashboardTodaySnapshot() {
  const { snapshot, primaryAction, isLoading, isOffline, isStale } = useDashboardData();
  const firstCustomerProof = useFirstCustomerSprint();
  const proofAccess = usePlanAccess('first_customer_proof');
  const actionTool = primaryAction ? getDashboardTool(primaryAction.toolKey) : null;
  const actionRoute = primaryAction?.actionUrl || actionTool?.route || null;
  const routine = snapshot?.focus.routine;
  const dueToday = snapshot?.focus.dueToday.filter((task) => !task.completed) ?? [];
  const overdueCount = snapshot?.focus.overdueCount ?? 0;
  const dailyMission = snapshot?.focus.dailyMission ?? null;
  const weeklyMission = snapshot?.focus.weeklyMission ?? null;
  const engagement = snapshot && snapshot.version !== 1 ? snapshot.engagement : null;
  const proofSprint = firstCustomerProof.snapshot?.sprint ?? null;
  const proofEvidence = firstCustomerProof.snapshot?.evidence ?? { attachedProspects: 0, contactedProspects: 0, replies: 0, conversations: 0, commitments: 0, payments: 0 };
  const showCustomerProof = proofAccess.hasAccess && proofSprint?.status !== 'completed';
  const proofNextAction = proofEvidence.attachedProspects < 10
    ? `Build the prospect list (${proofEvidence.attachedProspects}/10)`
    : proofEvidence.contactedProspects < 10
      ? `Send and record outreach (${proofEvidence.contactedProspects}/10)`
      : 'Record the buyer-evidence decision';

  if (isLoading) {
    return (
      <div className="mb-10 space-y-8">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  const routineRows: TodayRow[] = routine?.items.map((item) => ({ id: item.id, title: item.title, done: item.completed })) ?? [];
  const taskRows: TodayRow[] = dueToday.map((task) => ({ id: task.id, title: task.title, done: false }));

  return (
    <div className="mb-10 space-y-10">
      <section aria-labelledby="dashboard-primary-action" className={cn(DASHBOARD_CARD, 'p-6 sm:p-8')}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p id="dashboard-primary-action" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              <span>Next step{primaryAction ? <span className="tabular-nums"> · about {primaryAction.estimatedMinutes} min</span> : null}</span>
            </p>
            <h2 className="mt-3 text-balance font-space-grotesk text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {primaryAction?.title ?? 'Plan one useful move for today'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {primaryAction?.description ?? 'Add a task, a routine or a saved result and your next step will show here.'}
            </p>
            {isOffline || isStale ? (
              <p className="mt-2 text-xs text-warning">
                {isOffline ? 'You are offline. Showing your last saved priorities.' : 'Refreshing your latest progress…'}
              </p>
            ) : null}
          </div>
          {actionRoute ? (
            <Button asChild className="shrink-0 px-5">
              <Link to={actionRoute} onClick={() => captureEvent('dashboard_primary_action_opened', { tool_key: primaryAction?.toolKey ?? null })}>
                Continue in {actionTool?.label ?? 'platform'}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>

        {showCustomerProof ? (
          <div className="mt-6 flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="first-customer-proof">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">First Customer Proof · Stage V: GTM</p>
              <h3 id="first-customer-proof" className="mt-1 text-sm font-semibold text-foreground">{proofNextAction}</h3>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {proofEvidence.attachedProspects}/10 qualified prospects · {proofEvidence.contactedProspects}/10 founder-sent messages · {proofEvidence.replies + proofEvidence.conversations + proofEvidence.commitments + proofEvidence.payments} buyer signals
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/go-to-market?workspace=first-customer-proof">
                {proofSprint ? 'Continue proof' : 'Start proof'}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="dashboard-today-title">
        <DashboardSectionTitle id="dashboard-today-title" title="Today" />
        <div className={cn(DASHBOARD_CARD, 'overflow-hidden')}>
          {dailyMission ? (
            <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Today's mission</p>
                <p className={cn('mt-1 text-sm font-medium', dailyMission.completed ? 'text-muted-foreground line-through' : 'text-foreground')}>
                  {dailyMission.title}
                </p>
              </div>
              {dailyMission.completed ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />Done
                </span>
              ) : (
                <Link to="/dashboard/routine" className="shrink-0 text-sm font-medium text-primary hover:underline">Open routine</Link>
              )}
            </div>
          ) : null}
          <div className="grid divide-y divide-border/60 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <TodayList
              id="dashboard-routine-title"
              title="Routine"
              count={routine?.total ? `${routine.completed} of ${routine.total} done` : null}
              href="/dashboard/routine"
              linkLabel="View all"
              rows={routineRows}
              empty={
                <p className="text-sm text-muted-foreground">
                  No routine yet. <Link to="/dashboard/routine" className="font-medium text-primary hover:underline">Set one up</Link>
                </p>
              }
            />
            <TodayList
              id="dashboard-due-title"
              title="Due today"
              count={dueToday.length ? String(dueToday.length) : null}
              href="/dashboard/tasks"
              linkLabel="View all"
              rows={taskRows}
              alert={overdueCount ? (
                <Link
                  to="/dashboard/tasks"
                  className="-mx-2 mb-1 flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {overdueCount} overdue. Clear {overdueCount === 1 ? 'it' : 'them'} first.
                </Link>
              ) : null}
              empty={!overdueCount ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />Nothing due today.
                </p>
              ) : null}
            />
          </div>
        </div>
      </section>

      {weeklyMission || engagement ? (
        <section aria-labelledby="dashboard-week-title">
          <DashboardSectionTitle
            id="dashboard-week-title"
            title="This week"
            action={engagement?.nextReturnCue ? (
              <Link to={engagement.nextReturnCue.ctaUrl} className="font-medium text-primary hover:underline">
                Next check-in {new Date(engagement.nextReturnCue.scheduledFor).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Link>
            ) : null}
          />
          <div className={cn(DASHBOARD_CARD, 'grid divide-y divide-border/60 overflow-hidden sm:divide-x sm:divide-y-0', WEEK_COLUMNS[(weeklyMission ? 1 : 0) + (engagement ? 2 : 0)])}>
            {weeklyMission ? (
              <WeekStat
                label="Weekly commitment"
                value={`${Math.round(weeklyMission.progress)}%`}
                progress={weeklyMission.progress}
                detail={<span className="line-clamp-2">{weeklyMission.title}</span>}
                to="/dashboard/routine"
              />
            ) : null}
            {engagement ? (
              <>
                <WeekStat
                  label="Active days"
                  value={`${engagement.activeDays7} of ${engagement.weeklyGoal}`}
                  detail={<div className="space-y-2"><ActiveDays active={engagement.activeDays7} goal={engagement.weeklyGoal} /><span className="block">Last 7 days</span></div>}
                />
                <WeekStat label="Meaningful actions" value={String(engagement.meaningfulActions7)} detail="Last 7 days" />
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
