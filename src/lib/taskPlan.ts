import type { CalendarTaskRow } from './taskCalendar.ts';

export type TaskPlanView = 'today' | 'upcoming' | 'backlog' | 'history';

export interface DailyTaskPlan {
  id: string;
  user_id: string;
  plan_date: string;
  timezone: string;
  status: 'building' | 'ready' | 'failed';
  context_hash?: string | null;
  context_snapshot?: Record<string, unknown> | null;
  policy_version: string;
  model: string;
  fallback_used: boolean;
  generated_at?: string | null;
}

export interface DailyTaskPlanItem {
  id: string;
  rank: number;
  carriedForward: boolean;
  optional?: boolean;
  selectionReason?: string | null;
  scoreBreakdown?: {
    impact?: number;
    urgency?: number;
    relevance?: number;
    effortFit?: number;
    total?: number;
  } | null;
  task: CalendarTaskRow;
}

export interface DailyTaskPlanPayload {
  plan: DailyTaskPlan;
  items: DailyTaskPlanItem[];
}

export function sortPlanItems(items: DailyTaskPlanItem[]): DailyTaskPlanItem[] {
  return [...items].sort((left, right) => left.rank - right.rank);
}

export function getPlanProgress(items: DailyTaskPlanItem[]) {
  const base = sortPlanItems(items).filter((item) => !item.optional).slice(0, 3);
  const completed = base.filter((item) => Boolean(item.task.is_completed)).length;
  return { completed, total: base.length, percentage: base.length ? Math.round((completed / base.length) * 100) : 0 };
}

export function getNextPlanItem(items: DailyTaskPlanItem[]): DailyTaskPlanItem | null {
  return sortPlanItems(items).find((item) => !item.task.is_completed) ?? null;
}

export function reorderPlanItemIds(items: DailyTaskPlanItem[], taskId: string, direction: -1 | 1): string[] {
  const ordered = sortPlanItems(items).map((item) => item.task.id);
  const index = ordered.indexOf(taskId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return ordered;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered;
}

export function isPlatformRecommendation(task: CalendarTaskRow) {
  return task.task_source === 'platform' || task.ai_generated === true;
}

export function taskEstimatedMinutes(task: CalendarTaskRow) {
  const value = Number(task.estimated_minutes ?? task.effort_estimate ?? 15);
  return Number.isFinite(value) ? Math.max(5, Math.min(240, Math.round(value))) : 15;
}
