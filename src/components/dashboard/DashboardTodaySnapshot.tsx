import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Repeat2,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPanelHeader, MetricTile } from '@/components/dashboard/DashboardPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardFocus } from '@/contexts/DashboardDataContext';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import { cn } from '@/lib/utils';
import { captureEvent } from '@/lib/analytics';

function firstName(value: string | null | undefined) {
  const name = value?.trim();
  return name ? name.split(/\s+/)[0] : 'founder';
}

/**
 * Command Center's above-the-fold accountability view. It renders exclusively
 * from the dashboard snapshot; detail tabs own the heavier task/routine writes.
 */
export default function DashboardTodaySnapshot() {
  const { user } = useAuth();
  const { snapshot, primaryAction, isLoading, isOffline, isStale } = useDashboardFocus();
  const actionTool = primaryAction ? getDashboardTool(primaryAction.toolKey) : null;
  const actionRoute = primaryAction?.actionUrl || actionTool?.route || null;
  const routine = snapshot?.focus.routine;
  const remainingRoutineItems = routine?.items.filter((item) => !item.completed) ?? [];
  const dueToday = snapshot?.focus.dueToday.filter((task) => !task.completed) ?? [];
  const overdueCount = snapshot?.focus.overdueCount ?? 0;
  const routineCompleted = routine?.completed ?? 0;
  const routineTotal = routine?.total ?? 0;
  const routineProgress = routineTotal > 0 ? Math.round((routineCompleted / routineTotal) * 100) : 0;
  const dailyMission = snapshot?.focus.dailyMission ?? null;
  const weeklyMission = snapshot?.focus.weeklyMission ?? null;

  if (isLoading) return <Skeleton className="mb-6 h-64 rounded-xl" />;

  return (
    <Card className="mb-6 overflow-hidden border-primary/25 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_42%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card))_62%)] shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader
          as="h1"
          size="page"
          kicker="Today"
          title={`Welcome back, ${firstName((user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? user?.email)}.`}
          description="Close today's loop before anything else competes for your attention."
          action={<><Badge variant="secondary">{routineCompleted}/{routineTotal} routine</Badge><Badge variant={overdueCount ? 'destructive' : 'outline'}>{overdueCount} overdue</Badge></>}
        />

        <section className="mt-5 rounded-2xl border border-primary/30 bg-background/80 p-4 shadow-sm sm:p-5" aria-labelledby="dashboard-primary-action">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p id="dashboard-primary-action" className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Do this next</p>{primaryAction ? <Badge variant="outline">About {primaryAction.estimatedMinutes} min</Badge> : null}</div>
              <h2 className="mt-2 text-lg font-semibold text-foreground">{primaryAction?.title ?? 'Plan one useful move for today'}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{primaryAction?.description ?? 'Your Progress Tracker will prioritize the next action as soon as you add a task, routine, or startup artifact.'}</p>
              {isOffline || isStale ? <p className="mt-2 text-xs text-warning">{isOffline ? 'You are offline. Showing your last saved priorities.' : 'Refreshing your latest progress…'}</p> : null}
            </div>
            <Button asChild={Boolean(actionRoute)} disabled={!actionRoute} className="shrink-0">
              {actionRoute ? <Link to={actionRoute} onClick={() => captureEvent('dashboard_primary_action_opened', { tool_key: primaryAction?.toolKey ?? null })}>Continue in {actionTool?.label ?? 'platform'}<ArrowRight className="ml-1.5 h-4 w-4" /></Link> : <span>Ready when you are</span>}
            </Button>
          </div>
        </section>

        {dailyMission ? <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.06] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-1.5 text-label font-semibold uppercase tracking-[0.16em] text-primary/80"><Zap className="h-3.5 w-3.5" />Daily mission</p><p className="mt-1.5 text-sm leading-6 text-foreground">{dailyMission.title}</p></div>{dailyMission.completed ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3.5 w-3.5" />Done</span> : <Button asChild size="sm" variant="outline"><Link to="/dashboard/routine">Open routine</Link></Button>}</div></div> : null}

        {routineTotal > 0 ? <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Routine progress</span><span className="font-medium text-foreground">{routineProgress}%</span></div><Progress value={routineProgress} className="h-2" /></div> : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/70 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><Repeat2 className="h-4 w-4 text-primary" />Today's habits</h2><Link to="/dashboard/routine" className="text-xs font-medium text-primary hover:underline">Routine</Link></div>{remainingRoutineItems.length ? <ul className="space-y-1.5">{remainingRoutineItems.slice(0, 3).map((item) => <li key={item.id}><Link to="/dashboard/routine" className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-sm hover:border-primary/40"><Circle className="h-4 w-4 text-muted-foreground/60" />{item.title}</Link></li>)}</ul> : <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />All habits done for today.</p>}</div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-primary" />Due today</h2><Link to="/dashboard/tasks" className="text-xs font-medium text-primary hover:underline">Tasks</Link></div>{overdueCount ? <Link to="/dashboard/tasks" className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"><AlertTriangle className="h-4 w-4" />{overdueCount} overdue. Clear them first.</Link> : null}{dueToday.length ? <ul className="space-y-1.5">{dueToday.slice(0, 3).map((task) => <li key={task.id}><Link to="/dashboard/tasks" className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-sm hover:border-primary/40"><Circle className="h-4 w-4 text-muted-foreground/60" />{task.title}</Link></li>)}</ul> : !overdueCount ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" />Nothing due today.</p> : null}</div>
        </div>

        {weeklyMission ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><MetricTile label="Weekly commitment" value={`${Math.round(weeklyMission.progress)}%`} progress={weeklyMission.progress} hint={weeklyMission.title} to="/dashboard/routine" /></div> : null}
        {snapshot && snapshot.version !== 1 ? <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Weekly momentum</span><Badge variant="outline">{snapshot.engagement.activeDays7}/{snapshot.engagement.weeklyGoal} active days</Badge><Badge variant="outline">{snapshot.engagement.meaningfulActions7} meaningful actions</Badge>{snapshot.engagement.nextReturnCue ? <Link to={snapshot.engagement.nextReturnCue.ctaUrl} className={cn('ml-auto font-medium text-primary hover:underline')}>Next return {new Date(snapshot.engagement.nextReturnCue.scheduledFor).toLocaleDateString()}</Link> : null}</div> : null}
      </CardContent>
    </Card>
  );
}
