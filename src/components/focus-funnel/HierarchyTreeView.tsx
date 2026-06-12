import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronRight,
  Target,
  FolderKanban,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { FocusFunnelHierarchy, FocusTask, TaskStatus } from '@/types/focus-funnel';
import { cn } from '@/lib/utils';

interface HierarchyTreeViewProps {
  hierarchy: FocusFunnelHierarchy;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => Promise<boolean>;
}

export function HierarchyTreeView({ hierarchy, onTaskStatusChange }: HierarchyTreeViewProps) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleTaskToggle = async (task: FocusTask) => {
    if (!onTaskStatusChange) return;
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    await onTaskStatusChange(task.id, newStatus);
  };

  const getPriorityColor = (priority: number | string) => {
    if (typeof priority === 'number') {
      if (priority <= 1) return 'text-red-500';
      if (priority <= 2) return 'text-orange-500';
      if (priority <= 3) return 'text-yellow-500';
      return 'text-muted-foreground';
    }
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderTask = (task: FocusTask, indent: number = 0) => (
    <div
      key={task.id}
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group",
        task.status === 'done' && "opacity-60"
      )}
      style={{ marginLeft: `${indent * 16}px` }}
    >
      <Checkbox
        checked={task.status === 'done'}
        onCheckedChange={() => handleTaskToggle(task)}
        className="h-4 w-4"
      />
      <span className={cn(
        "text-sm flex-1 truncate",
        task.status === 'done' && "line-through text-muted-foreground"
      )}>
        {task.title}
      </span>
      {task.priority !== 'medium' && (
        <Badge
          variant="outline"
          className={cn("text-caption px-1.5 h-5", getPriorityColor(task.priority))}
        >
          {task.priority}
        </Badge>
      )}
      {task.deadline && (
        <span className="text-caption text-muted-foreground">
          {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {/* Goals with Projects and Tasks */}
      {hierarchy.goals.map(goal => (
        <div key={goal.id} className="space-y-1">
          {/* Goal Header */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-auto py-2 px-2 hover:bg-primary/5"
            onClick={() => toggleGoal(goal.id)}
          >
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform text-muted-foreground",
              expandedGoals.has(goal.id) && "rotate-90"
            )} />
            <Target className={cn("h-4 w-4", getPriorityColor(goal.priority))} />
            <span className="font-medium flex-1 text-left truncate">{goal.title}</span>
            <Progress value={goal.progress_percentage} className="w-16 h-1.5" />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {Math.round(goal.progress_percentage)}%
            </span>
          </Button>

          {/* Goal Content (Projects & Tasks) */}
          {expandedGoals.has(goal.id) && (
            <div className="ml-2 border-l-2 border-border/50 pl-2 space-y-1">
              {/* Projects under this goal */}
              {goal.projects.map(project => (
                <div key={project.id} className="space-y-1">
                  {/* Project Header */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-auto py-1.5 px-2 hover:bg-muted/50"
                    onClick={() => toggleProject(project.id)}
                  >
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 transition-transform text-muted-foreground",
                      expandedProjects.has(project.id) && "rotate-90"
                    )} />
                    <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm flex-1 text-left truncate">{project.title}</span>
                    {getStatusIcon(project.status)}
                    <span className="text-caption text-muted-foreground">
                      {project.tasks.filter(t => t.status === 'done').length}/{project.tasks.length}
                    </span>
                  </Button>

                  {/* Tasks under this project */}
                  {expandedProjects.has(project.id) && project.tasks.length > 0 && (
                    <div className="ml-4">
                      {project.tasks.map(task => renderTask(task, 0))}
                    </div>
                  )}
                </div>
              ))}

              {/* Orphan tasks under this goal (no project) */}
              {goal.orphanTasks.length > 0 && (
                <div className="ml-4 pt-1 border-t border-border/30">
                  <span className="text-caption text-muted-foreground uppercase tracking-wide px-2">
                    Unassigned Tasks
                  </span>
                  {goal.orphanTasks.map(task => renderTask(task, 0))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Orphan Projects (no goal) */}
      {hierarchy.orphanProjects.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground uppercase tracking-wide px-2 mb-2 block">
            Projects without Goals
          </span>
          {hierarchy.orphanProjects.map(project => (
            <div key={project.id} className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-auto py-1.5 px-2 hover:bg-muted/50"
                onClick={() => toggleProject(project.id)}
              >
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform text-muted-foreground",
                  expandedProjects.has(project.id) && "rotate-90"
                )} />
                <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm flex-1 text-left truncate">{project.title}</span>
                {getStatusIcon(project.status)}
              </Button>

              {expandedProjects.has(project.id) && project.tasks.length > 0 && (
                <div className="ml-6">
                  {project.tasks.map(task => renderTask(task, 0))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Orphan Tasks (no project, no goal) */}
      {hierarchy.orphanTasks.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground uppercase tracking-wide px-2 mb-2 block">
            Quick Tasks
          </span>
          {hierarchy.orphanTasks.map(task => renderTask(task, 0))}
        </div>
      )}

      {/* Empty state */}
      {hierarchy.goals.length === 0 &&
       hierarchy.orphanProjects.length === 0 &&
       hierarchy.orphanTasks.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No items yet. Add your first goal to get started.
        </div>
      )}
    </div>
  );
}
