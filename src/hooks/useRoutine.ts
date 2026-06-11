import { useCallback, useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  buildRoutineSuggestions,
  createRoutineConfig,
  getCompletionKey,
  getLocalDateKey,
  getRoutineTasksForToday,
  getRoutineTasksForWeek,
  getWeekStartKey,
  parseReminderPreferences,
  parseRoutineConfig,
  parseRoutineGoal,
  serializeReminderPreferences,
  serializeRoutineConfig,
  type LegacyWeeklyCommitment,
  type RoutineCompletion,
  type RoutineCompletionStatus,
  type RoutineConfig,
  type RoutineGoal,
  type RoutinePeriodType,
  type RoutineProfileSnapshot,
  type RoutineReminderPreferences,
  type RoutineTask,
} from '@/lib/routineTemplates';

type RoutineCompletionRow = {
  id: string;
  routine_task_id: string;
  task_title: string;
  period_type: string;
  period_date: string;
  status: string;
  completed_at: string | null;
  created_at: string;
};

function normalizeCompletion(row: RoutineCompletionRow): RoutineCompletion {
  return {
    ...row,
    period_type: row.period_type === 'weekly' ? 'weekly' : 'daily',
    status: row.status === 'skipped' ? 'skipped' : 'completed',
  };
}

function normalizeRoutineOrder(tasks: RoutineTask[]) {
  return tasks.map((task, index) => ({ ...task, order: index }));
}

