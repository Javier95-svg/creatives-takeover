import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { fetchToolCompletionSignals } from '@/lib/founderSignals';
import {
  addDaysToDateKey,
  buildCalendarDays,
  getDayTaskStatus,
  getFoundationalMilestones,
  groupTasksByDate,
  sortTasksForDay,
  toDateKey,
  type CalendarTaskRow,
  type RecommendationEventType,
  type RecommendationFeedbackAction,
  type TaskCalendarView,
  type TaskPriority,
  type ToolCompletionSignals,
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
const FEEDBACK_COOLDOWN_DAYS: Record<RecommendationFeedbackAction, number> = {
  remind_later: 7,
  not_relevant: 30,
  already_done: 365,
  stop_showing: 3650,
};

function deadlineForDate(dateKey: string): string {
  return endOfDay(new Date(`${dateKey}T00:00:00`)).toISOString();
}

function cooldownUntil(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function useTaskCalendarEngine() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { currentStage } = useBizMapProgress();
  const [view, setView] = useState<TaskCalendarView>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [tasks, setTasks] = useState<CalendarTaskRow[]>([]);
  const [toolSignals, setToolSignals] = useState<ToolCompletionSignals>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const loadedUserIdRef = useRef<string | null>(null);

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
  const foundationalMilestones = useMemo(() => getFoundationalMilestones(toolSignals), [toolSignals]);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      loadedUserIdRef.current = null;
      setTasks([]);
      setToolSignals({});
      setIsLoading(false);
      return;
    }

    if (loadedUserIdRef.current !== userId) {
      setIsLoading(true);
    }
    const [tasksResult, nextSignals] = await Promise.all([
      supabase
        .from(TASK_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('task_date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(500),
      fetchToolCompletionSignals(userId),
    ]);

    if (tasksResult.error) {
      console.error('Failed to load tasks', tasksResult.error);
      toast.error('Unable to load your task calendar.');
    } else {
      setTasks((tasksResult.data ?? []) as CalendarTaskRow[]);
    }

    setToolSignals(nextSignals);
    loadedUserIdRef.current = userId;
    setIsLoading(false);
  }, [userId]);

  const logRecommendationEvent = useCallback(async (
    task: CalendarTaskRow,
    eventType: RecommendationEventType,
    metadata: Record<string, unknown> = {},
  ) => {
    if (!userId || !task.recommendation_key) return;
    const { error } = await supabase.from(RECOMMENDATION_EVENTS_TABLE).insert({
      user_id: userId,
      task_id: task.id,
      recommendation_key: task.recommendation_key,
      event_type: eventType,
      metadata,
    });
    if (error) console.warn('Unable to log recommendation event', error);
  }, [userId]);

  const syncStageTaskProgress = useCallback(async (task: CalendarTaskRow, completed: boolean) => {
    if (!userId || !task.recommendation_key?.startsWith('stage:')) return;
    const [, stage, taskId] = task.recommendation_key.split(':');
    if (!stage || !taskId) return;

    const { error } = await supabase
      .from('bizmap_task_progress' as any)
      .upsert(
        {
          user_id: userId,
          stage,
          task_id: taskId,
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,task_id' },
      );

    if (error) console.warn('Unable to sync Startup Development Cycle task progress', error);
  }, [userId]);


  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      void fetchTasks();
    };

    const channel = supabase
      .channel(`task-calendar:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_recommendation_events', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_missions', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'icp_analysis_results', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pmf_analysis_results', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pmf_validation_evidence', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tech_stack_reports', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist_pages', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'demo_studio_demos', filter: `owner_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mvp_builder_artifacts', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gtm_plans', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bizmap_task_progress', filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTasks, userId]);

  const createManualTask = useCallback(async (input: CreateManualTaskInput) => {
    if (!userId || !input.title.trim()) return false;
    setIsMutating(true);

    const { error } = await supabase.from(TASK_TABLE).insert({
      user_id: userId,
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
  }, [fetchTasks, userId]);

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

  const markTaskSeen = useCallback(async (task: CalendarTaskRow) => {
    if (!userId || (task.task_source !== 'platform' && task.ai_generated !== true) || task.is_completed || task.recommendation_status === 'dismissed') return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from(TASK_TABLE)
      .update({
        seen_count: Number(task.seen_count ?? 0) + 1,
        last_seen_at: now,
      })
      .eq('id', task.id);

    if (error) {
      console.warn('Unable to mark recommendation as seen', error);
      return;
    }

    setTasks((current) => current.map((item) => (
      item.id === task.id
        ? { ...item, seen_count: Number(item.seen_count ?? 0) + 1, last_seen_at: now }
        : item
    )));
    await logRecommendationEvent(task, 'seen');
  }, [logRecommendationEvent, userId]);

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

  const sendRecommendationFeedback = useCallback(async (
    task: CalendarTaskRow,
    action: RecommendationFeedbackAction,
  ) => {
    setIsMutating(true);
    const now = new Date().toISOString();
    const completed = action === 'already_done';
    const { error } = await supabase
      .from(TASK_TABLE)
      .update({
        recommendation_status: 'dismissed',
        dismissed_at: now,
        feedback_status: action,
        cooldown_until: cooldownUntil(FEEDBACK_COOLDOWN_DAYS[action]),
        is_completed: completed ? true : task.is_completed ?? false,
        completed_at: completed ? now : task.completed_at ?? null,
      })
      .eq('id', task.id);
    setIsMutating(false);

    if (error) {
      toast.error('Unable to save feedback.');
      return;
    }

    await logRecommendationEvent(task, action, { cooldownDays: FEEDBACK_COOLDOWN_DAYS[action] });
    if (completed) {
      await logRecommendationEvent(task, 'completed', { feedback: action });
      await syncStageTaskProgress(task, true);
    }
    await fetchTasks();

    const messages: Record<RecommendationFeedbackAction, string> = {
      remind_later: 'Got it. I will cool this down.',
      not_relevant: 'Marked not relevant.',
      already_done: 'Nice, marked as already done.',
      stop_showing: 'This recommendation will stay hidden.',
    };
    toast.success(messages[action]);
  }, [fetchTasks, logRecommendationEvent, syncStageTaskProgress]);

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
    foundationalMilestones,
    selectedTasks,
    dayStatuses,
    currentStage,
    isLoading,
    isMutating,
    createManualTask,
    completeTask,
    acceptRecommendation,
    dismissRecommendation,
    markTaskSeen,
    sendRecommendationFeedback,
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
