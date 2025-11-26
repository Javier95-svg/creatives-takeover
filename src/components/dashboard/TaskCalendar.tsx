import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskModal } from './TaskModal';
import { DeadlineConfirmationDialog } from './DeadlineConfirmationDialog';

interface Task {
  id: string;
  task_text: string;
  is_completed: boolean;
  priority: string;
  task_date: string;
}

interface CheckIn {
  check_in_date: string;
  goal_achieved: boolean | null;
}

export const TaskCalendar = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (date) {
      const dateTasks = tasks.filter(task => 
        isSameDay(new Date(task.task_date), date)
      );
      setSelectedDateTasks(dateTasks);
    }
  }, [date, tasks]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [tasksRes, checkInsRes] = await Promise.all([
        supabase
          .from('daily_tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('task_date', { ascending: false }),
        supabase
          .from('daily_check_ins')
          .select('check_in_date, goal_achieved')
          .eq('user_id', user.id)
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (checkInsRes.error) throw checkInsRes.error;

      setTasks(tasksRes.data || []);
      setCheckIns(checkInsRes.data || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({ 
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Task Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {user && <DeadlineConfirmationDialog userId={user.id} />}
      
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Task Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className={cn("rounded-md border pointer-events-auto")}
            modifiers={{
              hasCheckIn: (day) => checkIns.some(c => isSameDay(new Date(c.check_in_date), day)),
              hasTasks: (day) => tasks.some(t => isSameDay(new Date(t.task_date), day))
            }}
            modifiersClassNames={{
              hasCheckIn: "font-bold text-primary",
              hasTasks: "ring-1 ring-orange-500/50"
            }}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
              </h3>
              <Button 
                size="sm" 
                onClick={() => setShowTaskModal(true)}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>

            {selectedDateTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                      task.is_completed 
                        ? "bg-[hsl(var(--green-primary))]/10 border-[hsl(var(--green-primary))]/20" 
                        : "bg-card hover:bg-accent/50"
                    )}
                    onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-[hsl(var(--green-primary))] flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm flex-1",
                      task.is_completed && "line-through text-muted-foreground"
                    )}>
                      {task.task_text}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        task.priority === 'high' && "border-[hsl(var(--red-primary))]/50 text-[hsl(var(--red-primary))]",
                        task.priority === 'medium' && "border-orange-500/50 text-orange-500",
                        task.priority === 'low' && "border-[hsl(var(--blue-primary))]/50 text-[hsl(var(--blue-primary))]"
                      )}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No tasks for this date
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Check-in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--green-primary))]" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <TaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        selectedDate={date}
        onTaskAdded={fetchData}
      />
    </>
  );
};