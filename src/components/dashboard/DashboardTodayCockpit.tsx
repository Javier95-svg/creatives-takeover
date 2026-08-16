import { useContext, useEffect, useMemo, useRef } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPanelHeader, MetricTile } from '@/components/dashboard/DashboardPanel';
import { DashboardMetricsContext } from '@/components/dashboard/TaskCountContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyMission } from '@/hooks/useDailyMission';
import { useRoutine } from '@/hooks/useRoutine';
import { useTaskCalendarEngine } from '@/hooks/useTaskCalendarEngine';
import { getCompletionKey, getLocalDateKey, type RoutineTask } from '@/lib/routineTemplates';
import { getTaskRuntimeStatus, shouldShowAsDailyCommand, toDateKey, type CalendarTaskRow } from '@/lib/taskCalendar';
import { RecommendationFeedback } from '@/components/dashboard/RecommendationFeedback';
import { useDashboardFocus } from '@/contexts/DashboardDataContext';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import { useCreditQuote } from '@/hooks/useCreditQuote';
import type { CreditFeature } from '@/config/constants';
import { cn } from '@/lib/utils';
import { recordMeaningfulAction } from '@/lib/engagementSession';
import { captureEvent } from '@/lib/analytics';
import { recordRecommendationOutcome } from '@/lib/recommendationLearning';
import { rememberSocialRecommendation } from '@/lib/socialInteractionAnalytics';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';

const CREDIT_FEATURE_BY_TOOL: Partial<Record<string, CreditFeature>> = {
  demo_studio: 'WAITLIST_GENERATION',
  waitlist_maker: 'WAITLIST_GENERATION',
  pmf_lab: 'PMF_ANALYSIS',
  mvp_builder: 'APP_BUILDER_GENERATE',
  tech_stack: 'TECH_STACK_GENERATION',
  gtm_strategist: 'GTM_ANALYSIS',
  traction_engine: 'TRACTION_ENGINE_SCORECARD',
  pitch_deck_analyzer: 'PITCH_DECK_ANALYZER',
  decision_sprint: 'SPRINT_TASK_GENERATION',
  insighta_test: 'FUNDRAISING_READINESS_ANALYSIS',
};

function getFirstName(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'founder';
  return trimmed.split(/\s+/)[0];
}

