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
export type TaskIntentType = 'daily_momentum' | 'weekly_mission' | 'stage_action' | 'accountability' | 'foundational';
export type TaskFeedbackStatus = 'remind_later' | 'not_relevant' | 'already_done' | 'stop_showing';
export type RecommendationEventType =
  | 'suggested'
  | 'accepted'
  | 'dismissed'
  | 'rescheduled'
  | 'completed'
  | 'seen'
  | 'remind_later'
  | 'not_relevant'
  | 'already_done'
  | 'stop_showing';
export type RecommendationFeedbackAction = Extract<
  RecommendationEventType,
  'remind_later' | 'not_relevant' | 'already_done' | 'stop_showing'
>;

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
  intent_type?: string | null;
  source_tool?: string | null;
  is_foundational?: boolean | null;
  cooldown_until?: string | null;
  max_suggestions?: number | null;
  seen_count?: number | null;
  last_seen_at?: string | null;
  feedback_status?: string | null;
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
  intentType?: TaskIntentType;
  sourceTool?: string;
  isFoundational?: boolean;
  maxSuggestions?: number;
}

export interface FoundationalMilestone {
  key: string;
  title: string;
  description: string;
  route: string;
  sourceTool: string;
  completed: boolean;
  stage: BizMapStage;
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

export function getTaskIntentType(task: CalendarTaskRow): TaskIntentType {
  if (
    task.intent_type === 'daily_momentum' ||
    task.intent_type === 'weekly_mission' ||
    task.intent_type === 'stage_action' ||
    task.intent_type === 'accountability' ||
    task.intent_type === 'foundational'
  ) {
    return task.intent_type;
  }

  if (task.recommendation_key?.startsWith('tool:')) return 'foundational';
  if (task.recommendation_key?.startsWith('weekly:') || task.contributes_to_weekly_mission) return 'weekly_mission';
  if (task.recommendation_key?.startsWith('stage:')) return 'stage_action';
  if (task.recommendation_key?.startsWith('overdue:')) return 'accountability';
  return 'daily_momentum';
}

export function isFoundationalTask(task: CalendarTaskRow): boolean {
  return task.is_foundational === true || getTaskIntentType(task) === 'foundational';
}

export function isTaskCoolingDown(task: CalendarTaskRow, today = toDateKey(new Date())): boolean {
  if (!task.cooldown_until) return false;
  const cooldownDate = new Date(task.cooldown_until);
  if (Number.isNaN(cooldownDate.getTime())) return false;
  return isAfter(cooldownDate, parseDateKey(today)) || isSameDay(cooldownDate, parseDateKey(today));
}

export function shouldShowAsDailyCommand(task: CalendarTaskRow, today = toDateKey(new Date())): boolean {
  if (task.recommendation_status === 'dismissed') return false;
  if (task.feedback_status === 'not_relevant' || task.feedback_status === 'already_done' || task.feedback_status === 'stop_showing') {
    return false;
  }
  if (isTaskCoolingDown(task, today)) return false;
  return !isFoundationalTask(task);
}

function normalizeTaskTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTaskSemanticFamily(task: CalendarTaskRow): string {
  const key = task.recommendation_key ?? '';
  const title = normalizeTaskTitle(task.task_text ?? '');

  if (
    key === 'tool:icp-builder' ||
    key === 'stage:IDENTITY:identity-icp-profile' ||
    title === 'complete and save your icp builder draft' ||
    title === 'complete and save your icp profile'
  ) {
    return 'foundation:icp';
  }

  if (key) return key;
  return `title:${title}`;
}

export function groupTasksByDate(tasks: CalendarTaskRow[]): Record<string, CalendarTaskRow[]> {
  const seenPlatformFamilies = new Set<string>();

  return tasks.reduce<Record<string, CalendarTaskRow[]>>((acc, task) => {
    if (task.recommendation_status === 'dismissed') return acc;

    if (task.recommendation_status === 'suggested' && isFoundationalTask(task)) {
      return acc;
    }

    if (getTaskSource(task) === 'platform') {
      const familyKey = `${task.task_date}:${getTaskSemanticFamily(task)}`;
      if (seenPlatformFamilies.has(familyKey)) return acc;
      seenPlatformFamilies.add(familyKey);
    }

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

// Recommendation anti-repetition windows. Dismissal keeps the longest cooldown
// (explicit "not this"), completion silences a key while the underlying tool
// signal catches up, and the suggestion cooldown stops the engine from
// re-suggesting the exact same key on back-to-back days after it resolves.
export const DISMISSED_KEY_COOLDOWN_DAYS = 14;
export const COMPLETED_KEY_COOLDOWN_DAYS = 30;
export const SUGGESTED_KEY_COOLDOWN_DAYS = 2;
export const REMIND_LATER_COOLDOWN_DAYS = 7;
export const NOT_RELEVANT_COOLDOWN_DAYS = 30;
export const ALREADY_DONE_COOLDOWN_DAYS = 365;
export const STOP_SHOWING_COOLDOWN_DAYS = 3650;
export const FOUNDATIONAL_MAX_SUGGESTIONS = 1;
// Open platform suggestions roll forward day to day; after this many days
// without action they expire so a different recommendation can rotate in.
export const CARRY_FORWARD_MAX_AGE_DAYS = 3;

function hadRecentEvent(
  key: string,
  events: RecommendationEventRow[],
  today: string,
  eventType: string,
  cooldownDays: number,
): boolean {
  const todayDate = parseDateKey(today);
  return events.some((event) => {
    if (event.recommendation_key !== key || event.event_type !== eventType) return false;
    const eventDate = new Date(event.created_at);
    const cutoff = addDays(todayDate, -cooldownDays);
    return isAfter(eventDate, cutoff) || isSameDay(eventDate, cutoff);
  });
}

function lastSuggestedAt(key: string, events: RecommendationEventRow[]): number {
  return events.reduce((latest, event) => {
    if (event.recommendation_key !== key || event.event_type !== 'suggested') return latest;
    return Math.max(latest, new Date(event.created_at).getTime());
  }, 0);
}

function eventCount(key: string, events: RecommendationEventRow[], eventType: string): number {
  return events.reduce((count, event) => (
    event.recommendation_key === key && event.event_type === eventType ? count + 1 : count
  ), 0);
}

function isHardSuppressed(candidate: TaskRecommendation, events: RecommendationEventRow[], today: string): boolean {
  if (hadRecentEvent(candidate.key, events, today, 'stop_showing', STOP_SHOWING_COOLDOWN_DAYS)) return true;
  if (hadRecentEvent(candidate.key, events, today, 'already_done', ALREADY_DONE_COOLDOWN_DAYS)) return true;
  const maxSuggestions = candidate.maxSuggestions ?? (candidate.isFoundational ? FOUNDATIONAL_MAX_SUGGESTIONS : undefined);
  if (maxSuggestions !== undefined && eventCount(candidate.key, events, 'suggested') >= maxSuggestions) return true;
  return false;
}

function isUserSuppressed(candidate: TaskRecommendation, events: RecommendationEventRow[], today: string): boolean {
  return (
    isHardSuppressed(candidate, events, today) ||
    hadRecentEvent(candidate.key, events, today, 'dismissed', DISMISSED_KEY_COOLDOWN_DAYS) ||
    hadRecentEvent(candidate.key, events, today, 'completed', COMPLETED_KEY_COOLDOWN_DAYS) ||
    hadRecentEvent(candidate.key, events, today, 'remind_later', REMIND_LATER_COOLDOWN_DAYS) ||
    hadRecentEvent(candidate.key, events, today, 'not_relevant', NOT_RELEVANT_COOLDOWN_DAYS)
  );
}

function hasActiveRecommendationForToday(tasks: CalendarTaskRow[], today: string): boolean {
  return tasks.some((task) => (
    task.task_date === today &&
    getTaskSource(task) === 'platform' &&
    shouldShowAsDailyCommand(task, today)
  ));
}

function isBlockedByMissingFoundation(
  stageTask: { id: string },
  toolSignals: ToolCompletionSignals,
): boolean {
  return stageTask.id === 'identity-icp-profile' && !toolSignals.icpCompleted;
}

/**
 * Open platform suggestion from a previous day, newest first. The engine
 * reschedules this task to today instead of stacking a duplicate row.
 */
export function findCarryForwardPlatformTask(tasks: CalendarTaskRow[], today: string): CalendarTaskRow | null {
  const open = tasks
    .filter((task) => (
      task.task_date < today &&
      getTaskSource(task) === 'platform' &&
      !task.is_completed &&
      task.recommendation_status !== 'dismissed' &&
      shouldShowAsDailyCommand(task, today)
    ))
    .sort((a, b) => {
      if (a.task_date !== b.task_date) return b.task_date.localeCompare(a.task_date);
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });

  return open[0] ?? null;
}

/**
 * A platform suggestion the user has ignored for CARRY_FORWARD_MAX_AGE_DAYS
 * should expire (auto-dismiss) instead of rolling forward forever.
 */
export function isPlatformTaskExpired(task: CalendarTaskRow, today: string): boolean {
  if (isFoundationalTask(task) || isTaskCoolingDown(task, today)) return true;
  const anchor = task.created_at ? toDateKey(new Date(task.created_at)) : task.task_date;
  const expiryDate = addDays(parseDateKey(anchor), CARRY_FORWARD_MAX_AGE_DAYS);
  return isBefore(expiryDate, parseDateKey(today));
}

function firstAllowedRecommendation(
  candidates: TaskRecommendation[],
  events: RecommendationEventRow[],
  today: string,
): TaskRecommendation | null {
  const allowed = candidates.filter((candidate) => (
    !isUserSuppressed(candidate, events, today) &&
    !hadRecentEvent(candidate.key, events, today, 'suggested', SUGGESTED_KEY_COOLDOWN_DAYS)
  ));

  if (allowed.length === 0) {
    const fallbackCandidates = candidates.filter((candidate) => !isUserSuppressed(candidate, events, today));
    // Everything is cooling down; fall back to the least-recently-touched
    // candidate rather than recommending nothing forever.
    return fallbackCandidates.length > 0
      ? [...fallbackCandidates].sort((a, b) => lastSuggestedAt(a.key, events) - lastSuggestedAt(b.key, events))[0]
      : null;
  }

  // Rotate: prefer candidates never suggested before (in priority order),
  // then the one whose last suggestion is oldest.
  return [...allowed]
    .map((candidate, index) => ({ candidate, index, last: lastSuggestedAt(candidate.key, events) }))
    .sort((a, b) => (a.last !== b.last ? a.last - b.last : a.index - b.index))[0].candidate;
}

export function selectSmartTaskRecommendation(context: RecommendationContext): TaskRecommendation | null {
  const { currentStage, events, tasks, today, toolSignals, weeklyMission } = context;

  if (hasActiveRecommendationForToday(tasks, today)) return null;

  const incompleteTasks = tasks.filter((task) => !task.is_completed && shouldShowAsDailyCommand(task, today));
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
      intentType: 'accountability',
    });
  }

  const stageTasks = STAGE_TASKS[currentStage] ?? [];
  const completedTitles = new Set(
    tasks
      .filter((task) => task.is_completed)
      .map((task) => task.task_text.trim().toLowerCase()),
  );

  const actionableStageTasks = stageTasks.filter((stageTask) => !isBlockedByMissingFoundation(stageTask, toolSignals));

  const stageCandidates = actionableStageTasks
    .filter((stageTask) => !completedTitles.has(stageTask.title.trim().toLowerCase()))
    .map<TaskRecommendation>((stageTask) => ({
      key: `stage:${currentStage}:${stageTask.id}`,
      title: stageTask.title,
      description: `Move Stage ${currentStage.toLowerCase()} forward with one concrete Startup Development Cycle action.`,
      reason: `This is the next highest-leverage task for your current ${currentStage.toLowerCase()} stage.`,
      priority: stageTask.priority,
      stage: currentStage,
      sourceRoute: stageTask.route,
      intentType: 'stage_action',
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
      intentType: 'foundational',
      sourceTool: 'icp-builder',
      isFoundational: true,
      maxSuggestions: FOUNDATIONAL_MAX_SUGGESTIONS,
    },
    currentStage !== 'IDENTITY' && !toolSignals.waitlistCompleted && {
      key: 'tool:waitlist-maker',
      title: 'Publish or mark ready your waitlist page',
      description: 'Turn your positioning into a demand-capture page so you can start collecting market signals.',
      reason: 'A visible waitlist gives you real demand feedback instead of internal planning.',
      priority: 'high',
      stage: 'PROTOTYPE' as BizMapStage,
      sourceRoute: '/demo-studio',
      intentType: 'foundational',
      sourceTool: 'waitlist-maker',
      isFoundational: true,
      maxSuggestions: FOUNDATIONAL_MAX_SUGGESTIONS,
    },
    currentStage === 'VALIDATING' && !toolSignals.pmfCompleted && {
      key: 'tool:pmf-lab',
      title: 'Add fresh validation evidence in PMF Lab',
      description: 'Capture interview or survey signals and update your PMF checklist so the validation score reflects reality.',
      reason: 'Your current stage needs stronger evidence before the platform can recommend build or launch work.',
      priority: 'high',
      stage: 'VALIDATING' as BizMapStage,
      sourceRoute: '/pmf-lab',
      intentType: 'foundational',
      sourceTool: 'pmf-lab',
      isFoundational: true,
      maxSuggestions: FOUNDATIONAL_MAX_SUGGESTIONS,
    },
    currentStage === 'BUILDING' && !toolSignals.techStackCompleted && {
      key: 'tool:tech-stack',
      title: 'Save your Tech Stack recommendation',
      description: 'Choose the core tools and budget for your MVP so build decisions are concrete.',
      reason: 'The build stage needs a clear stack and budget before execution gets expensive.',
      priority: 'high',
      stage: 'BUILDING' as BizMapStage,
      sourceRoute: '/tech-stack',
      intentType: 'foundational',
      sourceTool: 'tech-stack',
      isFoundational: true,
      maxSuggestions: FOUNDATIONAL_MAX_SUGGESTIONS,
    },
    currentStage === 'BUILDING' && !toolSignals.mvpCompleted && {
      key: 'tool:mvp-builder',
      title: 'Save your MVP scope',
      description: 'Lock the smallest buildable version of the product and identify what can wait.',
      reason: 'A focused MVP scope protects you from building too much too soon.',
      priority: 'high',
      stage: 'BUILDING' as BizMapStage,
      sourceRoute: '/mvp-builder',
      intentType: 'foundational',
      sourceTool: 'mvp-builder',
      isFoundational: true,
      maxSuggestions: FOUNDATIONAL_MAX_SUGGESTIONS,
    },
    currentStage === 'LAUNCH' && !toolSignals.gtmCompleted && {
      key: 'tool:gtm-plan',
      title: 'Save your GTM launch plan',
      description: 'Choose the first acquisition channels, launch assets, and KPIs you will track.',
      reason: 'Launch momentum depends on a clear distribution plan, not a generic announcement.',
      priority: 'high',
      stage: 'LAUNCH' as BizMapStage,
      sourceRoute: '/go-to-market',
      intentType: 'foundational',
      sourceTool: 'gtm-plan',
      isFoundational: true,
      maxSuggestions: FOUNDATIONAL_MAX_SUGGESTIONS,
    },
  ].filter(Boolean) as TaskRecommendation[];

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
      intentType: 'weekly_mission',
    });
  }

  candidates.push(...stageCandidates);

  candidates.push({
    key: `fallback:${currentStage}`,
    title: actionableStageTasks[0]?.title ?? 'Choose one customer-facing action for today',
    description: actionableStageTasks[0]
      ? `Start with the most concrete action in Stage ${currentStage.toLowerCase()} and finish it before opening new work.`
      : 'Pick one action that creates customer evidence, product clarity, or launch momentum.',
    reason: 'A single focused task keeps momentum visible even when the roadmap is still forming.',
    priority: actionableStageTasks[0]?.priority ?? 'medium',
    stage: currentStage,
    sourceRoute: actionableStageTasks[0]?.route ?? '/dashboard',
    intentType: 'daily_momentum',
  });

  return firstAllowedRecommendation(candidates, events, today)
    ?? firstAllowedRecommendation(toolCandidates, events, today);
}

