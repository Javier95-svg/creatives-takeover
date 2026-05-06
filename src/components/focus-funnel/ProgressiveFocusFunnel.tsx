import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, LockKeyhole, MapPinned } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FundraisingFunnel } from '@/components/focus-funnel/FundraisingFunnel';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import {
  BIZMAP_STAGES,
  STAGE_TASKS,
  getRequiredUnlockMessage,
  getStageIndex,
  type BizMapStage,
} from '@/lib/bizmapStages';
import { cn } from '@/lib/utils';

const stageOutcomes: Record<BizMapStage, string> = {
  IDENTITY: 'A clear customer, pain, and first market hypothesis.',
  PROTOTYPE: 'A simple demand-capture surface founders can share.',
  VALIDATING: 'Customer evidence strong enough to decide what changes.',
  BUILDING: 'A scoped MVP and stack ready for focused execution.',
  LAUNCH: 'A GTM motion with measurable traction signals.',
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProgressiveFocusFunnel() {
  const { progress, tasks, currentPlan, metrics } = useDashboardData();
  const { currentStage, stageState, loading, error } = progress;
  const [expandedStage, setExpandedStage] = useState<BizMapStage | null>(null);
  const activeIndex = getStageIndex(currentStage);
  const activeStage = BIZMAP_STAGES.find((stage) => stage.id === currentStage) ?? BIZMAP_STAGES[0];

  const activeTasks = useMemo(() => {
    const stageTasks = tasks.bizMapTasks.length > 0
      ? tasks.bizMapTasks
      : (STAGE_TASKS[currentStage] ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          isCompleted: false,
          actionRoute: task.route,
        }));

    return stageTasks;
  }, [currentStage, tasks.bizMapTasks]);

  const nextTask = activeTasks.find((task) => !task.isCompleted) ?? activeTasks[0];
  const primaryRoute = nextTask?.actionRoute ?? activeStage.tools[0]?.route ?? '/dashboard/tasks';
  const stageProgress = activeTasks.length > 0
    ? Math.round((activeTasks.filter((task) => task.isCompleted).length / activeTasks.length) * 100)
    : metrics.weeklyProgress;
  const completedStages = BIZMAP_STAGES.filter((stage) => stageState[stage.id]?.completed);
  const futureStages = BIZMAP_STAGES.filter((stage) => getStageIndex(stage.id) > activeIndex);
  const isProLaunch = currentPlan === 'pro' && currentStage === 'LAUNCH';

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
        <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-slate-100 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          {BIZMAP_STAGES.map((stage) => {
            const isActive = stage.id === currentStage;
            const isCompleted = stageState[stage.id]?.completed;

            return (
              <div key={stage.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold',
                    isCompleted
                      ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                      : isActive
                        ? 'border-cyan-400/45 bg-cyan-400/15 text-cyan-100'
                        : 'border-white/10 bg-black/20 text-slate-500',
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stage.order}
                </div>
                {stage.order < BIZMAP_STAGES.length ? <div className="h-px w-6 bg-white/10 sm:w-10" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-5 text-slate-100 backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                Active stage
              </Badge>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                Stage {activeStage.order}
              </span>
            </div>
            <h1 className="mt-3 font-space-grotesk text-2xl font-semibold text-white sm:text-3xl">
              {activeStage.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">{activeStage.description}</p>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Next required action: <span className="font-medium text-white">{nextTask?.title ?? 'Choose the next stage task.'}</span>
            </p>
          </div>
          <Button asChild className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
            <Link to={primaryRoute}>
              Start next action
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Current stage progress</span>
            <span>{stageProgress}%</span>
          </div>
          <Progress value={stageProgress} className="h-2 bg-white/10" />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {activeTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-6 text-white">{task.title}</p>
                {task.isCompleted ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Badge variant="outline" className="border-white/10 text-xs capitalize text-slate-300">
                  {task.priority}
                </Badge>
                {task.actionRoute ? (
                  <Link to={task.actionRoute} className="text-xs text-cyan-200 hover:text-cyan-100">
                    Open
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {completedStages.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-slate-100 backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-white">Completed stages</h2>
          <div className="mt-3 space-y-2">
            {completedStages.map((stage) => {
              const completedAt = formatDate(stageState[stage.id]?.completedAt);
              const isExpanded = expandedStage === stage.id;

              return (
                <div key={stage.id} className="rounded-2xl border border-white/10 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <span className="flex-1 text-sm font-medium text-white">{stage.title}</span>
                    {completedAt ? <span className="text-xs text-slate-500">{completedAt}</span> : null}
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-white/10 px-4 pb-4 pt-3 text-sm leading-6 text-slate-400">
                      Deliverable: {stageOutcomes[stage.id]}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {futureStages.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-2">
          {futureStages.map((stage) => (
            <div key={stage.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-slate-100 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-500">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{stage.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{stageOutcomes[stage.id]}</p>
                  <p className="mt-3 text-xs text-slate-600">{getRequiredUnlockMessage(stage.id)}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {isProLaunch ? (
        <FundraisingFunnel />
      ) : currentPlan === 'pro' ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4 text-slate-100 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <MapPinned className="mt-0.5 h-5 w-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-white">Pro fundraising layer</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Fundraising readiness appears here when the active stage reaches Launch.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
