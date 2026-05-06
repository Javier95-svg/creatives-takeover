import { useEffect, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Flame,
  FolderOpen,
  Gift,
  Loader2,
  Map,
  Target,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { BIZMAP_STAGES, STAGE_TASKS, getStageIndex, type BizMapStage } from '@/lib/bizmapStages';
import { PLAN_LABELS, type Plan } from '@/config/planPermissions';
import { cn } from '@/lib/utils';

const planDepth: Record<Plan, { label: string; description: string; maxTasks: number; showAdvanced: boolean }> = {
  rookie: {
    label: 'Guided',
    description: 'One clear move. Keep the noise out until the first customer signal is real.',
    maxTasks: 3,
    showAdvanced: false,
  },
  starter: {
    label: 'Structured',
    description: 'Move through customer clarity, demand capture, and validation in order.',
    maxTasks: 4,
    showAdvanced: false,
  },
  rising: {
    label: 'Operating',
    description: 'Run multiple stage workstreams without losing the next most important action.',
    maxTasks: 5,
    showAdvanced: true,
  },
  pro: {
    label: 'Strategic',
    description: 'A richer command center for execution, traction, and fundraising readiness.',
    maxTasks: 6,
    showAdvanced: true,
  },
};

function getStageDefinition(stage: BizMapStage) {
  return BIZMAP_STAGES.find((item) => item.id === stage) ?? BIZMAP_STAGES[0];
}

function getPrimaryAction(stage: BizMapStage, hasIcp: boolean) {
  const stageTasks = STAGE_TASKS[stage] ?? [];
  const task = stageTasks.find((item) => item.priority === 'high') ?? stageTasks[0];

  if (stage === 'IDENTITY' && hasIcp) {
    return {
      title: 'Turn your ICP into today’s target customer action',
      description: 'Your draft is saved. Use it to choose the next validation move instead of browsing tools.',
      route: '/dashboard/tasks',
      label: 'Open tasks',
    };
  }

  return {
    title: task?.title ?? 'Choose the next action for your current stage',
    description: 'This is the one action the dashboard is asking you to complete before your next visit.',
    route: task?.route ?? '/dashboard/focus-funnel',
    label: 'Start action',
  };
}

function CommandCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 backdrop-blur-xl', className)}>
      {children}
    </div>
  );
}

