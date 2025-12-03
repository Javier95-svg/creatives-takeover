import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ListTodo } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  task_text: string;
  priority: string;
  is_completed: boolean;
  task_date: string;
}

export const TaskOverview = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('priority', { ascending: false })
        .order('task_date', { ascending: true })
        .limit(8);

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-[hsl(var(--red-primary))]/50 text-[hsl(var(--red-primary))]';
      case 'medium':
        return 'border-orange-500/50 text-orange-500';
      case 'low':
        return 'border-[hsl(var(--blue-primary))]/50 text-[hsl(var(--blue-primary))]';
      default:
        return 'border-muted-foreground/50 text-muted-foreground';
    }
  };

  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-5 w-5 text-primary" />
            Task Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-5 w-5 text-primary" />
            Task Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
              <ListTodo className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">No tasks yet</p>
              <p className="text-xs text-muted-foreground">
                Add tasks to start tracking your progress
              </p>
            </div>
            <Link to="/dashboard">
              <Button size="sm" variant="outline">
                Add Task
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <ListTodo className="h-4 w-4 text-primary" />
          </div>
          Task Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
            >
              <button
                onClick={() => toggleTaskComplete(task.id)}
                className="mt-0.5 flex-shrink-0"
              >
                {task.is_completed ? (
                  <CheckCircle className="w-4 h-4 text-[hsl(var(--green-primary))]" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/30" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{task.task_text}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          {tasks.length > 4 && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalCount} tasks total</span>
                <span className="text-[hsl(var(--green-primary))] font-semibold">
                  {completedCount} completed
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

