import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';

import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { DashboardPanelHeader, MetricTile } from '@/components/dashboard/DashboardPanel';
import EnablePushCard from '@/components/dashboard/EnablePushCard';
import LiveWaitlistCard from '@/components/dashboard/LiveWaitlistCard';
import StarterDashboardNudge from '@/components/dashboard/StarterDashboardNudge';
import StartupHomeCommandCenter from '@/components/dashboard/StartupHomeCommandCenter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import { useDashboardAction } from '@/hooks/useDashboardAction';
import type { DashboardAction, DashboardMetric } from '@/types/dashboardSnapshot';
import { cn } from '@/lib/utils';
import { captureEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const STAGE_LABELS: Record<string, string> = {
  IDENTITY: 'Identity',
  PROTOTYPE: 'Prototype',
  VALIDATING: 'Validating',
  BUILDING: 'Building',
  LAUNCH: 'Launch',
  TRACTION: 'Traction',
  FUNDRAISING: 'Fundraising',
};

function ActionButton({ action, compact = false }: { action: DashboardAction; compact?: boolean }) {
  const navigate = useNavigate();
  const mutation = useDashboardAction();
  const tool = getDashboardTool(action.toolKey);
  const isOpen = action.actionKind === 'open_tool' || action.toolKey === 'find_cofounder';
  const actionLabel = isOpen
    ? `Open ${tool.label}`
    : action.actionKind === 'mark_conversation_read'
      ? 'Mark read'
      : 'Mark complete';

  return (
    <Button
      type="button"
      size={compact ? 'sm' : 'default'}
      className="min-h-11"
      disabled={mutation.isPending}
      onClick={() => {
        captureEvent('dashboard_primary_action_clicked', {
          action_key: action.key,
          action_kind: action.actionKind,
          tool_key: action.toolKey,
        });
        if (isOpen) {
          navigate(tool.route);
          return;
        }
        mutation.mutate({ action });
      }}
    >
      {mutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : isOpen ? <ArrowRight className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
      {actionLabel}
    </Button>
  );
}

function FocusNow({ action }: { action: DashboardAction }) {
  const mutation = useDashboardAction();
  const focusRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = focusRef.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const canFeedback = action.kind === 'task' || action.kind === 'recommendation';
  const feedbackAction = (kind: 'snooze_recommendation' | 'dismiss_recommendation'): DashboardAction => ({
    ...action,
    actionKind: kind,
  });

  return (
    <>
      <Card ref={focusRef} className="overflow-hidden border-primary/30 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_45%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card))_65%)] shadow-md">
        <CardContent className="p-5 sm:p-7">
          <DashboardPanelHeader
            as="h1"
            size="page"
            kicker="Focus now"
            title={action.title}
            description={action.description ?? 'Finish one meaningful action before opening new work.'}
            badges={
              <>
                <Badge variant={action.urgency === 'high' ? 'destructive' : 'secondary'}>{action.urgency} priority</Badge>
                <Badge variant="outline"><Clock3 className="mr-1 h-3.5 w-3.5" />{action.estimatedMinutes} min</Badge>
              </>
            }
            action={<ActionButton action={action} />}
          />
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
            <p className="mr-auto text-xs text-muted-foreground">
              Why this: {action.reasonCodes.map((reason) => reason.replaceAll('_', ' ')).join(' · ')}
            </p>
            {canFeedback ? (
              <>
                <Button type="button" variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: feedbackAction('snooze_recommendation') })}>
                  Remind me later
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: feedbackAction('dismiss_recommendation') })}>
                  Not relevant
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!visible ? (
        <div className="fixed inset-x-3 bottom-20 z-40 sm:hidden">
          <div className="rounded-xl border border-primary/30 bg-background/95 p-2 shadow-xl backdrop-blur-md">
            <ActionButton action={action} compact />
          </div>
        </div>
      ) : null}
    </>
  );
}

