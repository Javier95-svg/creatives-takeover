import { forwardRef, useEffect, useState, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock3, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { calculateGTMHealth, type GTMPlanV2, type GTMPlay, type GTMTask } from '@/lib/gtmV2';
import { weeklyResultsFromExperiments, type WeeklyResult } from '@/lib/gtmProgress';
import { buildGTMActionPacket } from '@/lib/marketExperiment';
import { cn } from '@/lib/utils';
import GTMQuickLog from './GTMQuickLog';

interface GTMThisWeekProps {
  plan: GTMPlanV2;
  planId: string;
  week: number;
  tasks: GTMTask[];
  primaryPlay: GTMPlay | undefined;
  nextReviewDate: Date;
  onUpdatePlan: (plan: GTMPlanV2) => Promise<void>;
  onUpdatePlay: (play: GTMPlay) => Promise<void>;
  /** Opens the Review tab after a week is logged. */
  onOpenReview: () => void;
  /** Where the quick log sits, for the next-step card to scroll to. */
  quickLogRef?: Ref<HTMLDivElement>;
}

const formatDay = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

/** The default GTM view: the goal, the channel, this week's tasks and the latest result. */
const GTMThisWeek = forwardRef<HTMLDivElement, GTMThisWeekProps>(function GTMThisWeek(
  { plan, planId, week, tasks, primaryPlay, nextReviewDate, onUpdatePlan, onUpdatePlay, onOpenReview, quickLogRef },
  tasksRef,
) {
  const packet = primaryPlay ? buildGTMActionPacket(plan, primaryPlay) : null;
  const [weekly, setWeekly] = useState<WeeklyResult[]>([]);

  // Logged results for this play's experiment, by plan week, for the strip.
  useEffect(() => {
    const sprintId = primaryPlay?.tractionSprintId;
    if (!sprintId) { setWeekly([]); return; }
    let active = true;
    void (supabase as any).from('traction_engine_experiments')
      .select('result_value, target_value, created_at')
      .eq('sprint_id', sprintId)
      .order('created_at', { ascending: true })
      .then(({ data }: { data: Array<{ result_value: number; target_value: number; created_at: string }> | null }) => {
        if (active) setWeekly(weeklyResultsFromExperiments(data ?? [], primaryPlay?.activatedAt ?? plan.generatedAt));
      });
    return () => { active = false; };
  }, [plan.generatedAt, primaryPlay?.activatedAt, primaryPlay?.actual, primaryPlay?.tractionSprintId]);

  const copyMessage = async () => {
    if (!packet) return;
    try {
      await navigator.clipboard.writeText(packet.approvedMessage);
      toast.success('Message copied.');
      captureEvent('gtm_message_copied', { plan_id: planId, play_id: primaryPlay?.id });
    } catch {
      toast.error('Could not copy.');
    }
  };
  const weekTasks = tasks.filter((task) => task.week === week && task.status !== 'skipped');
  const doneCount = weekTasks.filter((task) => task.status === 'done').length;
  const metric = primaryPlay?.metric.toLowerCase() ?? 'results';
  const hasResult = typeof primaryPlay?.actual === 'number';

  const toggleTask = async (task: GTMTask) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    const nextTasks = tasks.map((item) => item.id === task.id ? {
      ...item,
      status: nextStatus,
      completedAt: nextStatus === 'done' ? new Date().toISOString() : undefined,
    } as GTMTask : item);
    captureEvent('gtm_task_status_changed', { plan_id: planId, task_id: task.id, week: task.week, status: nextStatus });
    await onUpdatePlan({ ...plan, tasks: nextTasks, health: calculateGTMHealth(plan, nextTasks) });
  };

  const statusLine = [
    `Week ${week} of 6`,
    weekTasks.length > 0 ? `${doneCount} of ${weekTasks.length} tasks done` : null,
    primaryPlay && hasResult ? `${primaryPlay.actual} of ${primaryPlay.target} ${metric} last logged` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{statusLine}</p>

      <section className="grid gap-4 rounded-xl border border-border/60 bg-card p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Your six-week goal</h2>
          <p className="mt-1 text-base text-foreground">{plan.intake.sixWeekOutcome || plan.metrics.primaryOutcome}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Channel you are testing</h2>
          {primaryPlay ? (
            <p className="mt-1 text-base text-foreground">
              {primaryPlay.channelName}
              <span className="text-muted-foreground">, aiming for {primaryPlay.target} {metric} a week</span>
            </p>
          ) : (
            <p className="mt-1 text-base text-muted-foreground">No channel picked yet.</p>
          )}
        </div>
      </section>

      <section ref={tasksRef} className="scroll-mt-28 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">This week&apos;s tasks</h2>
          {weekTasks.length > 0 ? <span className="text-sm text-muted-foreground">{doneCount} of {weekTasks.length} done</span> : null}
        </div>
        {weekTasks.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
            {weekTasks.map((task) => {
              const done = task.status === 'done';
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => void toggleTask(task)}
                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border', done ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-medium text-foreground', done && 'text-muted-foreground line-through')}>{task.title}</span>
                      {task.detail ? <span className="mt-1 block text-sm text-muted-foreground">{task.detail}</span> : null}
                      <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        About {task.timeEstimateMinutes} min
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
            No tasks for week {week}. The weekly review sets next week&apos;s tasks.
          </p>
        )}
      </section>

      {packet ? (
        <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5" aria-labelledby="gtm-message-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="gtm-message-heading" className="text-sm font-medium text-muted-foreground">Message to send</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">To {packet.prospectCriteria}. About {packet.dailyQuota} a day.</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => void copyMessage()}>
              <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Copy
            </Button>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-foreground">{packet.approvedMessage}</p>
        </section>
      ) : null}

      {primaryPlay?.tractionSprintId ? (
        <div ref={quickLogRef} className="scroll-mt-28">
          <GTMQuickLog plan={plan} planId={planId} play={primaryPlay} onUpdatePlay={onUpdatePlay} onLogged={onOpenReview} />
        </div>
      ) : null}

      {weekly.some((item) => item.result !== null) ? (
        <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5" aria-labelledby="gtm-progress-heading">
          <h2 id="gtm-progress-heading" className="text-sm font-medium text-muted-foreground">Six weeks so far</h2>
          <ol className="mt-3 grid grid-cols-6 gap-2">
            {weekly.map((item) => (
              <li key={item.week} className={cn('rounded-lg border p-2 text-center', item.week === week ? 'border-primary/50' : 'border-border/60')}>
                <span className="block text-xs text-muted-foreground">W{item.week}</span>
                <span className={cn('mt-1 block text-sm font-semibold', item.result === null ? 'text-muted-foreground' : item.hit ? 'text-primary' : 'text-foreground')}>
                  {item.result === null ? '-' : item.result}
                </span>
                {item.target !== null ? <span className="block text-[11px] text-muted-foreground">of {item.target}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Latest result</h2>
          {primaryPlay && hasResult ? (
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {primaryPlay.actual}
              <span className="text-base font-normal text-muted-foreground"> of {primaryPlay.target} {metric}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Nothing logged yet. Results come from your weekly log in Traction Engine.</p>
          )}
          {primaryPlay ? (
            <Link
              to={`/traction-engine?planId=${encodeURIComponent(planId)}&playId=${encodeURIComponent(primaryPlay.id)}`}
              className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open Traction Engine
            </Link>
          ) : null}
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Next review</h2>
          <p className="mt-1 text-base text-foreground">{formatDay(nextReviewDate)}</p>
          <p className="mt-1 text-sm text-muted-foreground">You will see any proposed changes before they reach your plan.</p>
        </div>
      </section>
    </div>
  );
});

export default GTMThisWeek;
