import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface WeeklyMission {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  mission_goal: string;
  mission_type?: string;
  target_metric?: string;
  target_value?: number;
  current_value?: number;
  completion_percentage: number;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface WeeklyMissionTask {
  id: string;
  weekly_mission_id: string;
  task_id: string;
  contribution_weight: number;
  is_critical: boolean;
  created_at: string;
}

export interface UseWeeklyMissionReturn {
  currentMission: WeeklyMission | null;
  linkedTasks: WeeklyMissionTask[];
  isLoading: boolean;
  error: string | null;
  createMission: (goal: string, missionType?: string) => Promise<WeeklyMission | null>;
  updateMission: (id: string, updates: Partial<WeeklyMission>) => Promise<void>;
  completeMission: (id: string) => Promise<void>;
  abandonMission: (id: string) => Promise<void>;
  linkTaskToMission: (taskId: string, isCritical?: boolean, weight?: number) => Promise<void>;
  unlinkTaskFromMission: (taskId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Get the start and end of the current week (Monday to Sunday)
 */
function getCurrentWeekDates(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday

  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

/**
 * Hook to manage weekly missions (goals) for founders
 * Connects daily work to weekly outcomes
 */
export function useWeeklyMission(): UseWeeklyMissionReturn {
  const { user } = useAuth();
  const [currentMission, setCurrentMission] = useState<WeeklyMission | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<WeeklyMissionTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the current active weekly mission
   */
  const fetchCurrentMission = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const weekDates = getCurrentWeekDates();

      // Get active mission for current week
      const { data: mission, error: missionError } = await supabase
        .from('weekly_missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('week_end_date', weekDates.start)
        .lte('week_start_date', weekDates.end)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (missionError) throw missionError;

      setCurrentMission(mission);

      // If mission exists, fetch linked tasks
      if (mission) {
        const { data: tasks, error: tasksError } = await supabase
          .from('weekly_mission_tasks')
          .select('*')
          .eq('weekly_mission_id', mission.id);

        if (tasksError) throw tasksError;
        setLinkedTasks(tasks || []);
      } else {
        setLinkedTasks([]);
      }

    } catch (err) {
      console.error('Error fetching weekly mission:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mission');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Create a new weekly mission
   */
  const createMission = useCallback(async (
    goal: string,
    missionType?: string
  ): Promise<WeeklyMission | null> => {
    if (!user) {
      toast.error('You must be logged in to create a mission');
      return null;
    }

    if (!goal.trim()) {
      toast.error('Mission goal cannot be empty');
      return null;
    }

    try {
      const weekDates = getCurrentWeekDates();

      // Check if there's already an active mission for this week
      const { data: existingMission } = await supabase
        .from('weekly_missions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('week_end_date', weekDates.start)
        .lte('week_start_date', weekDates.end)
        .maybeSingle();

      if (existingMission) {
        toast.error('You already have an active mission for this week');
        return null;
      }

      // Create new mission
      const { data: newMission, error: createError } = await supabase
        .from('weekly_missions')
        .insert({
          user_id: user.id,
          week_start_date: weekDates.start,
          week_end_date: weekDates.end,
          mission_goal: goal,
          mission_type: missionType || 'general',
          status: 'active',
          completion_percentage: 0
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentMission(newMission);
      toast.success('Weekly mission created! 🎯');

      return newMission;
    } catch (err) {
      console.error('Error creating mission:', err);
      toast.error('Failed to create mission');
      return null;
    }
  }, [user]);

  /**
   * Update an existing mission
   */
  const updateMission = useCallback(async (
    id: string,
    updates: Partial<WeeklyMission>
  ): Promise<void> => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('weekly_missions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh current mission
      await fetchCurrentMission();
      toast.success('Mission updated');
    } catch (err) {
      console.error('Error updating mission:', err);
      toast.error('Failed to update mission');
    }
  }, [user, fetchCurrentMission]);

  /**
   * Mark a mission as completed
   */
  const completeMission = useCallback(async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const { error: completeError } = await supabase
        .from('weekly_missions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (completeError) throw completeError;

      toast.success('Mission completed! 🎉');
      await fetchCurrentMission();
    } catch (err) {
      console.error('Error completing mission:', err);
      toast.error('Failed to complete mission');
    }
  }, [user, fetchCurrentMission]);

  /**
   * Abandon a mission
   */
  const abandonMission = useCallback(async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const { error: abandonError } = await supabase
        .from('weekly_missions')
        .update({
          status: 'abandoned',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (abandonError) throw abandonError;

      toast.success('Mission abandoned');
      await fetchCurrentMission();
    } catch (err) {
      console.error('Error abandoning mission:', err);
      toast.error('Failed to abandon mission');
    }
  }, [user, fetchCurrentMission]);

  /**
   * Link a task to the current weekly mission
   */
  const linkTaskToMission = useCallback(async (
    taskId: string,
    isCritical: boolean = false,
    weight: number = 1.0
  ): Promise<void> => {
    if (!user || !currentMission) {
      toast.error('No active mission to link to');
      return;
    }

    try {
      // Check if already linked
      const { data: existing } = await supabase
        .from('weekly_mission_tasks')
        .select('id')
        .eq('weekly_mission_id', currentMission.id)
        .eq('task_id', taskId)
        .maybeSingle();

      if (existing) {
        toast.info('Task already linked to mission');
        return;
      }

      // Create link
      const { error: linkError } = await supabase
        .from('weekly_mission_tasks')
        .insert({
          weekly_mission_id: currentMission.id,
          task_id: taskId,
          contribution_weight: weight,
          is_critical: isCritical
        });

      if (linkError) throw linkError;

      // Update task to mark it as contributing to mission
      await supabase
        .from('daily_tasks')
        .update({ contributes_to_weekly_mission: true })
        .eq('id', taskId);

      await fetchCurrentMission();
      toast.success('Task linked to weekly mission 🎯');
    } catch (err) {
      console.error('Error linking task to mission:', err);
      toast.error('Failed to link task');
    }
  }, [user, currentMission, fetchCurrentMission]);

  /**
   * Unlink a task from the current weekly mission
   */
  const unlinkTaskFromMission = useCallback(async (taskId: string): Promise<void> => {
    if (!user || !currentMission) return;

    try {
      const { error: unlinkError } = await supabase
        .from('weekly_mission_tasks')
        .delete()
        .eq('weekly_mission_id', currentMission.id)
        .eq('task_id', taskId);

      if (unlinkError) throw unlinkError;

      // Update task to mark it as NOT contributing to mission
      await supabase
        .from('daily_tasks')
        .update({ contributes_to_weekly_mission: false })
        .eq('id', taskId);

      await fetchCurrentMission();
      toast.success('Task unlinked from mission');
    } catch (err) {
      console.error('Error unlinking task:', err);
      toast.error('Failed to unlink task');
    }
  }, [user, currentMission, fetchCurrentMission]);

  // Fetch current mission on mount and when user changes
  useEffect(() => {
    fetchCurrentMission();
  }, [fetchCurrentMission]);

  return {
    currentMission,
    linkedTasks,
    isLoading,
    error,
    createMission,
    updateMission,
    completeMission,
    abandonMission,
    linkTaskToMission,
    unlinkTaskFromMission,
    refresh: fetchCurrentMission
  };
}
