import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarCheck2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DocCallout, DocCheck, DocSection, DocToggle } from '@/components/dashboard/DocBlocks';
import { TaskTodayWorkspace } from '@/components/dashboard/TaskTodayWorkspace';
import YourRoutinePage from '@/pages/YourRoutinePage';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import { useDashboardAction } from '@/hooks/useDashboardAction';
import { captureEvent } from '@/lib/analytics';
import { useFirstCustomerSprint } from '@/hooks/useFirstCustomerSprint';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import type { DashboardAction, DashboardActionKind } from '@/types/dashboardSnapshot';

/** A one-off action for ticking or adding from this page. */
function inlineAction(actionKind: DashboardActionKind, entityId: string | null, title: string, toolKey: string): DashboardAction {
  return {
    key: `inline:${actionKind}:${entityId ?? title}`,
    kind: 'task',
    toolKey,
    entityId,
    title,
    description: null,
    urgency: 'medium',
    reasonCodes: ['overview_checklist'],
    estimatedMinutes: 5,
    dueAt: null,
    actionKind,
  };
}

/**
 * The top of Overview: the one next step, then today as a single checklist
 * (mission, routine, tasks) that can be ticked in place. Tasks and Routine
 * open in full from the toggles below the list.
 */
export default function DashboardTodaySnapshot() {
  const { snapshot, primaryAction, isLoading, isOffline, isStale } = useDashboardData();
  const dashboardAction = useDashboardAction();
  const [newTask, setNewTask] = useState('');
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
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const busy = dashboardAction.isPending;
  const complete = (action: DashboardAction) => dashboardAction.mutate({ action });

  const addTask = (event: FormEvent) => {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    dashboardAction.mutate({ action: inlineAction('create_task', null, title, 'tasks'), payload: { title } });
    setNewTask('');
  };

  const weekParts = [
    weeklyMission ? `Weekly commitment ${Math.round(weeklyMission.progress)}%` : null,
    engagement ? `active ${engagement.activeDays7} of ${engagement.weeklyGoal} days` : null,
    engagement ? `${engagement.meaningfulActions7} meaningful actions` : null,
  ].filter(Boolean);

  return (
    <>
      <DocCallout>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p id="dashboard-primary-action" className="text-sm text-muted-foreground">
              Next step{primaryAction ? <span className="tabular-nums"> · about {primaryAction.estimatedMinutes} min</span> : null}
            </p>
            <h2 className="mt-1 text-balance font-space-grotesk text-xl font-semibold tracking-tight text-foreground">
              {primaryAction?.title ?? 'Plan one useful move for today'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {primaryAction?.description ?? 'Add a task, a routine or a saved result and your next step will show here.'}
            </p>
            {isOffline || isStale ? (
              <p className="mt-1 text-xs text-warning">
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
          <Link
            to="/go-to-market?workspace=first-customer-proof"
            className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="min-w-0 truncate">
              <span className="font-medium text-foreground">First Customer Proof:</span> {proofNextAction} · {proofEvidence.contactedProspects}/10 messages
            </span>
            <span className="shrink-0">{proofSprint ? 'Continue proof' : 'Start proof'} →</span>
          </Link>
        ) : null}
      </DocCallout>

      <DocSection id="dashboard-today-title" title="Today" icon={CalendarCheck2} className="mt-10">
        {weekParts.length ? (
          <p className="mb-3 text-sm text-muted-foreground">
            {weekParts.join(' · ')}
            {weeklyMission ? <> · <span className="text-foreground">{weeklyMission.title}</span></> : null}
          </p>
        ) : null}

        <div className="space-y-0.5">
          {dailyMission ? (
            <DocCheck
              title={dailyMission.title}
              done={dailyMission.completed}
              busy={busy}
              meta="Mission"
              onComplete={() => complete(inlineAction('complete_daily_mission', dailyMission.id, dailyMission.title, 'routine'))}
            />
          ) : null}
          {routine?.items.map((item) => (
            <DocCheck
              key={item.id}
              title={item.title}
              done={item.completed}
              busy={busy}
              meta="Routine"
              onComplete={() => complete(inlineAction('complete_routine_item', item.id, item.title, 'routine'))}
            />
          ))}
          {overdueCount ? (
            <Link
              to="/dashboard/tasks"
              className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {overdueCount} overdue. Clear {overdueCount === 1 ? 'it' : 'them'} first.
            </Link>
          ) : null}
          {dueToday.map((task) => (
            <DocCheck
              key={task.id}
              title={task.title}
              done={false}
              busy={busy}
              meta={task.priority === 'high' ? 'High priority' : 'Due today'}
              onComplete={() => complete(inlineAction('complete_task', task.id, task.title, 'tasks'))}
            />
          ))}
          {!dailyMission && !routine?.items.length && !dueToday.length && !overdueCount ? (
            <p className="py-1.5 text-sm text-muted-foreground">Nothing planned for today yet.</p>
          ) : null}
          <form onSubmit={addTask} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 text-sm">
            <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="dashboard-new-task" className="sr-only">Add a task for today</label>
            <input
              id="dashboard-new-task"
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="Add a task for today"
              className="min-h-0 min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {newTask.trim() ? <Button type="submit" size="pill-sm" variant="outline" disabled={busy}>Add</Button> : null}
          </form>
        </div>

        <div className="mt-3 space-y-0.5">
          <DocToggle title="Manage tasks" summary="Upcoming, backlog and history" onOpenChange={(open) => { if (open) captureEvent('dashboard_toggle_opened', { toggle: 'tasks' }); }}>
            <TaskTodayWorkspace embedded />
          </DocToggle>
          <DocToggle title="Manage routine" summary="Add, edit and set reminders" onOpenChange={(open) => { if (open) captureEvent('dashboard_toggle_opened', { toggle: 'routine' }); }}>
            <YourRoutinePage embedded />
          </DocToggle>
        </div>
      </DocSection>
    </>
  );
}
