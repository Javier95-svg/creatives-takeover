import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subDays } from 'date-fns';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  createRoutineConfig,
  DEFAULT_REMINDER_CHANNELS,
  FIRST_CUSTOMER_PROOF_ROUTINE_TASKS,
  getDateKeyInTimezone,
  getCompletionKey,
  getMonthStartKeyInTimezone,
  getRoutineTasksForToday,
  getRoutineTasksForMonth,
  parseReminderPreferences,
  parseRoutineConfig,
  parseRoutineGoal,
  serializeReminderPreferences,
  serializeRoutineConfig,
  type RoutineCompletion,
  type RoutineCompletionStatus,
  type RoutineConfig,
  type RoutineGoal,
  type RoutinePeriodType,
  type RoutineProfileSnapshot,
  type RoutineReminderPreferences,
  type RoutineReminderChannels,
  type RoutineTask,
} from '@/lib/routineTemplates';
import { mergeAccountabilityPreferences, normalizeAccountabilityPreferences } from '@/lib/accountabilityPreferences';

const notificationDb = supabase as unknown as { from: (table: string) => any };

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
    period_type: row.period_type === 'monthly' ? 'monthly' : row.period_type === 'weekly' ? 'weekly' : 'daily',
    status: row.status === 'skipped' ? 'skipped' : 'completed',
  };
}

function normalizeRoutineOrder(tasks: RoutineTask[]) {
  return tasks.map((task, index) => ({ ...task, order: index }));
}

