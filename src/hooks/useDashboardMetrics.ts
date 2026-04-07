import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedTasks } from '@/hooks/useUnifiedTasks';
import { useWeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';

interface DashboardMetrics {
  tasksCompletedToday: number;
  totalTasksToday: number;
  weeklyProgress: number;
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
  isLoading: boolean;
}

interface WeeklyTaskSnapshot {
  completed: number;
  total: number;
  loading: boolean;
}

function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

export function useDashboardMetrics(): DashboardMetrics {
  const { user } = useAuth();
  const { completedToday, totalToday, isLoading: tasksLoading } = useUnifiedTasks();
  const { currentMission, linkedTasks, isLoading: missionLoading } = useWeeklyMission();
  const [weeklyTaskSnapshot, setWeeklyTaskSnapshot] = useState<WeeklyTaskSnapshot>({
    completed: 0,
    total: 0,
    loading: true,
  });

  useEffect(() => {
    let isCancelled = false;

    const loadWeeklyTaskSnapshot = async () => {
      if (!user) {
        if (!isCancelled) {
          setWeeklyTaskSnapshot({ completed: 0, total: 0, loading: false });
        }
        return;
      }

      if (!isCancelled) {
        setWeeklyTaskSnapshot((current) => ({ ...current, loading: true }));
      }

      const linkedTaskIds = linkedTasks.map((task) => task.task_id);

      if (linkedTaskIds.length > 0) {
        const { data, error } = await supabase
          .from('daily_tasks')
          .select('id, is_completed')
          .in('id', linkedTaskIds);

        if (!isCancelled) {
          if (error || !data) {
            setWeeklyTaskSnapshot({ completed: 0, total: linkedTaskIds.length, loading: false });
            return;
          }

          setWeeklyTaskSnapshot({
            completed: data.filter((task) => task.is_completed).length,
            total: linkedTaskIds.length,
            loading: false,
          });
        }

        return;
      }

      if (currentMission?.target_value && currentMission.target_value > 0) {
        const derivedCompleted = Math.min(
          currentMission.current_value ?? Math.round((currentMission.completion_percentage ?? 0) / 100 * currentMission.target_value),
          currentMission.target_value,
        );

        if (!isCancelled) {
          setWeeklyTaskSnapshot({
            completed: derivedCompleted,
            total: currentMission.target_value,
            loading: false,
          });
        }

        return;
      }

      const weekRange = getCurrentWeekRange();
      const [{ data: weeklyDailyTasks }, { data: weeklyPriorities }] = await Promise.all([
        supabase
          .from('daily_tasks')
          .select('id, is_completed')
          .eq('user_id', user.id)
          .gte('task_date', weekRange.start)
          .lte('task_date', weekRange.end),
        supabase
          .from('daily_priorities')
          .select('id, is_completed')
          .eq('user_id', user.id)
          .gte('priority_date', weekRange.start)
          .lte('priority_date', weekRange.end),
      ]);

      if (!isCancelled) {
        const dailyTasks = weeklyDailyTasks ?? [];
        const priorities = weeklyPriorities ?? [];
        const combined = [...dailyTasks, ...priorities];

        setWeeklyTaskSnapshot({
          completed: combined.filter((task) => task.is_completed).length,
          total: combined.length,
          loading: false,
        });
      }
    };

    void loadWeeklyTaskSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [user, currentMission, linkedTasks]);

  return useMemo(() => {
    const weeklyProgress = currentMission?.completion_percentage
      ?? (weeklyTaskSnapshot.total > 0 ? (weeklyTaskSnapshot.completed / weeklyTaskSnapshot.total) * 100 : 0);

    return {
      tasksCompletedToday: completedToday,
      totalTasksToday: totalToday,
      weeklyProgress,
      tasksCompletedThisWeek: weeklyTaskSnapshot.completed,
      totalTasksThisWeek: weeklyTaskSnapshot.total,
      isLoading: tasksLoading || missionLoading || weeklyTaskSnapshot.loading,
    };
  }, [
    completedToday,
    totalToday,
    currentMission?.completion_percentage,
    weeklyTaskSnapshot.completed,
    weeklyTaskSnapshot.total,
    weeklyTaskSnapshot.loading,
    tasksLoading,
    missionLoading,
  ]);
}