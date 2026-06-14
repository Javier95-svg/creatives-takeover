import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getCurrentWeekWindow } from '@/lib/accountabilityPreferences';

// Types
export type WeeklyCommitmentOutcome = 'completed' | 'missed';

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
  commitment_outcome?: WeeklyCommitmentOutcome | null;
  reflection_text?: string | null;
  reviewed_at?: string | null;
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
  recentMissions: WeeklyMission[];
  linkedTasks: WeeklyMissionTask[];
  isLoading: boolean;
  error: string | null;
  createMission: (goal: string, missionType?: string) => Promise<WeeklyMission | null>;
  updateMission: (id: string, updates: Partial<WeeklyMission>) => Promise<void>;
  reviewMission: (id: string, outcome: WeeklyCommitmentOutcome, reflection?: string) => Promise<void>;
  linkTaskToMission: (taskId: string, isCritical?: boolean, weight?: number) => Promise<void>;
  unlinkTaskFromMission: (taskId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage weekly missions (goals) for founders
 * Connects daily work to weekly outcomes
 */
export function useWeeklyMission(): UseWeeklyMissionReturn {
  const { user } = useAuth();
  const [currentMission, setCurrentMission] = useState<WeeklyMission | null>(null);
  const [recentMissions, setRecentMissions] = useState<WeeklyMission[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<WeeklyMissionTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWeekDatesForUser = useCallback(async () => {
    if (!user) {
      return getCurrentWeekWindow();
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_preferences')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Falling back to default weekly window', profileError);
      return getCurrentWeekWindow();
    }

    return getCurrentWeekWindow(
      (profile?.user_preferences as Record<string, unknown> | null | undefined) ?? null,
    );
  }, [user]);

  /**
   * Fetch the current active weekly mission
   */
  const fetchCurrentMission = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const weekDates = await getWeekDatesForUser();

      const [currentMissionResult, recentMissionsResult] = await Promise.all([
        supabase
          .from('weekly_missions')
          .select('*')
          .eq('user_id', user.id)
          .gte('week_end_date', weekDates.start)
          .lte('week_start_date', weekDates.end)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('weekly_missions')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start_date', { ascending: false })
          .limit(6),
      ]);

      const { data: mission, error: missionError } = currentMissionResult;
      const { data: recentMissionRows, error: recentMissionsError } = recentMissionsResult;

      if (missionError) throw missionError;
      if (recentMissionsError) throw recentMissionsError;

      setCurrentMission(mission);
      setRecentMissions(recentMissionRows || []);

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
  }, [getWeekDatesForUser, user]);

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
      const weekDates = await getWeekDatesForUser();

      // Keep one commitment per founder per week.
      const { data: existingMission } = await supabase
        .from('weekly_missions')
        .select('id')
        .eq('user_id', user.id)
        .gte('week_end_date', weekDates.start)
        .lte('week_start_date', weekDates.end)
        .maybeSingle();

      if (existingMission) {
        toast.error('You already set a weekly commitment for this week');
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
          completion_percentage: 0,
          commitment_outcome: null,
          reflection_text: null,
          reviewed_at: null
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentMission(newMission);
      toast.success('Weekly commitment set');

      return newMission;
    } catch (err) {
      console.error('Error creating mission:', err);
      toast.error('Failed to create mission');
      return null;
    }
  }, [getWeekDatesForUser, user]);

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
  const reviewMission = useCallback(async (
    id: string,
    outcome: WeeklyCommitmentOutcome,
    reflection?: string
  ): Promise<void> => {
    if (!user) return;

    try {
      const normalizedReflection = reflection?.trim() || null;
      const now = new Date().toISOString();
      const { error: reviewError } = await supabase
        .from('weekly_missions')
        .update({
          status: outcome === 'completed' ? 'completed' : 'abandoned',
          completed_at: outcome === 'completed' ? now : null,
          commitment_outcome: outcome,
          reflection_text: outcome === 'missed' ? normalizedReflection : null,
          reviewed_at: now,
          completion_percentage: outcome === 'completed' ? 100 : currentMission?.completion_percentage ?? 0,
          updated_at: now
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (reviewError) throw reviewError;

      toast.success(outcome === 'completed' ? 'Weekly commitment completed' : 'Weekly reflection saved');
      await fetchCurrentMission();
    } catch (err) {
      console.error('Error reviewing mission:', err);
      toast.error('Failed to save weekly review');
    }
  }, [currentMission?.completion_percentage, fetchCurrentMission, user]);

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
    void fetchCurrentMission();
  }, [fetchCurrentMission]);

  return {
    currentMission,
    recentMissions,
    linkedTasks,
    isLoading,
    error,
    createMission,
    updateMission,
    reviewMission,
    linkTaskToMission,
    unlinkTaskFromMission,
    refresh: fetchCurrentMission
  };
}
