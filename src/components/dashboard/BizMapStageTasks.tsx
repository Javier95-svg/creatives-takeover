import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Compass, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { BIZMAP_STAGES, STAGE_TASKS, getNextStage } from '@/lib/bizmapStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TaskProgressRow {
  task_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

interface DraftTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  route: string;
}

const TASK_PROGRESS_TABLE = 'bizmap_task_progress';

export function BizMapStageTasks() {
  const { user } = useAuth();
  const {
    currentStage,
    highestUnlockedStage,
    stageState,
    progress,
    setCurrentStage,
  } = useBizMapProgress();
  const [taskProgress, setTaskProgress] = useState<Record<string, TaskProgressRow>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);

  const currentStageDefinition = useMemo(
    () => BIZMAP_STAGES.find((stage) => stage.id === currentStage),
    [currentStage],
  );

  const currentTasks = useMemo(() => {
    if (currentStage === 'IDENTITY' && draftTasks.length > 0) {
      return draftTasks;
    }
    return STAGE_TASKS[currentStage] ?? [];
  }, [currentStage, draftTasks]);
  const nextStage = getNextStage(currentStage);

  useEffect(() => {
    const loadDraftTasks = async () => {
      if (!user || currentStage !== 'IDENTITY') {
        setDraftTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from('icp_analysis_results')
        .select('analysis_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to load ICP-driven stage tasks:', error);
        setDraftTasks([]);
        return;
      }

      const draftAnalysis = data as { analysis_data?: { dashboardContext?: { prioritizedTasks?: DraftTask[] } } } | null;
      const tasks = draftAnalysis?.analysis_data?.dashboardContext?.prioritizedTasks ?? [];
      setDraftTasks(Array.isArray(tasks) ? tasks.slice(0, 5) : []);
    };

    void loadDraftTasks();
  }, [currentStage, user]);

  useEffect(() => {
    const loadTaskProgress = async () => {
      if (!user) return;

      const taskIds = currentTasks.map((task) => task.id);
      if (taskIds.length === 0) {
        setTaskProgress({});
        return;
      }

      const { data, error } = await supabase
        .from(TASK_PROGRESS_TABLE)
        .select('task_id, is_completed, completed_at')
        .eq('user_id', user.id)
        .in('task_id', taskIds);

      if (error) {
        console.error('Failed to load BizMap stage tasks:', error);
        setTaskProgress({});
        return;
      }

      const nextProgress: Record<string, TaskProgressRow> = {};
      (data as TaskProgressRow[] | null)?.forEach((row) => {
        nextProgress[row.task_id] = row;
      });
      setTaskProgress(nextProgress);
    };

    loadTaskProgress();
  }, [currentStage, currentTasks, user]);

  const completedCount = currentTasks.filter((task) => taskProgress[task.id]?.is_completed).length;

  const toggleTask = async (taskId: string) => {
    if (!user) return;

    const currentValue = taskProgress[taskId]?.is_completed ?? false;
    const nextValue = !currentValue;
    setIsSaving(taskId);

    const payload = {
      user_id: user.id,
      stage: currentStage,
      task_id: taskId,
      is_completed: nextValue,
      completed_at: nextValue ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from(TASK_PROGRESS_TABLE)
      .upsert(payload, { onConflict: 'user_id,task_id' })
      .select('task_id, is_completed, completed_at')
      .single();

    if (error) {
      console.error('Failed to update BizMap stage task:', error);
      setIsSaving(null);
      return;
    }

    setTaskProgress((prev) => ({
      ...prev,
      [taskId]: data as TaskProgressRow,
    }));
    setIsSaving(null);
  };

  return (
    <Card className="border-primary/20 bg-card/90">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            BizMap Stage Tasks
          </CardTitle>
          <Badge variant="secondary">
            Stage {currentStageDefinition?.numeral}: {currentStageDefinition?.title}
          </Badge>
        </div>
        <CardDescription>
          {currentStage === 'IDENTITY' && draftTasks.length > 0
            ? 'These next steps come from your latest ICP Draft.'
            : 'Stage-aware recommendations update as you unlock the next stage.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">
          {completedCount}/{currentTasks.length} stage tasks completed in {currentStageDefinition?.title}.
        </div>

        <div className="space-y-2">
          {currentTasks.map((task) => {
            const done = taskProgress[task.id]?.is_completed ?? false;
            const saving = isSaving === task.id;

            return (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/70 p-3"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    disabled={saving}
                    className="mt-0.5"
                    aria-label={done ? 'Mark task incomplete' : 'Mark task complete'}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div>
                    <p className={`text-sm ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                    {'description' in task && typeof task.description === 'string' && task.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                    ) : null}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                      <Link to={task.route} className="text-primary hover:underline">
                        Open tool
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          {nextStage && stageState[nextStage].unlocked ? (
            <>
              <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Next stage unlocked</Badge>
              <Button size="sm" variant="outline" onClick={() => setCurrentStage(nextStage)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Switch to Stage {BIZMAP_STAGES.find((stage) => stage.id === nextStage)?.numeral}
              </Button>
            </>
          ) : nextStage ? (
            <Badge variant="outline">
              <Lock className="mr-1 h-3 w-3" />
              Stage {BIZMAP_STAGES.find((stage) => stage.id === nextStage)?.numeral} locked
            </Badge>
          ) : (
            <Badge className="bg-primary/10 text-primary border-primary/20">Final stage active</Badge>
          )}

          <Badge variant="outline">Highest unlocked: {highestUnlockedStage}</Badge>
          {progress?.launch_completed_at && (
            <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Launch plan completed</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