function WaitingOnPeople() {
  const { snapshot } = useDashboardData();
  const mutation = useDashboardAction();
  if (!snapshot) return null;
  const { people } = snapshot;
  const hasPeople = people.unreadMessages > 0 || people.savedMentors.length > 0 || people.upcomingBookings.length > 0 || people.activeCofounderPosts > 0;

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader
          kicker="Waiting on people"
          title={hasPeople ? 'Keep warm relationships moving.' : 'No human follow-ups are waiting.'}
          description="Replies, mentor relationships, and booked conversations outrank passive browsing."
          badges={people.unreadMessages > 0 ? <Badge variant="destructive">{people.unreadMessages} unread</Badge> : <Badge variant="outline">Clear</Badge>}
          action={<Button asChild variant="outline" size="sm"><Link to="/messages">Messages</Link></Button>}
        />

        {hasPeople ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {people.followUps.map((followUp) => (
              <div key={followUp.key} className="rounded-xl border border-border/60 bg-background/70 p-4">
                <MessageCircle className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{followUp.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{followUp.description}</p>
                <Button className="mt-3 min-h-11" size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: followUp })}>
                  Mark read
                </Button>
              </div>
            ))}
            {people.savedMentors.slice(0, 2).map((mentor) => (
              <div key={mentor.saveId} className="rounded-xl border border-border/60 bg-background/70 p-4">
                <Users className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{mentor.name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{mentor.expertise.slice(0, 2).join(' · ') || 'Saved mentor'}</p>
                <Button asChild className="mt-3 min-h-11" size="sm" variant="outline">
                  <Link to={`/mentorship/mentors/${mentor.mentorId}`}>Follow up</Link>
                </Button>
              </div>
            ))}
            {people.upcomingBookings.slice(0, 1).map((booking) => (
              <div key={booking.id} className="rounded-xl border border-border/60 bg-background/70 p-4">
                <CalendarCheck2 className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{booking.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(booking.scheduledAt).toLocaleString()}</p>
                <Button asChild className="mt-3 min-h-11" size="sm" variant="outline"><Link to="/my-bookings">View booking</Link></Button>
              </div>
            ))}
            {people.activeCofounderPosts > 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <Users className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">Your co-founder listing is active</p>
                <p className="mt-1 text-xs text-muted-foreground">Keep the listing current and respond quickly to promising founders.</p>
                <Button asChild className="mt-3 min-h-11" size="sm" variant="outline"><Link to="/co-founder">Open listing</Link></Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {!hasPeople && people.availableServices > 0 ? (
          <Button asChild className="mt-4" variant="outline"><Link to="/marketplace">Browse {people.availableServices} founder services</Link></Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TodayPanel() {
  const { snapshot } = useDashboardData();
  const mutation = useDashboardAction();
  if (!snapshot) return null;
  const { focus } = snapshot;

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader
          kicker="Today"
          title="Close today's loop."
          description="One-off deadlines and repeatable habits stay distinct, but visible together."
          badges={<><Badge variant="secondary">{focus.dueToday.length} due</Badge>{focus.overdueCount > 0 ? <Badge variant="destructive">{focus.overdueCount} overdue</Badge> : null}</>}
          action={<Button asChild variant="outline" size="sm"><Link to="/dashboard/tasks">Open calendar</Link></Button>}
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {focus.dailyMission || focus.weeklyMission ? (
            <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
              {focus.dailyMission ? (
                <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Daily mission</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm">{focus.dailyMission.title}</p>
                    {focus.dailyMission.completed ? <Badge variant="secondary">Done</Badge> : (
                      <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: {
                        key: `daily-mission:${focus.dailyMission?.id}`, kind: 'task', toolKey: 'dashboard', entityId: focus.dailyMission.id,
                        title: focus.dailyMission.title, description: null, urgency: 'high', reasonCodes: ['explicit_commitment'],
                        estimatedMinutes: 10, dueAt: null, actionKind: 'complete_daily_mission',
                      } })}>Mark done</Button>
                    )}
                  </div>
                </div>
              ) : null}
              {focus.weeklyMission ? (
                <Link to="/dashboard/routine" className="rounded-xl border border-border/60 bg-background/70 p-4 hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Weekly commitment</p><span className="text-sm font-medium">{Math.round(focus.weeklyMission.progress)}%</span></div>
                  <p className="mt-2 text-sm">{focus.weeklyMission.title}</p>
                  <Progress value={focus.weeklyMission.progress} className="mt-3 h-1.5" />
                </Link>
              ) : null}
            </div>
          ) : null}
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <p className="text-sm font-semibold">Tasks</p>
            <div className="mt-3 space-y-2">
              {focus.dueToday.slice(0, 4).map((task) => {
                const action: DashboardAction = {
                  key: `task:${task.id}`, kind: 'task', toolKey: task.sourceTool || 'tasks', entityId: task.id,
                  title: task.title, description: task.description, urgency: task.priority, reasonCodes: ['due_today'],
                  estimatedMinutes: 15, dueAt: task.deadlineAt, actionKind: 'complete_task',
                };
                return (
                  <button key={task.id} type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ action })} className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border/50 px-3 py-2 text-left hover:border-primary/40">
                    <span className="h-4 w-4 rounded-full border border-muted-foreground/50" />
                    <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                  </button>
                );
              })}
              {focus.dueToday.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due today.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Routine</p>
              <span className="text-xs text-muted-foreground">{focus.routine.completed}/{focus.routine.total}</span>
            </div>
            <Progress value={focus.routine.total ? focus.routine.completed / focus.routine.total * 100 : 0} className="mt-2 h-1.5" />
            <div className="mt-3 space-y-2">
              {focus.routine.items.filter((item) => !item.completed).slice(0, 3).map((item) => {
                const action: DashboardAction = {
                  key: `routine:${item.id}`, kind: 'task', toolKey: 'routine', entityId: item.id,
                  title: item.title, description: null, urgency: 'medium', reasonCodes: ['explicit_commitment'],
                  estimatedMinutes: 10, dueAt: null, actionKind: 'complete_routine_item',
                };
                return (
                  <button key={item.id} type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ action, payload: { routineTitle: item.title } })} className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border/50 px-3 py-2 text-left hover:border-primary/40">
                    <span className="h-4 w-4 rounded-full border border-muted-foreground/50" />
                    <span className="text-sm">{item.title}</span>
                  </button>
                );
              })}
              {!focus.routine.configured ? <Button asChild size="sm" variant="outline"><Link to="/dashboard/routine">Build my routine</Link></Button> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessPulse() {
  const { snapshot } = useDashboardData();
  if (!snapshot) return null;
  const { business } = snapshot;
  const metrics: DashboardMetric[] = [
    business.tractionScore == null ? null : { id: 'traction', label: 'Traction score', value: business.tractionScore, unit: 'score', trend: business.tractionDelta, updatedAt: snapshot.generatedAt },
    business.pmfScore == null ? null : { id: 'pmf', label: 'PMF score', value: business.pmfScore, unit: 'score', updatedAt: snapshot.generatedAt },
    { id: 'signups', label: 'Demand signups', value: business.demoSignups + business.waitlistSignups, unit: 'signups', updatedAt: snapshot.generatedAt },
    { id: 'published', label: 'Published products', value: business.publishedProducts, unit: 'live', updatedAt: snapshot.generatedAt },
    business.revenue,
    ...business.kpis,
  ].filter((metric): metric is DashboardMetric => Boolean(metric)).slice(0, 4);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader kicker="Business pulse" title="Signals that change the next decision." description="Only the most relevant current metrics appear here." action={<Button asChild variant="outline" size="sm"><Link to="/core-metrics">Update metrics</Link></Button>} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricTile key={metric.id} label={metric.label} value={metric.value} hint={metric.unit ?? undefined} delta={typeof metric.trend === 'number' ? { direction: metric.trend > 0 ? 'up' : metric.trend < 0 ? 'down' : 'flat', label: `${metric.trend > 0 ? '+' : ''}${metric.trend}` } : undefined} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function JourneyPanel() {
  const { snapshot } = useDashboardData();
  if (!snapshot) return null;
  const { journey } = snapshot;

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader kicker="Startup journey" title="Progress backed by real tool outputs." description="Stages and tools share the same server snapshot, so completion cannot drift between cards." badges={<Badge variant="secondary">{journey.progressPercent}%</Badge>} />
        <Progress value={journey.progressPercent} className="mt-4 h-1.5" />
        <div className="mt-5 flex snap-x gap-2 overflow-x-auto pb-2">
          {journey.stages.map((stage) => (
            <div key={stage.key} className={cn('min-w-28 snap-start rounded-xl border p-3 text-center', stage.current ? 'border-primary/50 bg-primary/10' : 'border-border/60 bg-background/70')}>
              {stage.complete ? <CheckCircle2 className="mx-auto h-5 w-5 text-success" /> : <span className="mx-auto block h-5 w-5 rounded-full border border-muted-foreground/40" />}
              <p className="mt-2 text-xs font-medium">{STAGE_LABELS[stage.key] ?? stage.key}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {journey.tools.map((signal) => {
            const tool = getDashboardTool(signal.key);
            const Icon = tool.icon;
            return (
              <Link key={signal.key} to={tool.route} className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 hover:border-primary/40">
                <Icon className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{tool.label}</span>
                <Badge variant={signal.status === 'done' ? 'secondary' : 'outline'}>{signal.status.replace('_', ' ')}</Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentWork() {
  const { snapshot } = useDashboardData();
  if (!snapshot) return null;
  const { workspace } = snapshot;

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader kicker="Recent work" title="Pick up without searching." description="Artifacts and meaningful platform activity stay connected to the work that created them." action={<Button asChild variant="outline" size="sm"><Link to="/dashboard/files">All files</Link></Button>} />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {workspace.recentArtifacts.slice(0, 4).map((artifact) => (
              <Link key={artifact.id} to="/dashboard/files" className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 hover:border-primary/40">
                <FileText className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{artifact.title}</span><span className="block truncate text-xs text-muted-foreground">{artifact.summary}</span></span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
            {workspace.recentArtifacts.length === 0 ? <p className="text-sm text-muted-foreground">Your saved outputs will appear here.</p> : null}
          </div>
          <div className="space-y-2">
            {workspace.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
                <Activity className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{activity.type.replaceAll('_', ' ')}</span>
                <span className="text-xs text-muted-foreground">{new Date(activity.occurredAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExecutionDashboardHome() {
  const { snapshot, primaryAction, isLoading, isFetching, isStale, isOffline, error, refresh } = useDashboardData();
  const { user } = useAuth();
  const shownActionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!primaryAction || shownActionRef.current === primaryAction.key) return;
    shownActionRef.current = primaryAction.key;
    captureEvent('dashboard_primary_action_shown', {
      action_key: primaryAction.key,
      action_kind: primaryAction.actionKind,
      tool_key: primaryAction.toolKey,
      urgency: primaryAction.urgency,
    });
    if (user?.id && (primaryAction.kind === 'recommendation' || primaryAction.kind === 'task')) {
      void supabase.from('task_recommendation_events').insert({
        user_id: user.id,
        task_id: primaryAction.kind === 'task' ? primaryAction.entityId : null,
        recommendation_key: primaryAction.key,
        event_type: 'seen',
        metadata: { source: 'dashboard_v2', tool_key: primaryAction.toolKey },
      });
    }
  }, [primaryAction, user?.id]);

  if (isLoading && !snapshot) {
    return <div className="space-y-5"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  if (error || !snapshot || !primaryAction) {
    return (
      <Card className="border-destructive/30 bg-card/70"><CardContent className="p-6 text-center"><Sparkles className="mx-auto h-8 w-8 text-primary" /><h1 className="mt-3 text-xl font-semibold">Your command center needs a refresh.</h1><p className="mt-2 text-sm text-muted-foreground">The rest of the platform is still available while the consolidated snapshot reconnects.</p><Button className="mt-4" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>
    );
  }

  return (
    <div className="space-y-5">
      {isOffline || (isStale && !isFetching) || isFetching ? (
        <div role="status" aria-live="polite" className="rounded-lg border border-border/60 bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {isOffline ? 'You are offline. Showing the latest saved dashboard snapshot.' : isFetching ? 'Refreshing your dashboard…' : 'This snapshot may be out of date. Reconnect or refresh to update it.'}
        </div>
      ) : null}
      <FocusNow action={primaryAction} />
      <WaitingOnPeople />
      <TodayPanel />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <JourneyPanel />
        <BusinessPulse />
      </div>
      <RecentWork />
      <DashboardDisclosure title="More founder signals" summary="Startup profile, growth prompts, notifications, and setup controls stay available without competing with today's work.">
        <div className="space-y-5">
          <LiveWaitlistCard />
          <EnablePushCard />
          <StartupHomeCommandCenter />
          <StarterDashboardNudge />
        </div>
      </DashboardDisclosure>
    </div>
  );
}