function calculateDailyStreak(completions: RoutineCompletion[]) {
  const completedDates = new Set(
    completions
      .filter((completion) => completion.period_type === 'daily' && completion.status === 'completed')
      .map((completion) => completion.period_date),
  );

  let streak = 0;
  let cursor = new Date();

  while (completedDates.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

function calculateConsistency(completions: RoutineCompletion[]) {
  const completedDates = new Set(
    completions
      .filter((completion) => completion.period_type === 'daily' && completion.status === 'completed')
      .map((completion) => completion.period_date),
  );

  return Math.round((completedDates.size / 28) * 100);
}

export function useRoutine() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<RoutineProfileSnapshot | null>(null);
  const [config, setConfig] = useState<RoutineConfig | null>(null);
  const [reminderPreferences, setReminderPreferences] = useState<RoutineReminderPreferences>(() => parseReminderPreferences(null));
  const [currentCompletions, setCurrentCompletions] = useState<RoutineCompletion[]>([]);
  const [historyCompletions, setHistoryCompletions] = useState<RoutineCompletion[]>([]);
  const [legacyCommitments, setLegacyCommitments] = useState<LegacyWeeklyCommitment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = getLocalDateKey();
  const weekKey = getWeekStartKey();

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setConfig(null);
      setCurrentCompletions([]);
      setHistoryCompletions([]);
      setLegacyCommitments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const historyStart = getLocalDateKey(subDays(new Date(), 90));
      const [profileResult, currentCompletionResult, historyCompletionResult, legacyResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('routine_primary_goal, routine_config, routine_reminder_preferences, quiz_current_stage, quiz_biggest_challenge, creative_niche, startup_stage, startup_name, startup_industry')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('routine_task_completions')
          .select('id, routine_task_id, task_title, period_type, period_date, status, completed_at, created_at')
          .eq('user_id', user.id)
          .in('period_date', [todayKey, weekKey]),
        supabase
          .from('routine_task_completions')
          .select('id, routine_task_id, task_title, period_type, period_date, status, completed_at, created_at')
          .eq('user_id', user.id)
          .gte('period_date', historyStart)
          .order('period_date', { ascending: false }),
        supabase
          .from('weekly_missions')
          .select('id, mission_goal, week_start_date, week_end_date, status, commitment_outcome, reflection_text')
          .eq('user_id', user.id)
          .order('week_start_date', { ascending: false })
          .limit(6),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (currentCompletionResult.error) throw currentCompletionResult.error;
      if (historyCompletionResult.error) throw historyCompletionResult.error;
      if (legacyResult.error) throw legacyResult.error;

      const profileRow = profileResult.data as RoutineProfileSnapshot | null;
      setProfile(profileRow);
      setConfig(parseRoutineConfig(profileRow?.routine_config));
      setReminderPreferences(parseReminderPreferences(profileRow?.routine_reminder_preferences));
      setCurrentCompletions(((currentCompletionResult.data ?? []) as RoutineCompletionRow[]).map(normalizeCompletion));
      setHistoryCompletions(((historyCompletionResult.data ?? []) as RoutineCompletionRow[]).map(normalizeCompletion));
      setLegacyCommitments((legacyResult.data ?? []) as LegacyWeeklyCommitment[]);
    } catch (err) {
      console.error('Failed to load routine:', err);
      setError(err instanceof Error ? err.message : 'Failed to load routine');
    } finally {
      setIsLoading(false);
    }
  }, [todayKey, user, weekKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveConfig = useCallback(async (nextConfig: RoutineConfig, options?: { quiet?: boolean }) => {
    if (!user) return;

    const normalizedConfig: RoutineConfig = {
      ...nextConfig,
      tasks: normalizeRoutineOrder(nextConfig.tasks),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setConfig(normalizedConfig);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          routine_primary_goal: normalizedConfig.primaryGoal,
          routine_config: serializeRoutineConfig(normalizedConfig),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      if (!options?.quiet) toast.success('Routine saved');
      await refresh();
    } catch (err) {
      console.error('Failed to save routine:', err);
      toast.error('Failed to save routine');
    } finally {
      setIsSaving(false);
    }
  }, [refresh, user]);

  const initializeRoutine = useCallback(async (goal: RoutineGoal) => {
    await saveConfig(createRoutineConfig(goal), { quiet: true });
    toast.success('Your routine is ready');
  }, [saveConfig]);

  const updateReminderPreferences = useCallback(async (preferences: RoutineReminderPreferences) => {
    if (!user) return;

    setIsSaving(true);
    setReminderPreferences(preferences);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ routine_reminder_preferences: serializeReminderPreferences(preferences) })
        .eq('id', user.id);

      if (updateError) throw updateError;
      toast.success(preferences.enabled ? 'Routine reminder preference saved' : 'Routine reminders turned off');
    } catch (err) {
      console.error('Failed to save routine reminder preferences:', err);
      toast.error('Failed to save reminder preference');
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const setTaskStatus = useCallback(async (
    task: RoutineTask,
    periodType: RoutinePeriodType,
    status: RoutineCompletionStatus,
  ) => {
    if (!user) return;

    const periodDate = periodType === 'daily' ? todayKey : weekKey;
    setIsSaving(true);

    try {
      const { error: upsertError } = await supabase
        .from('routine_task_completions')
        .upsert({
          user_id: user.id,
          routine_task_id: task.id,
          task_title: task.title,
          period_type: periodType,
          period_date: periodDate,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,routine_task_id,period_type,period_date',
        });

      if (upsertError) throw upsertError;
      await refresh();
    } catch (err) {
      console.error('Failed to update routine task:', err);
      toast.error('Failed to update routine task');
    } finally {
      setIsSaving(false);
    }
  }, [refresh, todayKey, user, weekKey]);

  const clearTaskStatus = useCallback(async (task: RoutineTask, periodType: RoutinePeriodType) => {
    if (!user) return;

    const periodDate = periodType === 'daily' ? todayKey : weekKey;
    setIsSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from('routine_task_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('routine_task_id', task.id)
        .eq('period_type', periodType)
        .eq('period_date', periodDate);

      if (deleteError) throw deleteError;
      await refresh();
    } catch (err) {
      console.error('Failed to clear routine task status:', err);
      toast.error('Failed to update routine task');
    } finally {
      setIsSaving(false);
    }
  }, [refresh, todayKey, user, weekKey]);

  const completionByKey = useMemo(() => {
    return new Map(
      currentCompletions.map((completion) => [
        getCompletionKey(completion.routine_task_id, completion.period_type, completion.period_date),
        completion,
      ]),
    );
  }, [currentCompletions]);

  const todayTasks = useMemo(() => config ? getRoutineTasksForToday(config) : [], [config]);
  const weeklyTasks = useMemo(() => config ? getRoutineTasksForWeek(config) : [], [config]);
  const allCurrentTasks = useMemo(() => [
    ...todayTasks.map((task) => ({ task, periodType: 'daily' as const, periodDate: todayKey })),
    ...weeklyTasks.map((task) => ({ task, periodType: 'weekly' as const, periodDate: weekKey })),
  ], [todayKey, todayTasks, weekKey, weeklyTasks]);

  const completedCurrentCount = allCurrentTasks.filter(({ task, periodType, periodDate }) => {
    return completionByKey.get(getCompletionKey(task.id, periodType, periodDate))?.status === 'completed';
  }).length;
  const skippedCurrentCount = allCurrentTasks.filter(({ task, periodType, periodDate }) => {
    return completionByKey.get(getCompletionKey(task.id, periodType, periodDate))?.status === 'skipped';
  }).length;
  const totalCurrentCount = allCurrentTasks.length;
  const progressPercentage = totalCurrentCount > 0 ? Math.round((completedCurrentCount / totalCurrentCount) * 100) : 0;
  const dailyStreak = calculateDailyStreak(historyCompletions);
  const consistencyPercentage = calculateConsistency(historyCompletions);
  // RET-008: visible momentum — completed actions this week vs the week before,
  // so progress compounds in front of the founder instead of resetting daily.
  const last7Key = getLocalDateKey(subDays(new Date(), 7));
  const prev14Key = getLocalDateKey(subDays(new Date(), 14));
  const completedLast7 = historyCompletions.filter(
    (completion) => completion.status === 'completed' && completion.period_date >= last7Key,
  ).length;
  const completedPrev7 = historyCompletions.filter(
    (completion) =>
      completion.status === 'completed' &&
      completion.period_date >= prev14Key &&
      completion.period_date < last7Key,
  ).length;
  const selectedGoal = parseRoutineGoal(profile?.routine_primary_goal) ?? config?.primaryGoal ?? null;
  const suggestions = useMemo(() => profile ? buildRoutineSuggestions(profile, config) : [], [config, profile]);

  return {
    profile,
    config,
    selectedGoal,
    reminderPreferences,
    todayTasks,
    weeklyTasks,
    currentCompletions,
    completionByKey,
    legacyCommitments,
    suggestions,
    isLoading,
    isSaving,
    error,
    stats: {
      completedCurrentCount,
      skippedCurrentCount,
      totalCurrentCount,
      progressPercentage,
      dailyStreak,
      consistencyPercentage,
      completedLast7,
      completedPrev7,
    },
    initializeRoutine,
    saveConfig,
    updateReminderPreferences,
    setTaskStatus,
    clearTaskStatus,
    refresh,
  };
}
