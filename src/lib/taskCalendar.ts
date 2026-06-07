import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { STAGE_TASKS, type BizMapStage } from './bizmapStages.ts';

export type TaskCalendarView = 'month' | 'week' | 'day';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskSourceType = 'manual' | 'platform';
export type RecommendationStatus = 'suggested' | 'accepted' | 'dismissed';
export type TaskRuntimeStatus = 'completed' | 'pending' | 'overdue' | 'dismissed';
export type DayTaskStatus = 'empty' | 'completed' | 'pending' | 'overdue';

export interface CalendarTaskRow {
  id: string;
  user_id?: string;
  task_text: string;
  task_description?: string | null;
  task_date: string;
  deadline_time?: string | null;
  priority?: string | null;
  is_completed?: boolean | null;
  completed_at?: string | null;
  contributes_to_weekly_mission?: boolean | null;
  ai_generated?: boolean | null;
  task_source?: string | null;
  recommendation_status?: string | null;
  recommendation_key?: string | null;
  recommendation_reason?: string | null;
  startup_stage_tag?: string | null;
  source_route?: string | null;
  dismissed_at?: string | null;
  rescheduled_from_date?: string | null;
  rescheduled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RecommendationEventRow {
  recommendation_key: string;
  event_type: string;
  created_at: string;
}

export interface ToolCompletionSignals {
  icpCompleted?: boolean;
  waitlistCompleted?: boolean;
  pmfCompleted?: boolean;
  mvpCompleted?: boolean;
  techStackCompleted?: boolean;
  gtmCompleted?: boolean;
}

export interface WeeklyMissionSignal {
  id: string;
  mission_goal: string;
  completion_percentage?: number | null;
}

export interface RecommendationContext {
  currentStage: BizMapStage;
  today: string;
  tasks: CalendarTaskRow[];
  events: RecommendationEventRow[];
  toolSignals: ToolCompletionSignals;
  weeklyMission?: WeeklyMissionSignal | null;
}

export interface TaskRecommendation {
  key: string;
  title: string;
  description: string;
  reason: string;
  priority: TaskPriority;
  stage: BizMapStage;
  sourceRoute?: string;
  contributesToWeeklyMission?: boolean;
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateKey(dateKey: string): Date {
  return parseISO(`${dateKey}T00:00:00`);
}

export function addDaysToDateKey(dateKey: string, amount: number): string {
  return toDateKey(addDays(parseDateKey(dateKey), amount));
}

export function getVisibleDateRange(anchorDate: Date, view: TaskCalendarView) {
  if (view === 'day') {
    const day = startOfDay(anchorDate);
    return { start: day, end: day };
  }

  if (view === 'week') {
    return {
      start: startOfWeek(anchorDate, { weekStartsOn: 1 }),
      end: endOfWeek(anchorDate, { weekStartsOn: 1 }),
    };
  }

  return {
    start: startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 }),
  };
}

