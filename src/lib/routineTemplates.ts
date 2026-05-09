import { endOfWeek, format, startOfWeek } from 'date-fns';

import type { Json } from '@/integrations/supabase/types';

export type RoutineGoal =
  | 'validate_idea'
  | 'find_cofounders'
  | 'grow_audience'
  | 'launch_product'
  | 'raise_funding';

export type RoutineCadence = 'daily' | 'weekly';
export type RoutineTaskSource = 'template' | 'custom' | 'suggested';
export type RoutineCompletionStatus = 'completed' | 'skipped';
export type RoutinePeriodType = 'daily' | 'weekly';

export interface RoutineTask {
  id: string;
  title: string;
  cadence: RoutineCadence;
  days: number[];
  order: number;
  source: RoutineTaskSource;
  active: boolean;
}

export interface RoutineConfig {
  version: 1;
  primaryGoal: RoutineGoal;
  tasks: RoutineTask[];
  updatedAt: string;
}

export interface RoutineReminderPreferences {
  enabled: boolean;
  time: string;
}

export interface RoutineCompletion {
  id: string;
  routine_task_id: string;
  task_title: string;
  period_type: RoutinePeriodType;
  period_date: string;
  status: RoutineCompletionStatus;
  completed_at: string | null;
  created_at: string;
}

export interface LegacyWeeklyCommitment {
  id: string;
  mission_goal: string;
  week_start_date: string;
  week_end_date: string;
  status: string | null;
  commitment_outcome: string | null;
  reflection_text: string | null;
}

export interface RoutineProfileSnapshot {
  routine_primary_goal: string | null;
  routine_config: Json | null;
  routine_reminder_preferences: Json | null;
  quiz_current_stage: string | null;
  quiz_biggest_challenge: string | null;
  creative_niche: string | null;
  startup_stage: string | null;
  startup_name: string | null;
  startup_industry: string[] | null;
}

export const ROUTINE_GOAL_OPTIONS: Array<{
  value: RoutineGoal;
  label: string;
  description: string;
}> = [
  {
    value: 'validate_idea',
    label: 'Validate idea',
    description: 'Build a customer-learning rhythm before you build too much.',
  },
  {
    value: 'find_cofounders',
    label: 'Find cofounders',
    description: 'Create a steady cadence for outreach, follow-up, and fit checks.',
  },
  {
    value: 'grow_audience',
    label: 'Grow audience',
    description: 'Publish, learn, and convert attention into real conversations.',
  },
  {
    value: 'launch_product',
    label: 'Launch product',
    description: 'Keep build, QA, feedback, and distribution moving together.',
  },
  {
    value: 'raise_funding',
    label: 'Raise funding',
    description: 'Maintain investor prep, research, proof, and follow-up habits.',
  },
];

const WEEKDAYS = [1, 2, 3, 4, 5];
const MONDAY = [1];
const WEDNESDAY = [3];
const FRIDAY = [5];

const ROUTINE_TEMPLATES: Record<RoutineGoal, Omit<RoutineTask, 'order' | 'active'>[]> = {
  validate_idea: [
    { id: 'validate-daily-customer-signal', title: 'Capture one customer signal or objection', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'validate-daily-assumption', title: 'Write the riskiest assumption for today', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'validate-weekly-interviews', title: 'Review customer conversations and update the ICP', cadence: 'weekly', days: FRIDAY, source: 'template' },
  ],
  find_cofounders: [
    { id: 'cofounder-daily-outreach', title: 'Send one thoughtful cofounder outreach message', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'cofounder-daily-follow-up', title: 'Follow up with one promising founder or operator', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'cofounder-weekly-scorecard', title: 'Review fit signals and update your cofounder criteria', cadence: 'weekly', days: FRIDAY, source: 'template' },
  ],
  grow_audience: [
    { id: 'audience-daily-post', title: 'Publish or draft one founder-learning post', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'audience-daily-engage', title: 'Reply to five relevant people in your niche', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'audience-weekly-review', title: 'Review audience signals and pick next week\'s content angle', cadence: 'weekly', days: FRIDAY, source: 'template' },
  ],
  launch_product: [
    { id: 'launch-daily-build', title: 'Ship one small product improvement', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'launch-daily-feedback', title: 'Ask one user or prospect for feedback', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'launch-weekly-release', title: 'Publish a release note or launch update', cadence: 'weekly', days: WEDNESDAY, source: 'template' },
  ],
  raise_funding: [
    { id: 'funding-daily-proof', title: 'Strengthen one proof point for the investor story', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'funding-daily-investor', title: 'Research or follow up with one aligned investor', cadence: 'daily', days: WEEKDAYS, source: 'template' },
    { id: 'funding-weekly-pipeline', title: 'Review investor pipeline and next-step status', cadence: 'weekly', days: MONDAY, source: 'template' },
  ],
};

export const DEFAULT_REMINDER_PREFERENCES: RoutineReminderPreferences = {
  enabled: false,
  time: '09:00',
};

export function createRoutineConfig(goal: RoutineGoal, now = new Date()): RoutineConfig {
  return {
    version: 1,
    primaryGoal: goal,
    tasks: ROUTINE_TEMPLATES[goal].map((task, index) => ({
      ...task,
      order: index,
      active: true,
    })),
    updatedAt: now.toISOString(),
  };
}

