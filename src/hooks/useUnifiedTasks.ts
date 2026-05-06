import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useDailyChallenges } from '@/hooks/useDailyChallenges';
import { useCommitments } from '@/hooks/useCommitments';
import { STAGE_TASKS } from '@/lib/bizmapStages';
import type { BizMapStage } from '@/lib/bizmapStages';

export type TaskSource = 'daily' | 'bizmap' | 'challenge' | 'commitment' | 'priority';
export type TaskLayer = 'stage' | 'mission' | 'manual' | 'community' | 'commitment';

export interface UnifiedTask {
  id: string;
  title: string;
  source: TaskSource;
  layer: TaskLayer;
  priority: 'high' | 'medium' | 'low';
  isCompleted: boolean;
  deadline?: string;
  estimatedMinutes?: number;
  /** Deep-link back to the source tool */
  actionRoute?: string;
  /** Human-readable action CTA */
  actionLabel?: string;
  /** Human-readable source label */
  sourceLabel: string;
  contributesToMission?: boolean;
  onComplete: () => Promise<void>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

// ── hook ─────────────────────────────────────────────────────────────────────

export const useUnifiedTasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentStage } = useBizMapProgress();
  const { todaysChallenge, isCompleted: challengeCompleted, completeChallenge } = useDailyChallenges(user?.id);
  const { userActiveCommitments } = useCommitments();

  const [dailyTasks, setDailyTasks] = useState<UnifiedTask[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<UnifiedTask[]>([]);
  const [bizMapTasks, setBizMapTasks] = useState<UnifiedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── fetch daily tasks ─────────────────────────────────────────────────────
  const fetchDailyTasks = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_tasks')
      .select('id, task_text, priority, is_completed, deadline_time, effort_estimate, ai_generated, contributes_to_weekly_mission')
      .eq('user_id', user.id)
      .eq('task_date', today())
      .order('created_at', { ascending: true });

    if (error || !data) return;

    setDailyTasks(
      data.map((row) => ({
        id: row.id,
        title: row.task_text,
        source: 'daily',
        layer: row.contributes_to_weekly_mission ? 'mission' : 'manual',
        priority: (row.priority as 'high' | 'medium' | 'low') ?? 'medium',
        isCompleted: row.is_completed,
        deadline: row.deadline_time ?? undefined,
        estimatedMinutes: Math.max(5, Math.round(Number(row.effort_estimate ?? 15))),
        actionRoute: row.contributes_to_weekly_mission ? '/dashboard/weekly-mission' : '/dashboard/tasks',
        actionLabel: row.contributes_to_weekly_mission ? 'Open mission' : 'Open tasks',
        sourceLabel: row.contributes_to_weekly_mission ? 'Weekly Mission' : row.ai_generated ? 'Recommended Task' : 'Custom Task',
        contributesToMission: Boolean(row.contributes_to_weekly_mission),
        onComplete: async () => {
          await supabase
            .from('daily_tasks')
            .update({ is_completed: !row.is_completed, completed_at: !row.is_completed ? new Date().toISOString() : null })
            .eq('id', row.id);
          fetchDailyTasks();
        },
      })),
    );
  }, [user]);

  // ── fetch daily priorities ────────────────────────────────────────────────
  const fetchPriorityTasks = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_priorities')
      .select('id, priority_text, is_completed, priority_order')
      .eq('user_id', user.id)
      .eq('priority_date', today())
      .order('priority_order', { ascending: true });

    if (error || !data) return;

    setPriorityTasks(
      data.map((row) => ({
        id: row.id,
        title: row.priority_text,
        source: 'priority',
        layer: 'manual',
        priority: 'high' as const,
        isCompleted: row.is_completed,
        estimatedMinutes: 15,
        actionRoute: '/dashboard/tasks',
        actionLabel: 'Open tasks',
        sourceLabel: 'Top Priority',
        onComplete: async () => {
          await supabase
            .from('daily_priorities')
            .update({ is_completed: !row.is_completed })
            .eq('id', row.id);
          fetchPriorityTasks();
        },
      })),
    );
  }, [user]);

  // ── fetch BizMap stage tasks ──────────────────────────────────────────────
  const fetchBizMapTasks = useCallback(async () => {
    if (!user || !currentStage) return;

    const stageTasks = STAGE_TASKS[currentStage as BizMapStage] ?? [];
    const taskIds = stageTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      setBizMapTasks([]);
      return;
    }

    const { data, error } = await supabase
      .from('bizmap_task_progress')
      .select('task_id, is_completed')
      .eq('user_id', user.id)
      .in('task_id', taskIds);

    if (error) {
      setBizMapTasks([]);
      return;
    }

    const progressMap: Record<string, boolean> = {};
    (data || []).forEach((row) => {
      progressMap[row.task_id] = row.is_completed;
    });

    setBizMapTasks(
      stageTasks.map((task) => {
        const isCompleted = progressMap[task.id] ?? false;
        return {
          id: task.id,
          title: task.title,
          source: 'bizmap',
          layer: 'stage',
          priority: task.priority,
          isCompleted,
          actionRoute: task.route,
          actionLabel: 'Open tool',
          estimatedMinutes: task.priority === 'high' ? 30 : task.priority === 'medium' ? 20 : 10,
          sourceLabel: `BizMap: ${currentStage}`,
          onComplete: async () => {
            const nextValue = !isCompleted;
            await supabase
              .from('bizmap_task_progress')
              .upsert(
                {
                  user_id: user.id,
                  stage: currentStage,
                  task_id: task.id,
                  is_completed: nextValue,
                  completed_at: nextValue ? new Date().toISOString() : null,
                },
                { onConflict: 'user_id,task_id' },
              );
            fetchBizMapTasks();
          },
        };
      }),
    );
  }, [user, currentStage]);

  // ── initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    Promise.all([fetchDailyTasks(), fetchPriorityTasks(), fetchBizMapTasks()]).finally(() =>
      setIsLoading(false),
    );
  }, [user, currentStage, fetchDailyTasks, fetchPriorityTasks, fetchBizMapTasks]);

  // ── build challenge task ──────────────────────────────────────────────────
  const challengeTask: UnifiedTask | null =
    todaysChallenge
      ? {
          id: todaysChallenge.id,
          title: todaysChallenge.challenge_title,
          source: 'challenge',
          layer: 'community',
          priority: 'medium',
          isCompleted: challengeCompleted,
          estimatedMinutes: 15,
          sourceLabel: 'Daily Challenge',
          actionRoute: '/community',
          actionLabel: 'Open community',
          onComplete: async () => {
            await completeChallenge(todaysChallenge.id);
          },
        }
      : null;

  // ── build commitment tasks ────────────────────────────────────────────────
  const commitmentTasks: UnifiedTask[] = userActiveCommitments.map((c) => ({
    id: c.id,
    title: c.commitment_text,
    source: 'commitment',
    layer: 'commitment',
    priority: 'high' as const,
    isCompleted: false,
    deadline: c.target_date,
    estimatedMinutes: 20,
    actionRoute: '/community',
    actionLabel: 'Verify',
    sourceLabel: 'Commitment',
    onComplete: async () => {
      navigate('/community');
    },
  }));

  // ── aggregate ─────────────────────────────────────────────────────────────
  const allTasks: UnifiedTask[] = [
    ...priorityTasks,
    ...bizMapTasks,
    ...dailyTasks,
    ...(challengeTask ? [challengeTask] : []),
    ...commitmentTasks,
  ];

  const completedToday = allTasks.filter((t) => t.isCompleted).length;
  const totalToday = allTasks.length;

  // ── create daily task ─────────────────────────────────────────────────────
  const createDailyTask = useCallback(
    async (text: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
      if (!user || !text.trim()) return;

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 0, 0);

      await supabase.from('daily_tasks').insert({
        user_id: user.id,
        task_text: text.trim(),
        priority,
        task_date: today(),
        deadline_time: endOfDay.toISOString(),
        effort_estimate: 15,
        ai_generated: false,
        contributes_to_weekly_mission: false,
        is_completed: false,
      });

      fetchDailyTasks();
    },
    [user, fetchDailyTasks],
  );

  return {
    allTasks,
    dailyTasks,
    priorityTasks,
    bizMapTasks,
    challengeTask,
    commitmentTasks,
    completedToday,
    totalToday,
    isLoading,
    createDailyTask,
    refetch: () => {
      fetchDailyTasks();
      fetchPriorityTasks();
      fetchBizMapTasks();
    },
  };
};