export function getFoundationalMilestones(toolSignals: ToolCompletionSignals): FoundationalMilestone[] {
  return [
    {
      key: 'tool:icp-builder',
      title: 'ICP Builder draft',
      description: 'Customer, pain, buying trigger, and positioning.',
      route: '/icp-builder',
      sourceTool: 'icp-builder',
      completed: Boolean(toolSignals.icpCompleted),
      stage: 'IDENTITY',
    },
    {
      key: 'tool:waitlist-maker',
      title: 'Waitlist page',
      description: 'A live demand-capture page for early market signals.',
      route: '/demo-studio',
      sourceTool: 'waitlist-maker',
      completed: Boolean(toolSignals.waitlistCompleted),
      stage: 'PROTOTYPE',
    },
    {
      key: 'tool:pmf-lab',
      title: 'PMF evidence',
      description: 'Interview, survey, or validation evidence captured.',
      route: '/pmf-lab',
      sourceTool: 'pmf-lab',
      completed: Boolean(toolSignals.pmfCompleted),
      stage: 'VALIDATING',
    },
    {
      key: 'tool:tech-stack',
      title: 'Tech Stack recommendation',
      description: 'Core tools and budget saved for the build.',
      route: '/tech-stack',
      sourceTool: 'tech-stack',
      completed: Boolean(toolSignals.techStackCompleted),
      stage: 'BUILDING',
    },
    {
      key: 'tool:mvp-builder',
      title: 'MVP scope',
      description: 'A saved smallest-buildable product direction.',
      route: '/mvp-builder',
      sourceTool: 'mvp-builder',
      completed: Boolean(toolSignals.mvpCompleted),
      stage: 'BUILDING',
    },
    {
      key: 'tool:gtm-plan',
      title: 'GTM launch plan',
      description: 'Channels, launch assets, and KPIs selected.',
      route: '/go-to-market',
      sourceTool: 'gtm-plan',
      completed: Boolean(toolSignals.gtmCompleted),
      stage: 'LAUNCH',
    },
  ];
}
