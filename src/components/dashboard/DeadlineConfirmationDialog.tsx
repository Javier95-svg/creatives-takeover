import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Task {
  id: string;
  task_text: string;
  deadline_time: string;
}

interface DeadlineConfirmationDialogProps {
  userId: string;
}

export const DeadlineConfirmationDialog = ({ userId }: DeadlineConfirmationDialogProps) => {
  const [overdueTask, setOverdueTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const hasOpenDialogRef = useRef(false);

  useEffect(() => {
    hasOpenDialogRef.current = !!overdueTask;
  }, [overdueTask]);

  const checkForOverdueTasks = useCallback(async () => {
    try {
      // Create a capped daily bell reminder for newly expired tasks.
      await supabase.rpc('notify_task_deadline_expired' as never, { p_user_id: userId } as never);

      // Keep the currently open dialog stable until user acts.
      if (hasOpenDialogRef.current) return;

      const { data, error } = await supabase
        .from('daily_tasks')
        .select('id, task_text, deadline_time')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .eq('deadline_reached_popup_shown', false)
        .lte('deadline_time', new Date().toISOString())
        .order('deadline_time', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setOverdueTask(data);
      }
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
    }
  }, [userId]);

  useEffect(() => {
    checkForOverdueTasks();
    // Check every minute for overdue tasks
    const interval = setInterval(checkForOverdueTasks, 60000);
    return () => clearInterval(interval);
  }, [checkForOverdueTasks]);

  const handleComplete = async () => {
    if (!overdueTask) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          deadline_reached_popup_shown: true
        })
        .eq('id', overdueTask.id);

      if (error) throw error;

      toast.success('Great job! Task marked as completed! 🎉');
      setOverdueTask(null);
      checkForOverdueTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotComplete = async () => {
    if (!overdueTask) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({
          deadline_reached_popup_shown: true
        })
        .eq('id', overdueTask.id);

      if (error) throw error;

      toast.info('Task deadline acknowledged. Don\'t forget to complete it!');
      setOverdueTask(null);
      checkForOverdueTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!overdueTask) return null;

  return (
    <Dialog open={!!overdueTask} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-xl">Task Deadline Reached</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            The deadline for this task has been reached:
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <p className="font-medium text-foreground">{overdueTask.task_text}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Deadline: {new Date(overdueTask.deadline_time).toLocaleString()}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleNotComplete}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            Not Yet
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isUpdating}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Yes, Completed!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