function calculateDailyStreak(completions: RoutineCompletion[], timezone: string) {
  const completedDates = new Set(
    completions
      .filter((completion) => completion.period_type === 'daily' && completion.status === 'completed')
      .map((completion) => completion.period_date),
  );

  let streak = 0;
  let cursor = new Date();

  while (completedDates.has(getDateKeyInTimezone(cursor, timezone))) {
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
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<RoutineProfileSnapshot | null>(null);
  const [config, setConfig] = useState<RoutineConfig | null>(null);
  const [reminderPreferences, setReminderPreferences] = useState<RoutineReminderPreferences>(() => parseReminderPreferences(null));
  const [reminderChannels, setReminderChannels] = useState<RoutineReminderChannels>(DEFAULT_REMINDER_CHANNELS);
  const [currentCompletions, setCurrentCompletions] = useState<RoutineCompletion[]>([]);
  const [historyCompletions, setHistoryCompletions] = useState<RoutineCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  const timezone = normalizeAccountabilityPreferences(profile?.user_preferences as Record<string, unknown> | null | undefined).timezone;
  const todayKey = getDateKeyInTimezone(new Date(), timezone);
  const monthKey = getMonthStartKeyInTimezone(new Date(), timezone);

  const refresh = useCallback(async () => {
    if (!userId) {
      loadedUserIdRef.current = null;
      setProfile(null);
      setConfig(null);
      setCurrentCompletions([]);
      setHistoryCompletions([]);
      setReminderChannels(DEFAULT_REMINDER_CHANNELS);
      return;
    }

    if (loadedUserIdRef.current !== userId) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const historyStart = getDateKeyInTimezone(subDays(new Date(), 90), timezone);
      const [profileResult, currentCompletionResult, historyCompletionResult, notificationPreferencesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('routine_primary_goal, routine_config, routine_reminder_preferences, user_preferences')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('routine_task_completions')
          .select('id, routine_task_id, task_title, period_type, period_date, status, completed_at, created_at')
          .eq('user_id', userId)
          .in('period_date', [todayKey, monthKey]),
        supabase
          .from('routine_task_completions')
          .select('id, routine_task_id, task_title, period_type, period_date, status, completed_at, created_at')
          .eq('user_id', userId)
          .gte('period_date', historyStart)
          .order('period_date', { ascending: false }),
        notificationDb
          .from('notification_preferences')
          .select('routine_in_app_enabled, routine_email_enabled, routine_reminders')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (currentCompletionResult.error) throw currentCompletionResult.error;
      if (historyCompletionResult.error) throw historyCompletionResult.error;
      if (notificationPreferencesResult.error) throw notificationPreferencesResult.error;

      const profileRow = profileResult.data as RoutineProfileSnapshot | null;
      setProfile(profileRow);
      setConfig(parseRoutineConfig(profileRow?.routine_config));
      setReminderPreferences(parseReminderPreferences(profileRow?.routine_reminder_preferences));
      const notificationPreferences = notificationPreferencesResult.data;
      setReminderChannels({
        inAppEnabled: notificationPreferences?.routine_in_app_enabled ?? notificationPreferences?.routine_reminders ?? true,
        emailEnabled: notificationPreferences?.routine_email_enabled ?? notificationPreferences?.routine_reminders ?? true,
      });
      setCurrentCompletions(((currentCompletionResult.data ?? []) as RoutineCompletionRow[]).map(normalizeCompletion));
      setHistoryCompletions(((historyCompletionResult.data ?? []) as RoutineCompletionRow[]).map(normalizeCompletion));
    } catch (err) {
      console.error('Failed to load routine:', err);
      setError(err instanceof Error ? err.message : 'Failed to load routine');
    } finally {
      loadedUserIdRef.current = userId;
      setIsLoading(false);
    }
  }, [timezone, todayKey, userId, monthKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveConfig = useCallback(async (nextConfig: RoutineConfig, options?: { quiet?: boolean }) => {
    if (!userId) return;

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
        .eq('id', userId);

      if (updateError) throw updateError;
      if (!options?.quiet) toast.success('Routine saved');
      await refresh();
    } catch (err) {
      console.error('Failed to save routine:', err);
      toast.error('Failed to save routine');
    } finally {
      setIsSaving(false);
    }
  }, [refresh, userId]);

  const initializeRoutine = useCallback(async (goal: RoutineGoal) => {
    await saveConfig(createRoutineConfig(goal), { quiet: true });
    toast.success('Your routine is ready');
  }, [saveConfig]);

  const addFirstCustomerProofTasks = useCallback(async () => {
    const base = config ?? createRoutineConfig('launch_product');
    const existingIds = new Set(base.tasks.map((task) => task.id));
    const additions = FIRST_CUSTOMER_PROOF_ROUTINE_TASKS
      .filter((task) => !existingIds.has(task.id))
      .map((task, index) => ({ ...task, active: true, order: base.tasks.length + index }));
    if (!additions.length) {
      toast.success('First Customer Proof tasks are already in your routine');
      return;
    }
    await saveConfig({ ...base, tasks: [...base.tasks, ...additions] });
  }, [config, saveConfig]);

  const updateReminderPreferences = useCallback(async (preferences: RoutineReminderPreferences, nextTimezone?: string) => {
    if (!userId) return;

    setIsSaving(true);
    setReminderPreferences(preferences);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ routine_reminder_preferences: serializeReminderPreferences(preferences) })
        .eq('id', userId);

      if (updateError) throw updateError;
      if (nextTimezone && nextTimezone !== timezone) {
        const { error: timezoneError } = await supabase
          .from('profiles')
          .update({ user_preferences: mergeAccountabilityPreferences(profile?.user_preferences as Record<string, unknown> | null | undefined, { timezone: nextTimezone }) })
          .eq('id', userId);
        if (timezoneError) throw timezoneError;
        await refresh();
      }
      toast.success(preferences.enabled ? 'Routine reminder preference saved' : 'Routine reminders turned off');
    } catch (err) {
      console.error('Failed to save routine reminder preferences:', err);
      toast.error('Failed to save reminder preference');
    } finally {
      setIsSaving(false);
    }
  }, [profile?.user_preferences, refresh, timezone, userId]);

  const updateReminderChannels = useCallback(async (channels: RoutineReminderChannels) => {
    if (!userId) return;
    setIsSaving(true);
    setReminderChannels(channels);
    try {
      const { error: updateError } = await notificationDb
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          routine_in_app_enabled: channels.inAppEnabled,
          routine_email_enabled: channels.emailEnabled,
          routine_reminders: channels.inAppEnabled || channels.emailEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (updateError) throw updateError;
      toast.success('Routine delivery preferences saved');
    } catch (err) {
      console.error('Failed to save routine delivery preferences:', err);
      toast.error('Failed to save routine delivery preferences');
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

  const setTaskStatus = useCallback(async (
    task: RoutineTask,
    periodType: RoutinePeriodType,
    status: RoutineCompletionStatus,
  ) => {
    if (!userId) return;

    const periodDate = periodType === 'daily' ? todayKey : monthKey;
    setIsSaving(true);

    try {
      const { error: upsertError } = await supabase
        .from('routine_task_completions')
        .upsert({
          user_id: userId,
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
  }, [monthKey, refresh, todayKey, userId]);

  const clearTaskStatus = useCallback(async (task: RoutineTask, periodType: RoutinePeriodType) => {
    if (!userId) return;

    const periodDate = periodType === 'daily' ? todayKey : monthKey;
    setIsSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from('routine_task_completions')
        .delete()
        .eq('user_id', userId)
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
  }, [monthKey, refresh, todayKey, userId]);

  const completionByKey = useMemo(() => {
    return new Map(
      currentCompletions.map((completion) => [
        getCompletionKey(completion.routine_task_id, completion.period_type, completion.period_date),
        completion,
      ]),
    );
  }, [currentCompletions]);

  const todayTasks = useMemo(() => config ? getRoutineTasksForToday(config, new Date(), timezone) : [], [config, timezone]);
  const monthlyTasks = useMemo(() => config ? getRoutineTasksForMonth(config) : [], [config]);
  const allCurrentTasks = useMemo(() => [
    ...todayTasks.map((task) => ({ task, periodType: 'daily' as const, periodDate: todayKey })),
    ...monthlyTasks.map((task) => ({ task, periodType: 'monthly' as const, periodDate: monthKey })),
  ], [monthKey, monthlyTasks, todayKey, todayTasks]);

  const completedCurrentCount = allCurrentTasks.filter(({ task, periodType, periodDate }) => {
    return completionByKey.get(getCompletionKey(task.id, periodType, periodDate))?.status === 'completed';
  }).length;
  const skippedCurrentCount = allCurrentTasks.filter(({ task, periodType, periodDate }) => {
    return completionByKey.get(getCompletionKey(task.id, periodType, periodDate))?.status === 'skipped';
  }).length;
  const totalCurrentCount = allCurrentTasks.length;
  const progressPercentage = totalCurrentCount > 0 ? Math.round((completedCurrentCount / totalCurrentCount) * 100) : 0;
  const dailyStreak = calculateDailyStreak(historyCompletions, timezone);
  const consistencyPercentage = calculateConsistency(historyCompletions);
  // RET-008: visible momentum — completed actions this week vs the week before,
  // so progress compounds in front of the founder instead of resetting daily.
  const last7Key = getDateKeyInTimezone(subDays(new Date(), 7), timezone);
  const prev14Key = getDateKeyInTimezone(subDays(new Date(), 14), timezone);
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

  return {
    profile,
    config,
    selectedGoal,
    reminderPreferences,
    reminderChannels,
    timezone,
    todayTasks,
    monthlyTasks,
    currentCompletions,
    historyCompletions,
    completionByKey,
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
    addFirstCustomerProofTasks,
    saveConfig,
    updateReminderPreferences,
    updateReminderChannels,
    setTaskStatus,
    clearTaskStatus,
    refresh,
  };
}
