import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Flame,
  ListChecks,
  Repeat2,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyMission } from "@/hooks/useDailyMission";
import { useRoutine } from "@/hooks/useRoutine";
import { useTaskCalendarEngine } from "@/hooks/useTaskCalendarEngine";
import { getTaskRuntimeStatus, toDateKey, type CalendarTaskRow } from "@/lib/taskCalendar";
import { getCompletionKey, getLocalDateKey, type RoutineTask } from "@/lib/routineTemplates";
import { cn } from "@/lib/utils";

function getFirstName(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "founder";
  return trimmed.split(/\s+/)[0];
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  accent?: "default" | "amber" | "rose" | "emerald";
}) {
  const accentClass =
    accent === "amber"
      ? "text-warning"
      : accent === "rose"
        ? "text-destructive"
        : accent === "emerald"
          ? "text-success"
          : "text-primary";
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-label font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", accentClass)} aria-hidden="true" />
        {label}
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function DashboardTodayCockpit() {
  const { user } = useAuth();
  const routine = useRoutine();
  const dailyMission = useDailyMission();
  const {
    groupedTasks,
    completeTask,
    isLoading: tasksLoading,
  } = useTaskCalendarEngine();

  const firstName = getFirstName(
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? user?.email,
  );

  const todayKey = toDateKey(new Date());

  const deadlineToday = useMemo<CalendarTaskRow[]>(
    () => (groupedTasks[todayKey] ?? []).filter((task) => !task.is_completed),
    [groupedTasks, todayKey],
  );

  const overdueTasks = useMemo<CalendarTaskRow[]>(
    () =>
      Object.values(groupedTasks)
        .flat()
        .filter((task) => getTaskRuntimeStatus(task) === "overdue"),
    [groupedTasks],
  );

  const routineToday = useMemo<RoutineTask[]>(() => {
    const dayKey = getLocalDateKey();
    return routine.todayTasks.filter((task) => {
      const completion = routine.completionByKey.get(getCompletionKey(task.id, "daily", dayKey));
      return completion?.status !== "completed";
    });
  }, [routine.completionByKey, routine.todayTasks]);

  const loading = routine.isLoading || tasksLoading;

  const streak = routine.stats.dailyStreak;
  const progress = routine.stats.progressPercentage;
  const completedCount = routine.stats.completedCurrentCount;
  const totalCount = routine.stats.totalCurrentCount;

  const hasAnythingPlanned =
    Boolean(routine.config) ||
    Object.values(groupedTasks).some((tasks) => tasks.length > 0);

  if (loading) {
    return <Skeleton className="mb-6 h-64 rounded-2xl" />;
  }

  return (
    <Card className="mb-6 overflow-hidden border-primary/25 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_42%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card))_62%)] shadow-sm">
      <CardContent className="p-5 sm:p-6">
        {/* Header: greeting + streak + progress */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-label font-semibold uppercase tracking-[0.18em] text-primary/80">
              Today
            </p>
            <h1 className="font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {firstName}.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Consistency compounds. Close today&apos;s loop before anything else competes for your attention.
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
            <StatTile
              icon={Flame}
              label="Streak"
              value={`${streak} ${streak === 1 ? "day" : "days"}`}
              accent="amber"
            />
            <StatTile
              icon={ListChecks}
              label="Done today"
              value={`${completedCount}/${totalCount}`}
              accent="emerald"
            />
            <StatTile
              icon={TrendingUp}
              label="7-day pace"
              value={
                routine.stats.completedPrev7 > 0 || routine.stats.completedLast7 > 0
                  ? `${routine.stats.completedLast7}${
                      routine.stats.completedLast7 >= routine.stats.completedPrev7 ? " ↑" : " ↓"
                    }`
                  : "0"
              }
              accent={
                routine.stats.completedLast7 >= routine.stats.completedPrev7 &&
                routine.stats.completedLast7 > 0
                  ? "emerald"
                  : "default"
              }
            />
            <StatTile
              icon={AlertTriangle}
              label="Overdue"
              value={String(overdueTasks.length)}
              accent={overdueTasks.length > 0 ? "rose" : "default"}
            />
          </div>
        </div>

        {/* Weekly/period progress */}
        {totalCount > 0 ? (
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>This period&apos;s routine</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : null}

        {/* Daily mission: one stage-aware action that changes every day, so each
            return visit has something new waiting (variable reward). */}
        {dailyMission.mission ? (
          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-label font-semibold uppercase tracking-[0.16em] text-primary/80">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  Daily mission · {dailyMission.stageLabel}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-foreground">
                  {dailyMission.mission.mission_text}
                </p>
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
                  onClick={() => void dailyMission.markAsDone()}
                  disabled={dailyMission.completing}
                >
                  {dailyMission.completing ? "Saving…" : "Mark done"}
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {!hasAnythingPlanned ? (
          /* Empty state: guide setup */
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
            {/* Today's routine habits */}
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
                  {routineToday.slice(0, 4).map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => void routine.setTaskStatus(task, "daily", "completed")}
                        disabled={routine.isSaving}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                      >
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                        <span className="text-sm text-foreground">{task.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2.5 text-sm text-success dark:text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  All habits done for today. Nice.
                </div>
              )}
            </div>

            {/* Today's deadlines + overdue */}
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
                  {overdueTasks.length} overdue — clear {overdueTasks.length === 1 ? "it" : "them"} first
                </Link>
              ) : null}

              {deadlineToday.length > 0 ? (
                <ul className="space-y-1.5">
                  {deadlineToday.slice(0, 4).map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => void completeTask(task, true)}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                      >
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                        <span className="text-sm text-foreground">{task.title}</span>
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
      </CardContent>
    </Card>
  );
}