export function buildCalendarDays(anchorDate: Date, view: TaskCalendarView): Date[] {
  const { start, end } = getVisibleDateRange(anchorDate, view);
  const days: Date[] = [];
  let cursor = start;

  while (!isAfter(cursor, end)) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function normalizePriority(priority: string | null | undefined): TaskPriority {
  if (priority === 'low' || priority === 'medium' || priority === 'high') return priority;
  return 'medium';
}

export function getTaskSource(task: CalendarTaskRow): TaskSourceType {
  return task.task_source === 'platform' || task.ai_generated ? 'platform' : 'manual';
}

export function getTaskRuntimeStatus(task: CalendarTaskRow, now = new Date()): TaskRuntimeStatus {
  if (task.recommendation_status === 'dismissed') return 'dismissed';
  if (task.is_completed) return 'completed';
  if (task.deadline_time && !isAfter(new Date(task.deadline_time), now)) return 'overdue';
  return 'pending';
}

export function groupTasksByDate(tasks: CalendarTaskRow[]): Record<string, CalendarTaskRow[]> {
  return tasks.reduce<Record<string, CalendarTaskRow[]>>((acc, task) => {
    if (task.recommendation_status === 'dismissed') return acc;
    acc[task.task_date] = [...(acc[task.task_date] ?? []), task];
    return acc;
  }, {});
}

export function getDayTaskStatus(tasks: CalendarTaskRow[], now = new Date()): DayTaskStatus {
  const visibleTasks = tasks.filter((task) => task.recommendation_status !== 'dismissed');
  if (visibleTasks.length === 0) return 'empty';
  if (visibleTasks.some((task) => getTaskRuntimeStatus(task, now) === 'overdue')) return 'overdue';
  if (visibleTasks.some((task) => !task.is_completed)) return 'pending';
  return 'completed';
}

export function sortTasksForDay(tasks: CalendarTaskRow[], now = new Date()): CalendarTaskRow[] {
  return [...tasks]
    .filter((task) => task.recommendation_status !== 'dismissed')
    .sort((a, b) => {
      const sourceDelta = Number(getTaskSource(b) === 'platform') - Number(getTaskSource(a) === 'platform');
      if (sourceDelta !== 0) return sourceDelta;

      const statusWeight = (task: CalendarTaskRow) => {
        const status = getTaskRuntimeStatus(task, now);
        if (status === 'overdue') return 0;
        if (status === 'pending') return 1;
        return 2;
      };
      const statusDelta = statusWeight(a) - statusWeight(b);
      if (statusDelta !== 0) return statusDelta;

      const deadlineA = a.deadline_time ? new Date(a.deadline_time).getTime() : Number.MAX_SAFE_INTEGER;
      const deadlineB = b.deadline_time ? new Date(b.deadline_time).getTime() : Number.MAX_SAFE_INTEGER;
      return deadlineA - deadlineB;
    });
}

function wasRecentlyDismissed(key: string, events: RecommendationEventRow[], today: string, cooldownDays = 14): boolean {
  const todayDate = parseDateKey(today);
  return events.some((event) => {
    if (event.recommendation_key !== key || event.event_type !== 'dismissed') return false;
    const eventDate = new Date(event.created_at);
    const cutoff = addDays(todayDate, -cooldownDays);
    return isAfter(eventDate, cutoff) || isSameDay(eventDate, cutoff);
  });
}

function hasActiveRecommendationForToday(tasks: CalendarTaskRow[], today: string): boolean {
  return tasks.some((task) => (
    task.task_date === today &&
    getTaskSource(task) === 'platform' &&
    task.recommendation_status !== 'dismissed'
  ));
}

function firstAllowedRecommendation(
  candidates: TaskRecommendation[],
  events: RecommendationEventRow[],
  today: string,
): TaskRecommendation | null {
  return candidates.find((candidate) => !wasRecentlyDismissed(candidate.key, events, today)) ?? null;
}

export function selectSmartTaskRecommendation(context: RecommendationContext): TaskRecommendation | null {
  const { currentStage, events, tasks, today, toolSignals, weeklyMission } = context;

  if (hasActiveRecommendationForToday(tasks, today)) return null;

  const incompleteTasks = tasks.filter((task) => !task.is_completed && task.recommendation_status !== 'dismissed');
  const overdueAccountabilityTask = incompleteTasks.find((task) => (
    (getTaskSource(task) === 'manual' || task.recommendation_status === 'accepted') &&
    task.deadline_time &&
    isBefore(new Date(task.deadline_time), new Date())
  ));

  const candidates: TaskRecommendation[] = [];

  if (overdueAccountabilityTask) {
    candidates.push({
      key: `overdue:${overdueAccountabilityTask.id}`,
      title: `Close or reschedule: ${overdueAccountabilityTask.task_text}`,
      description: 'Review this overdue task and either complete it today or move it to a realistic deadline.',
      reason: 'This is the oldest accountability gap blocking a clean daily plan.',
      priority: 'high',
      stage: currentStage,
      sourceRoute: '/dashboard/tasks',
    });
  }

  const stageTasks = STAGE_TASKS[currentStage] ?? [];
  const completedTitles = new Set(
    tasks
      .filter((task) => task.is_completed)
      .map((task) => task.task_text.trim().toLowerCase()),
  );

  const stageCandidates = stageTasks
    .filter((stageTask) => !completedTitles.has(stageTask.title.trim().toLowerCase()))
    .map<TaskRecommendation>((stageTask) => ({
      key: `stage:${currentStage}:${stageTask.id}`,
      title: stageTask.title,
      description: `Move Stage ${currentStage.toLowerCase()} forward with one concrete Startup Development Cycle action.`,
      reason: `This is the next highest-leverage task for your current ${currentStage.toLowerCase()} stage.`,
      priority: stageTask.priority,
      stage: currentStage,
      sourceRoute: stageTask.route,
    }));

  const toolCandidates: TaskRecommendation[] = [
    !toolSignals.icpCompleted && {
      key: 'tool:icp-builder',
      title: 'Complete and save your ICP Builder draft',
      description: 'Define the customer, pain, buying trigger, and positioning that the rest of your startup work will build from.',
      reason: 'Your ICP is still the missing foundation for sharper product and validation decisions.',
      priority: 'high',
      stage: 'IDENTITY' as BizMapStage,
      sourceRoute: '/icp-builder',
    },
    currentStage !== 'IDENTITY' && !toolSignals.waitlistCompleted && {
      key: 'tool:waitlist-maker',
      title: 'Publish or mark ready your waitlist page',
      description: 'Turn your positioning into a demand-capture page so you can start collecting market signals.',
      reason: 'A visible waitlist gives you real demand feedback instead of internal planning.',
      priority: 'high',
      stage: 'PROTOTYPE' as BizMapStage,
      sourceRoute: '/demo-studio',
    },
    currentStage === 'VALIDATING' && !toolSignals.pmfCompleted && {
      key: 'tool:pmf-lab',
      title: 'Add fresh validation evidence in PMF Lab',
      description: 'Capture interview or survey signals and update your PMF checklist so the validation score reflects reality.',
      reason: 'Your current stage needs stronger evidence before the platform can recommend build or launch work.',
      priority: 'high',
      stage: 'VALIDATING' as BizMapStage,
      sourceRoute: '/pmf-lab',
    },
    currentStage === 'BUILDING' && !toolSignals.techStackCompleted && {
      key: 'tool:tech-stack',
      title: 'Save your Tech Stack recommendation',
      description: 'Choose the core tools and budget for your MVP so build decisions are concrete.',
      reason: 'The build stage needs a clear stack and budget before execution gets expensive.',
      priority: 'high',
      stage: 'BUILDING' as BizMapStage,
      sourceRoute: '/tech-stack',
    },
    currentStage === 'BUILDING' && !toolSignals.mvpCompleted && {
      key: 'tool:mvp-builder',
      title: 'Save your MVP scope',
      description: 'Lock the smallest buildable version of the product and identify what can wait.',
      reason: 'A focused MVP scope protects you from building too much too soon.',
      priority: 'high',
      stage: 'BUILDING' as BizMapStage,
      sourceRoute: '/mvp-builder',
    },
    currentStage === 'LAUNCH' && !toolSignals.gtmCompleted && {
      key: 'tool:gtm-plan',
      title: 'Save your GTM launch plan',
      description: 'Choose the first acquisition channels, launch assets, and KPIs you will track.',
      reason: 'Launch momentum depends on a clear distribution plan, not a generic announcement.',
      priority: 'high',
      stage: 'LAUNCH' as BizMapStage,
      sourceRoute: '/go-to-market',
    },
  ].filter(Boolean) as TaskRecommendation[];

  candidates.push(...toolCandidates, ...stageCandidates);

  if (weeklyMission && Number(weeklyMission.completion_percentage ?? 0) < 100) {
    candidates.push({
      key: `weekly:${weeklyMission.id}`,
      title: `Move this week's mission: ${weeklyMission.mission_goal}`,
      description: 'Block one focused work session today that directly advances your weekly commitment.',
      reason: 'Your daily plan should protect progress on the current weekly mission.',
      priority: 'high',
      stage: currentStage,
      sourceRoute: '/dashboard/weekly-mission',
      contributesToWeeklyMission: true,
    });
  }

  candidates.push({
    key: `fallback:${currentStage}`,
    title: stageTasks[0]?.title ?? 'Choose one customer-facing action for today',
    description: stageTasks[0]
      ? `Start with the most concrete action in Stage ${currentStage.toLowerCase()} and finish it before opening new work.`
      : 'Pick one action that creates customer evidence, product clarity, or launch momentum.',
    reason: 'A single focused task keeps momentum visible even when the roadmap is still forming.',
    priority: stageTasks[0]?.priority ?? 'medium',
    stage: currentStage,
    sourceRoute: stageTasks[0]?.route ?? '/dashboard',
  });

  return firstAllowedRecommendation(candidates, events, today);
}