export default function DashboardTodayCockpit() {
  const { user } = useAuth();
  const routine = useRoutine();
  const dailyMission = useDailyMission();
  const socialRecommendationsFlag = useFeatureFlagEnabled('dashboard-social-recommendations');
  const { snapshot, primaryAction, isOffline, isStale } = useDashboardFocus();
  const primaryTool = primaryAction ? getDashboardTool(primaryAction.toolKey) : null;
  const primaryRoute = primaryAction?.actionUrl || primaryTool?.route || null;
  const primaryInteraction = primaryAction?.interaction ?? null;
  const creditFeature = primaryAction ? CREDIT_FEATURE_BY_TOOL[primaryAction.toolKey] ?? null : null;
  const creditQuote = useCreditQuote(creditFeature, {
    source: 'dashboard_primary_action',
    enabled: Boolean(primaryAction && creditFeature),
  });
  const {
    completeTask,
    groupedTasks,
    isLoading: tasksLoading,
  } = useTaskCalendarEngine();

  const firstName = getFirstName(
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? user?.email,
  );
  const todayKey = toDateKey(new Date());

  const deadlineToday = useMemo<CalendarTaskRow[]>(
    () => (groupedTasks[todayKey] ?? []).filter((task) => !task.is_completed && shouldShowAsDailyCommand(task, todayKey)),
    [groupedTasks, todayKey],
  );

  const overdueTasks = useMemo<CalendarTaskRow[]>(
    () =>
      Object.values(groupedTasks)
        .flat()
        .filter((task) => getTaskRuntimeStatus(task) === 'overdue' && shouldShowAsDailyCommand(task, todayKey)),
    [groupedTasks, todayKey],
  );

  const routineToday = useMemo<RoutineTask[]>(() => {
    const dayKey = getLocalDateKey();
    return routine.todayTasks.filter((task) => {
      const completion = routine.completionByKey.get(getCompletionKey(task.id, 'daily', dayKey));
      return completion?.status !== 'completed';
    });
  }, [routine.completionByKey, routine.todayTasks]);

  const loading = routine.isLoading || tasksLoading;
  const streak = routine.stats.dailyStreak;
  const progress = routine.stats.progressPercentage;
  const completedCount = routine.stats.completedCurrentCount;
  const totalCount = routine.stats.totalCurrentCount;
  const hasAnythingPlanned = Boolean(routine.config) || Object.values(groupedTasks).some((tasks) => tasks.length > 0);

  const weekly = useContext(DashboardMetricsContext);
  const completedLast7 = routine.stats.completedLast7 ?? 0;
  const completedPrev7 = routine.stats.completedPrev7 ?? 0;
  const routineMomentumVisible = completedLast7 > 0 || completedPrev7 > 0;
  const weekDelta = completedLast7 - completedPrev7;
  const routineDelta = routineMomentumVisible
    ? {
        direction: weekDelta > 0 ? ('up' as const) : weekDelta < 0 ? ('down' as const) : ('flat' as const),
        label: `${weekDelta >= 0 ? '+' : ''}${weekDelta} vs prior week`,
      }
    : null;
  const showWeeklyRow =
    weekly.weeklyMissionProgress != null || weekly.totalTasksThisWeek > 0 || routineMomentumVisible;
  const engagementPlan = snapshot?.entitlements.plan
    ?? (typeof user?.user_metadata?.subscription_tier === 'string' ? user.user_metadata.subscription_tier : 'unknown');
  const engagementDays = user
    ? Math.max(0, Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000))
    : 0;
  const shownSocialKey = useRef<string | null>(null);
  const socialSnapshot = socialRecommendationsFlag === true && snapshot?.version === 3 ? snapshot.social : null;

  useEffect(() => {
    if (!primaryAction?.interaction || shownSocialKey.current === primaryAction.key) return;
    shownSocialKey.current = primaryAction.key;
    captureEvent('social_recommendation_shown', {
      recommendation_key: primaryAction.key,
      interaction_type: primaryAction.interaction.type,
      counterparty_type: primaryAction.interaction.counterpartyType,
      source: 'dashboard_primary_action',
      surface: 'command_center',
      section: 'dashboard',
      plan: engagementPlan,
      days_since_signup: engagementDays,
    });
  }, [engagementDays, engagementPlan, primaryAction]);

  const trackSocialClick = (action = primaryAction) => {
    if (!action?.interaction) return;
    rememberSocialRecommendation(action);
    captureEvent('social_recommendation_clicked', {
      recommendation_key: action.key,
      interaction_type: action.interaction.type,
      counterparty_type: action.interaction.counterpartyType,
      source: 'dashboard',
      surface: 'command_center',
      section: 'dashboard',
      plan: engagementPlan,
      days_since_signup: engagementDays,
    });
    void recordRecommendationOutcome({
      recommendationKey: action.key,
      surface: 'command_center',
      outcomeType: 'opened',
      source: 'dashboard_social_recommendation',
    }).catch(() => undefined);
  };

  if (loading) {
    return <Skeleton className="mb-6 h-64 rounded-xl" />;
  }

  return (
    <Card className="mb-6 overflow-hidden border-primary/25 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_42%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card))_62%)] shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader
          as="h1"
          size="page"
          kicker="Today"
          title={`Welcome back, ${firstName}.`}
          description="Close today's loop before anything else competes for your attention."
          action={
            <>
              <Badge variant="secondary">
                {streak} {streak === 1 ? 'day' : 'days'} streak
              </Badge>
              <Badge variant="outline">
                {completedCount}/{totalCount} routine
              </Badge>
              <Badge variant={overdueTasks.length > 0 ? 'destructive' : 'outline'}>
                {overdueTasks.length} overdue
              </Badge>
            </>
          }
        />

        <section
          className="mt-5 rounded-2xl border border-primary/30 bg-background/80 p-4 shadow-sm sm:p-5"
          aria-labelledby="dashboard-primary-action"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p id="dashboard-primary-action" className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Do this next
                </p>
                {primaryInteraction ? <Badge variant="secondary">Connect with a person</Badge> : null}
                {primaryAction ? <Badge variant="outline">About {primaryAction.estimatedMinutes} min</Badge> : null}
                {creditFeature ? (
                  <Badge variant={creditQuote.data?.affordable === false ? 'destructive' : 'secondary'}>
                    {creditQuote.isLoading
                      ? 'Checking credits…'
                      : creditQuote.data?.giftApplied
                        ? 'First use free'
                        : `${creditQuote.data?.cost ?? 0} credits`}
                  </Badge>
                ) : <Badge variant="secondary">Free</Badge>}
              </div>
              <div className="mt-2 flex items-center gap-3">
                {primaryInteraction ? (
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={primaryInteraction.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback>{primaryInteraction.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : null}
                <h2 className="text-lg font-semibold text-foreground">
                  {primaryAction?.title ?? 'Plan one useful move for today'}
                </h2>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {primaryAction?.description
                  ?? 'Your command center will prioritize the next action as soon as you add a task, routine, or startup artifact.'}
              </p>
              {creditQuote.data ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {creditQuote.data.affordable
                    ? `${creditQuote.data.balanceAfter} credits remain after this action${creditQuote.data.coveredNextActions > 0 ? `, enough for ${creditQuote.data.coveredNextActions} likely next action${creditQuote.data.coveredNextActions === 1 ? '' : 's'}` : ''}.`
                    : `You need ${creditQuote.data.cost - creditQuote.data.available} more credits. A ${creditQuote.data.recommendedPurchase === 'top_up' ? 'top-up' : 'plan'} is the best fit.`}
                </p>
              ) : null}
              {isOffline || isStale ? (
                <p className="mt-2 text-xs text-warning">
                  {isOffline ? 'You are offline. Showing your last saved priorities.' : 'Refreshing your latest progress…'}
                </p>
              ) : null}
            </div>
            <Button
              asChild={Boolean(primaryAction && primaryRoute)}
              disabled={creditQuote.data?.affordable === false}
              className="shrink-0"
            >
              {primaryAction && primaryRoute ? (
                <Link to={primaryRoute} onClick={() => trackSocialClick(primaryAction)}>
                  {primaryInteraction?.ctaLabel ?? `Continue in ${primaryTool?.label ?? 'platform'}`}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              ) : (
                <span>Ready when you are</span>
              )}
            </Button>
          </div>
          {primaryAction ? (
            <RecommendationFeedback
              surface="command_center"
              recommendationKey={primaryAction.key}
              metadata={{ recommendation_family: primaryAction.toolKey }}
            />
          ) : null}
          {snapshot && snapshot.focus.secondaryActions.length > 0 ? (
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Then, if you have time</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {snapshot.focus.secondaryActions.slice(0, 3).map((action) => {
                  const tool = getDashboardTool(action.toolKey);
                  return (
                    <Link
                      key={action.key}
                      to={action.actionUrl || tool.route}
                      onClick={() => trackSocialClick(action)}
                      className={cn(
                        'rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm transition-colors',
                        'hover:border-primary/35 hover:bg-primary/[0.04]',
                      )}
                    >
                      <span className="block truncate font-medium text-foreground">{action.title}</span>
                      <span className="text-xs text-muted-foreground">{action.interaction?.ctaLabel ?? tool.label} · {action.estimatedMinutes} min</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {socialSnapshot ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Relationship momentum this week">
            <MetricTile label="Interactions" value={socialSnapshot.completedInteractions7} />
            <MetricTile label="People reached" value={socialSnapshot.uniquePeople7} />
            <MetricTile label="Replies sent" value={socialSnapshot.repliesSent7} />
            <MetricTile label="Replies received" value={socialSnapshot.repliesReceived7} />
          </div>
        ) : null}

        {totalCount > 0 ? (
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Routine progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : null}

        {dailyMission.mission ? (
          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-label font-semibold uppercase tracking-[0.16em] text-primary/80">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  Daily mission
                </p>
                <p className="mt-1.5 text-sm leading-6 text-foreground">
                  {dailyMission.mission.mission_text}
                </p>
                <RecommendationFeedback
                  surface="daily_mission"
                  recommendationKey={`daily_mission:${dailyMission.mission.id}`}
                  metadata={{
                    mission_date: dailyMission.mission.mission_date,
                    stage: dailyMission.mission.stage,
                  }}
                />
              </div>
              {dailyMission.mission.completed ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success dark:text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Done
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => void dailyMission.markAsDone().then(() => recordMeaningfulAction({
                    actionType: 'task_completed',
                    section: 'dashboard',
                    plan: engagementPlan,
                    daysSinceSignup: engagementDays,
                    entityType: 'daily_mission',
                    entityId: dailyMission.mission?.id ?? null,
                  }))}
                  disabled={dailyMission.completing}
                >
                  {dailyMission.completing ? 'Saving...' : 'Mark done'}
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {!hasAnythingPlanned ? (
          <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-background/70 p-5 text-center">
            <Repeat2 className="mx-auto h-7 w-7 text-primary/60" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              Set up your founder routine to start building momentum
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              A simple daily and weekly rhythm is how startups actually get built.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/dashboard/routine">
                  Build my routine
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/tasks">Add a task</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Repeat2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  Today&apos;s habits
                </h2>
                <Link to="/dashboard/routine" className="text-xs font-medium text-primary hover:underline">
                  Routine
                </Link>
              </div>
              {routineToday.length > 0 ? (
                <ul className="space-y-1.5">
                  {routineToday.slice(0, 3).map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => void routine.setTaskStatus(task, 'daily', 'completed').then(() => recordMeaningfulAction({
                          actionType: 'routine_completed',
                          section: 'dashboard',
                          plan: engagementPlan,
                          daysSinceSignup: engagementDays,
                          entityType: 'routine_task',
                          entityId: task.id,
                        }))}
                        disabled={routine.isSaving}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                      >
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                        <span className="text-sm text-foreground">{task.task_text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2.5 text-sm text-success dark:text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  All habits done for today.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                  Due today
                </h2>
                <Link to="/dashboard/tasks" className="text-xs font-medium text-primary hover:underline">
                  Tasks
                </Link>
              </div>

              {overdueTasks.length > 0 ? (
                <Link
                  to="/dashboard/tasks"
                  className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 dark:text-destructive"
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {overdueTasks.length} overdue. Clear {overdueTasks.length === 1 ? 'it' : 'them'} first.
                </Link>
              ) : null}

              {deadlineToday.length > 0 ? (
                <ul className="space-y-1.5">
                  {deadlineToday.slice(0, 3).map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => void completeTask(task, true).then(() => recordMeaningfulAction({
                          actionType: 'task_completed',
                          section: 'dashboard',
                          plan: engagementPlan,
                          daysSinceSignup: engagementDays,
                          entityType: 'task',
                          entityId: task.id,
                        }))}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                      >
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                        <span className="text-sm text-foreground">{task.task_text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : overdueTasks.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  Nothing due today. Plan your next move.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {showWeeklyRow ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {weekly.weeklyMissionProgress != null ? (
              <MetricTile
                label="Weekly commitment"
                value={`${Math.round(weekly.weeklyMissionProgress)}%`}
                progress={weekly.weeklyMissionProgress}
                hint={weekly.weeklyMissionGoal ?? undefined}
                to="/dashboard/routine"
              />
            ) : null}
            {weekly.totalTasksThisWeek > 0 ? (
              <MetricTile
                label="Tasks this week"
                value={`${weekly.tasksCompletedThisWeek}/${weekly.totalTasksThisWeek}`}
                progress={(weekly.tasksCompletedThisWeek / weekly.totalTasksThisWeek) * 100}
                to="/dashboard/tasks"
              />
            ) : null}
            {routineMomentumVisible ? (
              <MetricTile
                label="Routine momentum"
                value={completedLast7}
                delta={routineDelta}
                hint="Routine actions, last 7 days"
                to="/dashboard/routine"
              />
            ) : null}
          </div>
        ) : null}
        {snapshot?.version === 2 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Weekly momentum</span>
            <Badge variant="outline">{snapshot.engagement.activeDays7}/{snapshot.engagement.weeklyGoal} active days</Badge>
            <Badge variant="outline">{snapshot.engagement.meaningfulActions7} meaningful actions</Badge>
            {snapshot.engagement.nextReturnCue ? (
              <Link to={snapshot.engagement.nextReturnCue.ctaUrl} className="ml-auto font-medium text-primary hover:underline">
                Next return {new Date(snapshot.engagement.nextReturnCue.scheduledFor).toLocaleDateString()}
              </Link>
            ) : (
              <Link to="/dashboard/routine" className="ml-auto font-medium text-primary hover:underline">
                Schedule your next check-in
              </Link>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
