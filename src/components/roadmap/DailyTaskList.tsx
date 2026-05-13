import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Clock, Flag, Sparkles } from 'lucide-react';
import type { RoadmapTask } from '@/types/founderOS';
import { cn } from '@/lib/utils';

interface DailyTaskListProps {
  tasks: RoadmapTask[];
  onTaskStatusChange: (taskId: string, status: RoadmapTask['status']) => void;
  showAllTasks?: boolean;
}

export const DailyTaskList = ({ tasks, onTaskStatusChange, showAllTasks = false }: DailyTaskListProps) => {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const getPriorityColor = (priority: RoadmapTask['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      case 'high':
        return 'text-orange-500 bg-orange-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: RoadmapTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  const handleTaskClick = (task: RoadmapTask) => {
    if (task.status === 'completed') return;
    
    const newStatus: RoadmapTask['status'] = 
      task.status === 'todo' ? 'in_progress' :
      task.status === 'in_progress' ? 'completed' :
      task.status;
    
    onTaskStatusChange(task.id, newStatus);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Daily Tasks</CardTitle>
            <CardDescription>
              {showAllTasks ? 'All tasks for this week' : "Today's actionable items"}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{completedTasks.length}/{tasks.length}</div>
            <div className="text-xs text-muted-foreground">completed</div>
          </div>
        </div>
        <Progress value={completionRate} className="h-2 mt-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blocked Tasks Warning */}
        {blockedTasks.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {blockedTasks.length} task{blockedTasks.length > 1 ? 's' : ''} blocked
              </span>
            </div>
          </div>
        )}

        {/* In Progress Tasks */}
        {inProgressTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">In Progress</h4>
            {inProgressTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                isSelected={selectedTask === task.id}
                getPriorityColor={getPriorityColor}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}

        {/* To Do Tasks */}
        {todoTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">To Do</h4>
            {todoTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                isSelected={selectedTask === task.id}
                getPriorityColor={getPriorityColor}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Completed</h4>
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onClick={undefined}
                isSelected={false}
                getPriorityColor={getPriorityColor}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tasks for today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface TaskItemProps {
  task: RoadmapTask;
  onClick?: () => void;
  isSelected: boolean;
  getPriorityColor: (priority: RoadmapTask['priority']) => string;
  getStatusIcon: (status: RoadmapTask['status']) => React.ReactNode;
}

const TaskItem = ({ task, onClick, isSelected, getPriorityColor, getStatusIcon }: TaskItemProps) => {
  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';
  const isInteractive = Boolean(onClick) && !isCompleted && !isBlocked;

  return (
    <div
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!isInteractive || !onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group relative border rounded-lg p-4 transition-all',
        isInteractive ? 'cursor-pointer' : 'cursor-default',
        isCompleted && 'opacity-60 bg-muted/50',
        isBlocked && 'border-red-500/20 bg-red-500/5',
        isSelected && 'ring-2 ring-primary',
        !isCompleted && !isBlocked && 'hover:border-primary/50 hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          disabled={isCompleted || isBlocked}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h5 className={cn('font-medium', isCompleted && 'line-through')}>{task.title}</h5>
            <div className="flex items-center gap-1">
              {getStatusIcon(task.status)}
              <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
                {task.priority}
              </Badge>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          {/* AI Reasoning */}
          {task.ai_generated && task.ai_reasoning && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
              <span>{task.ai_reasoning}</span>
            </div>
          )}

          {/* Blocker */}
          {isBlocked && task.blocker_reason && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-500/10 rounded p-2">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{task.blocker_reason}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {task.estimated_hours}h
              </span>
              <span className="flex items-center gap-1">
                <Flag className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {task.completed_at && (
              <span className="text-green-600">
                Completed {new Date(task.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
