import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, format } from 'date-fns';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { CalendarTaskRow, TaskPriority } from '@/lib/taskCalendar';
import {
  getPlanProgress,
  reorderPlanItemIds,
  sortPlanItems,
  type DailyTaskPlanPayload,
  type TaskPlanView,
} from '@/lib/taskPlan';

const TASK_TABLE = 'daily_tasks' as any;
const PAGE_SIZE = 40;

export interface TaskDraft {
  title: string;
  description?: string;
  date: string;
  priority?: TaskPriority;
  estimatedMinutes?: number;
}

function localDateKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

function deadlineForDate(date: string) {
  return endOfDay(new Date(`${date}T00:00:00`)).toISOString();
}

export function useDailyTaskPlan() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const today = localDateKey();
  const [payload, setPayload] = useState<DailyTaskPlanPayload | null>(null);
  const [manualToday, setManualToday] = useState<CalendarTaskRow[]>([]);
  const [overdue, setOverdue] = useState<CalendarTaskRow[]>([]);
  const [listTasks, setListTasks] = useState<CalendarTaskRow[]>([]);
  const [listView, setListView] = useState<TaskPlanView>('today');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayLists = useCallback(async () => {
    if (!userId) return;
    const [manualResult, overdueResult] = await Promise.all([
      supabase.from(TASK_TABLE).select('*').eq('user_id', userId).eq('task_date', today)
        .eq('task_source', 'manual').or('recommendation_status.is.null,recommendation_status.neq.dismissed')
        .order('is_completed').order('created_at'),
      supabase.from(TASK_TABLE).select('*').eq('user_id', userId).lt('task_date', today)
        .eq('is_completed', false).or('recommendation_status.is.null,recommendation_status.neq.dismissed')
        .order('task_date').order('created_at').limit(50),
    ]);
    if (!manualResult.error) setManualToday((manualResult.data ?? []) as CalendarTaskRow[]);
    if (!overdueResult.error) setOverdue((overdueResult.data ?? []) as CalendarTaskRow[]);
  }, [today, userId]);

  const loadPlan = useCallback(async (additional = false) => {
    if (!userId) {
      setPayload(null);
      setIsLoading(false);
      return;
    }
    setError(null);
    const edge = await supabase.functions.invoke('ensure-daily-task-plan', {
      body: { timezone, additional },
    });
    let data = edge.data;
    let requestError = edge.error;
    if (requestError || !data) {
      const fallback = await supabase.rpc('get_today_task_plan_v1', {
        p_timezone: timezone,
        p_additional: additional,
      });
      data = fallback.data;
      requestError = fallback.error;
    }
    if (requestError || !data) {
      setError('Today\'s plan could not be prepared. Try again in a moment.');
    } else {
      const next = data as unknown as DailyTaskPlanPayload;
      setPayload({ ...next, items: sortPlanItems(next.items ?? []) });
    }
    await fetchTodayLists();
    setIsLoading(false);
  }, [fetchTodayLists, timezone, userId]);

  const loadView = useCallback(async (view: TaskPlanView, nextPage = 0, append = false) => {
    if (!userId || view === 'today') return;
    setIsListLoading(true);
    let query = supabase.from(TASK_TABLE).select('*').eq('user_id', userId)
      .or('recommendation_status.is.null,recommendation_status.neq.dismissed');
    if (view === 'upcoming') query = query.gt('task_date', today).eq('is_completed', false).order('task_date');
    if (view === 'backlog') query = query.lte('task_date', today).eq('is_completed', false).order('task_date', { ascending: false });
    if (view === 'history') query = query.eq('is_completed', true).order('completed_at', { ascending: false });
    const from = nextPage * PAGE_SIZE;
    const result = await query.range(from, from + PAGE_SIZE - 1);
    if (result.error) {
      toast.error('Unable to load tasks.');
    } else {
      const rows = (result.data ?? []) as CalendarTaskRow[];
      setListTasks((current) => append ? [...current, ...rows] : rows);
      setHasMore(rows.length === PAGE_SIZE);
      setPage(nextPage);
    }
    setIsListLoading(false);
  }, [today, userId]);

  useEffect(() => { void loadPlan(); }, [loadPlan]);

  useEffect(() => {
    if (!userId || isLoading) return;
    const refresh = () => void loadPlan();
    const channel = supabase.channel(`daily-task-plan:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks', filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isLoading, loadPlan, userId]);

  const selectView = useCallback((view: TaskPlanView) => {
    setListView(view);
    setListTasks([]);
    setPage(0);
    if (view !== 'today') void loadView(view, 0, false);
  }, [loadView]);

  const openDeepLinkTask = useCallback(async (taskId: string, dateHint?: string | null) => {
    if (!userId) return false;
    const result = await supabase.from(TASK_TABLE).select('*').eq('id', taskId).eq('user_id', userId).maybeSingle();
    if (result.error || !result.data) return false;
    const task = result.data as CalendarTaskRow;
    const taskDate = task.task_date || dateHint || today;
    const isInTodayPlan = payload?.items.some((item) => item.task.id === task.id) ?? false;
    const view: TaskPlanView = isInTodayPlan
      ? 'today'
      : task.is_completed
      ? 'history'
      : taskDate > today
        ? 'upcoming'
        : taskDate < today
          ? 'backlog'
          : 'today';
    setListView(view);
    if (view !== 'today') {
      await loadView(view, 0, false);
      setListTasks((current) => current.some((entry) => entry.id === task.id) ? current : [task, ...current]);
    }
    return true;
  }, [loadView, payload, today, userId]);

  const mutateRecommendation = useCallback(async (
    taskId: string,
    action: 'complete' | 'reopen' | 'make_next' | 'edit' | 'reschedule' | 'snooze' | 'replace' | 'not_relevant',
    actionPayload: Record<string, unknown> = {},
  ) => {
    setIsMutating(true);
    const result = await supabase.rpc('act_on_task_recommendation_v1', {
      p_task_id: taskId,
      p_action: action,
      p_payload: actionPayload as Json,
      p_timezone: timezone,
    });
    setIsMutating(false);
    if (result.error) {
      toast.error('Unable to update this recommendation.');
      return false;
    }
    const next = result.data as unknown as DailyTaskPlanPayload;
    setPayload({ ...next, items: sortPlanItems(next.items ?? []) });
    await fetchTodayLists();
    return true;
  }, [fetchTodayLists, timezone]);

  const reorderRecommendation = useCallback(async (taskId: string, direction: -1 | 1) => {
    if (!payload) return;
    const taskIds = reorderPlanItemIds(payload.items, taskId, direction);
    setIsMutating(true);
    const result = await supabase.rpc('reorder_today_task_plan_v1', {
      p_task_ids: taskIds,
      p_timezone: timezone,
    });
    setIsMutating(false);
    if (result.error) toast.error('Unable to reorder today\'s plan.');
    else setPayload(result.data as unknown as DailyTaskPlanPayload);
  }, [payload, timezone]);

  const createManualTask = useCallback(async (draft: TaskDraft) => {
    if (!userId || !draft.title.trim()) return false;
    setIsMutating(true);
    const result = await supabase.from(TASK_TABLE).insert({
      user_id: userId,
      task_text: draft.title.trim(),
      task_description: draft.description?.trim() || null,
      task_date: draft.date,
      deadline_time: deadlineForDate(draft.date),
      priority: draft.priority ?? 'medium',
      estimated_minutes: draft.estimatedMinutes ?? 15,
      task_source: 'manual',
      ai_generated: false,
      is_completed: false,
    });
    setIsMutating(false);
    if (result.error) { toast.error('Unable to add task.'); return false; }
    await fetchTodayLists();
    toast.success('Task added.');
    return true;
  }, [fetchTodayLists, userId]);

  const updateTask = useCallback(async (task: CalendarTaskRow, patch: Partial<CalendarTaskRow>) => {
    setIsMutating(true);
    const databasePatch = patch.task_date && patch.task_date !== task.task_date
      ? { ...patch, deadline_time: deadlineForDate(patch.task_date), rescheduled_from_date: task.task_date, rescheduled_at: new Date().toISOString() }
      : patch;
    const result = await supabase.from(TASK_TABLE).update({ ...databasePatch, user_modified_at: new Date().toISOString() }).eq('id', task.id);
    setIsMutating(false);
    if (result.error) { toast.error('Unable to update task.'); return false; }
    await fetchTodayLists();
    if (listView !== 'today') await loadView(listView, 0, false);
    return true;
  }, [fetchTodayLists, listView, loadView]);

  const deleteManualTask = useCallback(async (task: CalendarTaskRow) => {
    setIsMutating(true);
    const result = await supabase.from(TASK_TABLE).delete().eq('id', task.id).eq('task_source', 'manual');
    setIsMutating(false);
    if (result.error) toast.error('Unable to delete task.');
    else await fetchTodayLists();
  }, [fetchTodayLists]);

  const planItems = payload?.items ?? [];
  const progress = useMemo(() => getPlanProgress(planItems), [planItems]);
  const baseComplete = progress.total === 3 && progress.completed === 3;
  const plannedTaskIds = useMemo(() => new Set(planItems.map((item) => item.task.id)), [planItems]);
  const todayTaskIds = useMemo(() => new Set([...plannedTaskIds, ...manualToday.map((task) => task.id)]), [manualToday, plannedTaskIds]);
  const visibleOverdue = useMemo(() => overdue.filter((task) => !plannedTaskIds.has(task.id)), [overdue, plannedTaskIds]);
  const visibleListTasks = useMemo(
    () => listView === 'backlog' ? listTasks.filter((task) => !todayTaskIds.has(task.id)) : listTasks,
    [listTasks, listView, todayTaskIds],
  );

  return {
    payload, planItems, progress, baseComplete, manualToday, overdue: visibleOverdue, listTasks: visibleListTasks,
    listView, page, hasMore, today, timezone, isLoading, isListLoading, isMutating, error,
    loadPlan, selectView, openDeepLinkTask, loadMore: () => loadView(listView, page + 1, true),
    mutateRecommendation, reorderRecommendation, createManualTask, updateTask, deleteManualTask,
    addNextTask: () => loadPlan(true),
  };
}
