import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import {
  addDaysToDateKey,
  buildCalendarDays,
  getDayTaskStatus,
  groupTasksByDate,
  selectSmartTaskRecommendation,
  sortTasksForDay,
  toDateKey,
  type CalendarTaskRow,
  type RecommendationEventRow,
  type TaskCalendarView,
  type TaskPriority,
  type ToolCompletionSignals,
  type WeeklyMissionSignal,
} from '@/lib/taskCalendar';
import type { BizMapStage } from '@/lib/bizmapStages';

interface CreateManualTaskInput {
  title: string;
  description?: string;
  deadlineDate: string;
  priority?: TaskPriority;
  stageTag?: BizMapStage | '';
}

const TASK_TABLE = 'daily_tasks' as any;
const RECOMMENDATION_EVENTS_TABLE = 'task_recommendation_events' as any;

function deadlineForDate(dateKey: string): string {
  return endOfDay(new Date(`${dateKey}T00:00:00`)).toISOString();
}

function isPlatformTaskForDate(task: CalendarTaskRow, dateKey: string): boolean {
  return task.task_date === dateKey && (task.task_source === 'platform' || task.ai_generated === true);
}

async function countLatest(table: string, userId: string, extra?: (query: any) => any): Promise<boolean> {
  let query = supabase.from(table as any).select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (extra) query = extra(query);
  const { count, error } = await query;
  if (error) {
    console.warn(`Unable to read ${table} for task recommendation context`, error);
    return false;
  }
  return Number(count ?? 0) > 0;
}