export const PersonalizedDashboardV2 = () => {
  const {
    personalized,
    progress,
    tasks,
    weeklyMission,
    metrics: dashboardMetrics,
    currentPlan,
    initialLoading,
  } = useDashboardData();
  const { data, trackActivity } = personalized;
  const { currentStage, stageState } = progress;
  const { allTasks } = tasks;
  const { currentMission } = weeklyMission;

  const depth = planDepth[currentPlan];
  const stage = currentStage;
  const stageDef = getStageDefinition(stage);
  const stageNumber = getStageIndex(stage) + 1;
  const activeTasks = allTasks.filter((task) => !task.isCompleted).slice(0, depth.maxTasks);
  const completedStages = Object.values(stageState).filter((item) => item.completed).length;
  const primaryAction = getPrimaryAction(stage, Boolean(data?.primaryIcp));
  const founderName = data?.profile?.full_name?.split(' ')[0] || 'Founder';
  const filesCount = data?.dashboardFiles?.length ?? 0;

  useEffect(() => {
    void trackActivity('dashboard_home_view', {
      plan: currentPlan,
      stage,
    });
  }, [currentPlan, stage, trackActivity]);

  const tomorrowReason = useMemo(() => {
    if (currentMission?.mission_goal) return `Come back tomorrow to move this week’s mission: ${currentMission.mission_goal}`;
    if (activeTasks[0]) return `Come back tomorrow to finish: ${activeTasks[0].title}`;
    return `Come back tomorrow to move Stage ${stageNumber}: ${stageDef.title}.`;
  }, [activeTasks, currentMission?.mission_goal, stageDef.title, stageNumber]);

  if (initialLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.75fr]">
          <CommandCard className="overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">Today’s command</p>
                  <h2 className="mt-2 font-space-grotesk text-2xl font-semibold text-white sm:text-3xl">
                    {founderName}, focus on Stage {stageNumber}: {stageDef.title}
                  </h2>
                </div>
                <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                  {PLAN_LABELS[currentPlan]} · {depth.label}
                </Badge>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5 px-5 py-6 sm:px-6">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Do this next</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{primaryAction.title}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{primaryAction.description}</p>
                      <Button asChild className="mt-5 bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                        <Link to={primaryAction.route}>
                          {primaryAction.label}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-slate-500">Cycle progress</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{completedStages}/5</p>
                    <p className="text-xs text-slate-500">stages completed</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-slate-500">Today</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {dashboardMetrics.tasksCompletedToday}/{dashboardMetrics.totalTasksToday}
                    </p>
                    <p className="text-xs text-slate-500">tasks done</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-slate-500">Streak</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{data?.stats?.currentStreak ?? 0}</p>
                    <p className="text-xs text-slate-500">daily check-ins</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/20 px-5 py-6 lg:border-l lg:border-t-0 sm:px-6">
                <p className="text-sm font-semibold text-white">Startup Development Cycle</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{stageDef.description}</p>
                <div className="mt-5 space-y-3">
                  {BIZMAP_STAGES.map((item) => {
                    const itemState = stageState[item.id];
                    const isCurrent = item.id === stage;

                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                            itemState.completed
                              ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                              : isCurrent
                                ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100'
                                : 'border-white/10 bg-white/[0.03] text-slate-500',
                          )}
                        >
                          {item.order}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-medium', isCurrent ? 'text-white' : 'text-slate-400')}>{item.title}</p>
                          {isCurrent ? <Progress value={dashboardMetrics.weeklyProgress} className="mt-2 h-1.5 bg-white/10" /> : null}
                        </div>
                        {itemState.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CommandCard>

          <div className="space-y-6">
            <CommandCard className="p-5">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-pink-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Weekly Mission</p>
                  <p className="text-xs text-slate-500">Resets every Monday</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {currentMission?.mission_goal ?? 'A stage-based mission will appear here when the week starts.'}
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Mission progress</span>
                  <span>{dashboardMetrics.weeklyProgress.toFixed(0)}%</span>
                </div>
                <Progress value={dashboardMetrics.weeklyProgress} className="h-2 bg-white/10" />
              </div>
              <Button asChild variant="outline" className="mt-5 w-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white">
                <Link to="/dashboard/weekly-mission">Open mission</Link>
              </Button>
            </CommandCard>

            <CommandCard className="p-5">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-orange-300" />
                <p className="text-sm font-semibold text-white">Reason to return</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{tomorrowReason}</p>
            </CommandCard>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <CommandCard className="p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Your next tasks</p>
                <p className="text-sm text-slate-500">{depth.description}</p>
              </div>
              <Button asChild variant="ghost" className="text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100">
                <Link to="/dashboard/tasks">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {activeTasks.length > 0 ? (
                activeTasks.map((task, index) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <Circle className={cn('mt-0.5 h-5 w-5', index === 0 ? 'text-cyan-300' : 'text-slate-600')} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <Badge variant="outline" className="border-white/10 text-slate-400">{index === 0 ? 'Now' : index === 1 ? 'Next' : 'Later'}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{task.sourceLabel}</p>
                    </div>
                    {task.actionRoute ? (
                      <Link to={task.actionRoute} className="text-sm text-cyan-200 hover:text-cyan-100">
                        Open
                      </Link>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-slate-500">
                  No active tasks. Open Focus Funnel to choose the next stage action.
                </div>
              )}
            </div>
          </CommandCard>

          <div className="grid gap-6">
            <CommandCard className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">My Files</p>
                    <p className="text-xs text-slate-500">{filesCount} saved document{filesCount === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white">
                  <Link to="/dashboard/files">Open</Link>
                </Button>
              </div>
              {data?.primaryIcp?.summary ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="text-sm font-medium text-white">{data.primaryIcp.summary.personaName}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{data.primaryIcp.summary.corePainPoint}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CommandCard>

            <CommandCard className="p-5">
              <div className="grid gap-3">
                <Link to="/dashboard/focus-funnel" className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300 hover:border-cyan-400/25 hover:text-white">
                  <span className="inline-flex items-center gap-2"><Map className="h-4 w-4 text-cyan-300" /> Focus Funnel</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/dashboard/referral" className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300 hover:border-cyan-400/25 hover:text-white">
                  <span className="inline-flex items-center gap-2"><Gift className="h-4 w-4 text-pink-300" /> Referral Program</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CommandCard>
          </div>
        </div>

        {depth.showAdvanced ? (
          <CommandCard className="p-5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 text-slate-500" />
              <p className="text-sm text-slate-400">
                Advanced plan context is available inside each tab. Home stays focused on the next action.
              </p>
            </div>
          </CommandCard>
        ) : null}
    </div>
  );
};
