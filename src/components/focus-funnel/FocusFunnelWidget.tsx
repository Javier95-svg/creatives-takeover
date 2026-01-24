import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  FolderKanban,
  CheckSquare,
  Brain,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useFocusFunnel } from '@/hooks/focus-funnel';
import { HierarchyTreeView } from './HierarchyTreeView';
import { QuickAddTask } from './QuickAddTask';
import { cn } from '@/lib/utils';

interface FocusFunnelWidgetProps {
  compact?: boolean;
  onOpenAIPartner?: () => void;
}

export function FocusFunnelWidget({ compact = false, onOpenAIPartner }: FocusFunnelWidgetProps) {
  const {
    goals,
    projects,
    tasks,
    todaysTasks,
    overdueTasks,
    highPriorityTasks,
    hierarchy,
    stats,
    isLoading,
    error,
    createTask,
    updateTaskStatus,
  } = useFocusFunnel();

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [expandedView, setExpandedView] = useState(!compact);

  if (isLoading) {
    return (
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-base">Focus Funnel</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">Focus Funnel</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = goals.length > 0 || projects.length > 0 || tasks.length > 0;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Focus Funnel</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Desired Outcome &rarr; Strategy &rarr; Actions
              </p>
            </div>
          </div>
          {onOpenAIPartner && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAIPartner}
              className="gap-2 text-xs"
            >
              <Brain className="h-3.5 w-3.5" />
              AI Partner
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Target className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Goals</p>
              <p className="text-lg font-semibold">{stats.activeGoals}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <FolderKanban className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Strategy</p>
              <p className="text-lg font-semibold">{stats.inProgressProjects}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <CheckSquare className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-semibold">{stats.tasksToday}</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {overdueTasks.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* High Priority Tasks Quick View */}
        {highPriorityTasks.length > 0 && !expandedView && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                High Priority
              </span>
            </div>
            <div className="space-y-1.5">
              {highPriorityTasks.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => updateTaskStatus(task.id, 'in_progress')}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    task.priority === 'urgent' ? 'bg-red-500' : 'bg-amber-500'
                  )} />
                  <span className="text-sm truncate flex-1">{task.title}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hierarchy Tree View (Expanded) */}
        {expandedView && hasData && (
          <HierarchyTreeView
            hierarchy={hierarchy}
            onTaskStatusChange={updateTaskStatus}
          />
        )}

        {/* Empty State */}
        {!hasData && (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-1">No goals yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding your first goal to build focus
            </p>
          </div>
        )}

        {/* Quick Add */}
        {showQuickAdd ? (
          <QuickAddTask
            onAdd={async (title) => {
              await createTask({ title });
              setShowQuickAdd(false);
            }}
            onCancel={() => setShowQuickAdd(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-4 w-4" />
            Quick Add Task
          </Button>
        )}

        {/* Toggle View */}
        {hasData && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setExpandedView(!expandedView)}
          >
            {expandedView ? 'Show less' : 'Show full hierarchy'}
            <ChevronRight className={cn(
              "h-3 w-3 ml-1 transition-transform",
              expandedView && "rotate-90"
            )} />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

