import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Target, Plus, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Milestone {
  id: string;
  title: string;
  progress: number;
  subTasks: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  deadline: string;
}

export const MonthlyMilestone = () => {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMonthlyMilestone();
    }
  }, [user]);

  const loadMonthlyMilestone = async () => {
    if (!user) return;

    try {
      // Get current month's active sprint or milestone
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: sprints } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', startOfMonth.toISOString().split('T')[0])
        .lte('end_date', endOfMonth.toISOString().split('T')[0])
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (sprints && sprints.length > 0) {
        const sprint = sprints[0];
        
        // Get sprint tasks to calculate progress
        const { data: tasks } = await supabase
          .from('sprint_tasks')
          .select('*')
          .eq('sprint_id', sprint.id);

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const subTasks = (tasks || []).slice(0, 5).map(t => ({
          id: t.id,
          text: t.title,
          completed: t.status === 'done'
        }));

        setMilestone({
          id: sprint.id,
          title: sprint.title,
          progress,
          subTasks,
          deadline: sprint.end_date
        });
      }
    } catch (error) {
      console.error('Error loading milestone:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubTask = async (taskId: string, currentStatus: boolean) => {
    if (!milestone) return;

    try {
      await supabase
        .from('sprint_tasks')
        .update({ status: currentStatus ? 'todo' : 'done' })
        .eq('id', taskId);

      loadMonthlyMilestone();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">This Month's Milestone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!milestone) {
    return (
      <Card className="backdrop-blur-sm bg-card/95 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">This Month's Milestone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">No milestone set for this month</p>
              <p className="text-xs text-muted-foreground">
                Create a sprint to set your monthly goal
              </p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Milestone
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">This Month's Milestone</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">One big goal you committed to this month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{milestone.title}</h3>
              <Badge variant="outline" className="text-xs">
                {format(new Date(milestone.deadline), 'MMM d')}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-semibold">{milestone.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
                  style={{ width: `${milestone.progress}%` }}
                />
              </div>
            </div>
          </div>

          {milestone.subTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Suggested sub-tasks to reach 100%:</p>
              {milestone.subTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleSubTask(task.id, task.completed)}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

