import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { STAGE_TASKS, type BizMapStage, type StageTaskTemplate } from '@/lib/bizmapStages';

interface TaskProgressRow {
  task_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

export const useBizMapStageTasks = (stage: BizMapStage | null | undefined) => {
  const { user } = useAuth();
  const [taskProgress, setTaskProgress] = useState<Record<string, TaskProgressRow>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const stageTasks: StageTaskTemplate[] = stage ? (STAGE_TASKS[stage] ?? []) : [];

  const loadTaskProgress = useCallback(async () => {
    if (!user || !stage) {
      setTaskProgress({});
      setIsLoading(false);
      return;
    }

    const taskIds = stageTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      setTaskProgress({});
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bizmap_task_progress' as any)
      .select('task_id, is_completed, completed_at')
      .eq('user_id', user.id)
      .in('task_id', taskIds);

    if (error) {
      console.error('Failed to load BizMap stage tasks:', error);
      setTaskProgress({});
    } else {
      const map: Record<string, TaskProgressRow> = {};
      ((data as TaskProgressRow[]) || []).forEach((row) => {
        map[row.task_id] = row;
      });
      setTaskProgress(map);
    }

    setIsLoading(false);
  }, [user, stage]);

  useEffect(() => {
    setIsLoading(true);
    void loadTaskProgress();
  }, [loadTaskProgress]);

  const toggleTask = async (taskId: string) => {
    if (!user || !stage) return;

    const current = taskProgress[taskId]?.is_completed ?? false;
    const next = !current;
    setIsSaving(taskId);

    const { data, error } = await supabase
      .from('bizmap_task_progress' as any)
      .upsert(
        {
          user_id: user.id,
          stage,
          task_id: taskId,
          is_completed: next,
          completed_at: next ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,task_id' },
      )
      .select('task_id, is_completed, completed_at')
      .single();

    if (!error && data) {
      setTaskProgress((prev) => ({ ...prev, [taskId]: data as TaskProgressRow }));
    }

    setIsSaving(null);
  };

  const completedCount = stageTasks.filter((t) => taskProgress[t.id]?.is_completed).length;
  const totalCount = stageTasks.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const nextIncompleteTask =
    stageTasks.find((t) => !taskProgress[t.id]?.is_completed) ?? null;

  return {
    stageTasks,
    taskProgress,
    isSaving,
    isLoading,
    completedCount,
    totalCount,
    completionPercent,
    nextIncompleteTask,
    toggleTask,
    refetch: loadTaskProgress,
  };
};