export function useTaskCalendarEngine() {
  const { user } = useAuth();
  const { currentStage } = useBizMapProgress();
  const [view, setView] = useState<TaskCalendarView>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [tasks, setTasks] = useState<CalendarTaskRow[]>([]);
  const [events, setEvents] = useState<RecommendationEventRow[]>([]);
  const [weeklyMission, setWeeklyMission] = useState<WeeklyMissionSignal | null>(null);
  const [toolSignals, setToolSignals] = useState<ToolCompletionSignals>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const ensuredTodayRef = useRef<string | null>(null);

  const calendarDays = useMemo(() => buildCalendarDays(anchorDate, view), [anchorDate, view]);
  const groupedTasks = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const selectedTasks = useMemo(
    () => sortTasksForDay(groupedTasks[selectedDate] ?? []),
    [groupedTasks, selectedDate],
  );

  const dayStatuses = useMemo(() => {
    return calendarDays.reduce<Record<string, ReturnType<typeof getDayTaskStatus>>>((acc, day) => {
      const key = toDateKey(day);
      acc[key] = getDayTaskStatus(groupedTasks[key] ?? []);
      return acc;
    }, {});
  }, [calendarDays, groupedTasks]);

  const fetchToolSignals = useCallback(async (userId: string): Promise<ToolCompletionSignals> => {
    const [
      icpCompleted,
      waitlistCompleted,
      pmfCompleted,
      mvpCompleted,
      techStackCompleted,
      gtmCompleted,
    ] = await Promise.all([
      countLatest('icp_analysis_results', userId),
      countLatest('waitlist_pages', userId, (query) => query.in('status', ['published', 'exported'])),
      countLatest('pmf_analysis_results', userId),
      countLatest('mvp_builder_artifacts', userId, (query) => query.eq('status', 'saved')),
      countLatest('tech_stack_reports', userId),
      countLatest('gtm_plans', userId, (query) => query.in('status', ['saved', 'exported'])),
    ]);

    return {
      icpCompleted,
      waitlistCompleted,
      pmfCompleted,
      mvpCompleted,
      techStackCompleted,
      gtmCompleted,
    };
  }, []);

  const fetchWeeklyMission = useCallback(async (userId: string): Promise<WeeklyMissionSignal | null> => {
    const today = toDateKey(new Date());
    const { data, error } = await supabase
      .from('weekly_missions' as any)
      .select('id, mission_goal, completion_percentage')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('week_start_date', today)
      .gte('week_end_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Unable to read weekly mission for task recommendation context', error);
      return null;
    }

    return (data as WeeklyMissionSignal | null) ?? null;
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setEvents([]);
      setWeeklyMission(null);
      setToolSignals({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [tasksResult, eventsResult, nextSignals, nextWeeklyMission] = await Promise.all([
      supabase
        .from(TASK_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('task_date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(500),
      supabase
        .from(RECOMMENDATION_EVENTS_TABLE)
        .select('recommendation_key, event_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      fetchToolSignals(user.id),
      fetchWeeklyMission(user.id),
    ]);

    if (tasksResult.error) {
      console.error('Failed to load tasks', tasksResult.error);
      toast.error('Unable to load your task calendar.');
    } else {
      setTasks((tasksResult.data ?? []) as CalendarTaskRow[]);
    }

    if (eventsResult.error) {
      console.warn('Failed to load recommendation events', eventsResult.error);
      setEvents([]);
    } else {
      setEvents((eventsResult.data ?? []) as RecommendationEventRow[]);
    }

    setToolSignals(nextSignals);
    setWeeklyMission(nextWeeklyMission);
    setIsLoading(false);
  }, [fetchToolSignals, fetchWeeklyMission, user]);

  const logRecommendationEvent = useCallback(async (
    task: CalendarTaskRow,
    eventType: 'accepted' | 'dismissed' | 'rescheduled' | 'completed',
    metadata: Record<string, unknown> = {},
  ) => {
    if (!user || !task.recommendation_key) return;
    const { error } = await supabase.from(RECOMMENDATION_EVENTS_TABLE).insert({
      user_id: user.id,
      task_id: task.id,
      recommendation_key: task.recommendation_key,
      event_type: eventType,
      metadata,
    });
    if (error) console.warn('Unable to log recommendation event', error);
  }, [user]);

  const syncStageTaskProgress = useCallback(async (task: CalendarTaskRow, completed: boolean) => {
    if (!user || !task.recommendation_key?.startsWith('stage:')) return;
    const [, stage, taskId] = task.recommendation_key.split(':');
    if (!stage || !taskId) return;

    const { error } = await supabase
      .from('bizmap_task_progress' as any)
      .upsert(
        {
          user_id: user.id,
          stage,
          task_id: taskId,
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,task_id' },
      );

    if (error) console.warn('Unable to sync Startup Development Cycle task progress', error);
  }, [user]);

  const ensureTodayRecommendation = useCallback(async () => {
    if (!user) return;
    const today = toDateKey(new Date());
    if (ensuredTodayRef.current === `${user.id}:${today}:${tasks.length}:${events.length}:${currentStage}`) return;
    ensuredTodayRef.current = `${user.id}:${today}:${tasks.length}:${events.length}:${currentStage}`;

    const hasAnyPlatformTaskToday = tasks.some((task) => isPlatformTaskForDate(task, today));
    if (hasAnyPlatformTaskToday) return;

    const recommendation = selectSmartTaskRecommendation({
      currentStage,
      today,
      tasks,
      events,
      toolSignals,
      weeklyMission,
    });

    if (!recommendation) return;

    const { error } = await supabase.from(TASK_TABLE).insert({
      user_id: user.id,
      task_text: recommendation.title,
      task_description: recommendation.description,
      task_date: today,
      deadline_time: deadlineForDate(today),
      priority: recommendation.priority,
      is_completed: false,
      ai_generated: true,
      task_source: 'platform',
      recommendation_status: 'suggested',
      recommendation_key: recommendation.key,
      recommendation_reason: recommendation.reason,
      startup_stage_tag: recommendation.stage,
      source_route: recommendation.sourceRoute ?? null,
      contributes_to_weekly_mission: recommendation.contributesToWeeklyMission ?? false,
      business_impact_score: recommendation.priority === 'high' ? 8 : 6,
      effort_estimate: 2,
      stage_alignment_score: 8,
    });

    if (error) {
      console.warn('Unable to create daily recommendation', error);
      return;
    }

    await fetchTasks();
  }, [currentStage, events, fetchTasks, tasks, toolSignals, user, weeklyMission]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    void ensureTodayRecommendation();
  }, [ensureTodayRecommendation]);

  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      void fetchTasks();
    };

    const channel = supabase
      .channel(`task-calendar:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_recommendation_events', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_missions', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'icp_analysis_results', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pmf_analysis_results', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tech_stack_reports', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bizmap_task_progress', filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, user]);

  const createManualTask = useCallback(async (input: CreateManualTaskInput) => {
    if (!user || !input.title.trim()) return false;
    setIsMutating(true);

    const { error } = await supabase.from(TASK_TABLE).insert({
      user_id: user.id,
      task_text: input.title.trim(),
      task_description: input.description?.trim() || null,
      task_date: input.deadlineDate,
      deadline_time: deadlineForDate(input.deadlineDate),
      priority: input.priority ?? 'medium',
      is_completed: false,
      ai_generated: false,
      task_source: 'manual',
      startup_stage_tag: input.stageTag || null,
    });

    setIsMutating(false);
    if (error) {
      toast.error('Unable to add task.');
      return false;
    }

    setSelectedDate(input.deadlineDate);
    setAnchorDate(parseLocalDate(input.deadlineDate));
    await fetchTasks();
    toast.success('Task added.');
    return true;
  }, [fetchTasks, user]);

  const completeTask = useCallback(async (task: CalendarTaskRow, completed: boolean) => {
    setIsMutating(true);
    const { error } = await supabase
      .from(TASK_TABLE)
      .update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
    setIsMutating(false);

    if (error) {
      toast.error('Unable to update task.');
      return;
    }

    if (completed) {
      await logRecommendationEvent(task, 'completed');
    }
    await syncStageTaskProgress(task, completed);
    await fetchTasks();
  }, [fetchTasks, logRecommendationEvent, syncStageTaskProgress]);

  const acceptRecommendation = useCallback(async (task: CalendarTaskRow) => {
    setIsMutating(true);
    const { error } = await supabase
      .from(TASK_TABLE)
      .update({ recommendation_status: 'accepted' })
      .eq('id', task.id);
    setIsMutating(false);

    if (error) {
      toast.error('Unable to accept recommendation.');
      return;
    }

    await logRecommendationEvent(task, 'accepted');
    await fetchTasks();
  }, [fetchTasks, logRecommendationEvent]);

  const dismissRecommendation = useCallback(async (task: CalendarTaskRow) => {
    setIsMutating(true);
    const { error } = await supabase
      .from(TASK_TABLE)
      .update({
        recommendation_status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', task.id);
    setIsMutating(false);

    if (error) {
      toast.error('Unable to dismiss recommendation.');
      return;
    }

    await logRecommendationEvent(task, 'dismissed');
    await fetchTasks();
  }, [fetchTasks, logRecommendationEvent]);

  const rescheduleTask = useCallback(async (task: CalendarTaskRow, nextDate: string) => {
    setIsMutating(true);
    const { error } = await supabase
      .from(TASK_TABLE)
      .update({
        task_date: nextDate,
        deadline_time: deadlineForDate(nextDate),
        rescheduled_from_date: task.task_date,
        rescheduled_at: new Date().toISOString(),
        overdue_reminder_level: 0,
        overdue_reminder_sent_at: null,
        deadline_expired_notification_sent_at: null,
        last_reminder_sent: null,
        recommendation_status: task.task_source === 'platform' ? 'accepted' : task.recommendation_status ?? null,
      })
      .eq('id', task.id);
    setIsMutating(false);

    if (error) {
      toast.error('Unable to reschedule task.');
      return;
    }

    await logRecommendationEvent(task, 'rescheduled', { from: task.task_date, to: nextDate });
    setSelectedDate(nextDate);
    setAnchorDate(parseLocalDate(nextDate));
    await fetchTasks();
  }, [fetchTasks, logRecommendationEvent]);

  return {
    view,
    setView,
    anchorDate,
    setAnchorDate,
    selectedDate,
    setSelectedDate,
    calendarDays,
    tasks,
    groupedTasks,
    selectedTasks,
    dayStatuses,
    currentStage,
    isLoading,
    isMutating,
    createManualTask,
    completeTask,
    acceptRecommendation,
    dismissRecommendation,
    rescheduleTask,
    refetch: fetchTasks,
  };
}

function parseLocalDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

export function getTomorrowDateKey(dateKey: string): string {
  return addDaysToDateKey(dateKey, 1);
}