export function parseRoutineGoal(value: string | null | undefined): RoutineGoal | null {
  return ROUTINE_GOAL_OPTIONS.some((goal) => goal.value === value) ? (value as RoutineGoal) : null;
}

export function parseRoutineConfig(value: Json | null | undefined): RoutineConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const candidate = value as Record<string, unknown>;
  const primaryGoal = parseRoutineGoal(typeof candidate.primaryGoal === 'string' ? candidate.primaryGoal : null);
  const tasks = Array.isArray(candidate.tasks) ? candidate.tasks : [];

  if (!primaryGoal || tasks.length === 0) return null;

  return {
    version: 1,
    primaryGoal,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    tasks: tasks
      .map((item, index): RoutineTask | null => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const task = item as Record<string, unknown>;
        const id = typeof task.id === 'string' && task.id.trim() ? task.id : `routine-task-${index}`;
        const title = typeof task.title === 'string' ? task.title.trim() : '';
        const cadence = task.cadence === 'weekly' ? 'weekly' : 'daily';
        const source =
          task.source === 'custom' || task.source === 'suggested' || task.source === 'template'
            ? task.source
            : 'custom';
        const days = Array.isArray(task.days)
          ? task.days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
          : cadence === 'daily'
            ? WEEKDAYS
            : FRIDAY;

        if (!title) return null;

        return {
          id,
          title,
          cadence,
          days,
          order: typeof task.order === 'number' ? task.order : index,
          source,
          active: typeof task.active === 'boolean' ? task.active : true,
        };
      })
      .filter((task): task is RoutineTask => Boolean(task))
      .sort((a, b) => a.order - b.order),
  };
}

export function parseReminderPreferences(value: Json | null | undefined): RoutineReminderPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_REMINDER_PREFERENCES;
  }

  const candidate = value as Record<string, unknown>;
  const time = typeof candidate.time === 'string' && /^\d{2}:\d{2}$/.test(candidate.time)
    ? candidate.time
    : DEFAULT_REMINDER_PREFERENCES.time;

  return {
    enabled: Boolean(candidate.enabled),
    time,
  };
}

export function serializeRoutineConfig(config: RoutineConfig): Json {
  return config as unknown as Json;
}

export function serializeReminderPreferences(preferences: RoutineReminderPreferences): Json {
  return preferences as unknown as Json;
}

export function getLocalDateKey(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

export function getWeekStartKey(date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getWeekEndLabel(date = new Date()) {
  return format(endOfWeek(date, { weekStartsOn: 1 }), 'MMM d');
}

export function getRoutineTasksForToday(config: RoutineConfig, date = new Date()) {
  const day = date.getDay();
  return config.tasks
    .filter((task) => task.active && task.cadence === 'daily' && task.days.includes(day))
    .sort((a, b) => a.order - b.order);
}

export function getRoutineTasksForWeek(config: RoutineConfig) {
  return config.tasks
    .filter((task) => task.active && task.cadence === 'weekly')
    .sort((a, b) => a.order - b.order);
}

export function getCompletionKey(taskId: string, periodType: RoutinePeriodType, periodDate: string) {
  return `${taskId}:${periodType}:${periodDate}`;
}

export function buildRoutineSuggestions(profile: RoutineProfileSnapshot, config: RoutineConfig | null): RoutineTask[] {
  const existingTitles = new Set((config?.tasks ?? []).map((task) => task.title.toLowerCase()));
  const suggestions: RoutineTask[] = [];
  const stage = `${profile.quiz_current_stage ?? ''} ${profile.startup_stage ?? ''}`.toLowerCase();
  const challenge = profile.quiz_biggest_challenge?.toLowerCase() ?? '';
  const niche = profile.creative_niche || profile.startup_industry?.[0] || 'your niche';

  const addSuggestion = (id: string, title: string, cadence: RoutineCadence, days: number[]) => {
    if (existingTitles.has(title.toLowerCase())) return;
    suggestions.push({
      id,
      title,
      cadence,
      days,
      order: (config?.tasks.length ?? 0) + suggestions.length,
      source: 'suggested',
      active: true,
    });
  };

  if (stage.includes('idea') || stage.includes('validation') || challenge.includes('customer')) {
    addSuggestion('suggested-customer-learning', 'Log one new customer-learning note', 'daily', WEEKDAYS);
  }

  if (stage.includes('launch') || challenge.includes('audience') || challenge.includes('growth')) {
    addSuggestion('suggested-distribution-review', `Review one distribution signal in ${niche}`, 'weekly', FRIDAY);
  }

  if (stage.includes('fund') || challenge.includes('fund')) {
    addSuggestion('suggested-investor-proof', 'Update one investor proof point or metric', 'weekly', MONDAY);
  }

  if (suggestions.length === 0) {
    addSuggestion('suggested-weekly-retro', 'Review what worked and choose next week\'s smallest repeatable habit', 'weekly', FRIDAY);
  }

  return suggestions.slice(0, 3);
}

export function createCustomRoutineTask(title: string, cadence: RoutineCadence, order: number): RoutineTask {
  const normalizedTitle = title.trim();
  const slug = normalizedTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42);
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : String(Date.now()).slice(-8);

  return {
    id: `custom-${slug || 'task'}-${suffix}`,
    title: normalizedTitle,
    cadence,
    days: cadence === 'daily' ? WEEKDAYS : FRIDAY,
    order,
    source: 'custom',
    active: true,
  };
}
