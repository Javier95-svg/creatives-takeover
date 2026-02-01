import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ExternalLink, FileText } from 'lucide-react';
import type { DayTask, DayTaskProgress } from '@/types/journey';

interface DayTaskItemProps {
  task: DayTask;
  progress?: DayTaskProgress;
  locked: boolean;
  onToggle: (taskId: string) => void;
  onOpenTemplate: (task: DayTask) => void;
}

export default function DayTaskItem({ task, progress, locked, onToggle, onOpenTemplate }: DayTaskItemProps) {
  const completed = progress?.completed ?? false;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        completed
          ? 'bg-primary/5 border-primary/20'
          : locked
          ? 'bg-muted/30 border-muted/20 opacity-60'
          : 'bg-background border-border hover:border-primary/30'
      }`}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={() => onToggle(task.id)}
        disabled={locked}
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0 space-y-1.5">
        <p className={`text-sm font-medium leading-snug ${completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="outline" className="text-xs gap-1 py-0">
            <Clock className="h-3 w-3" />
            {task.estimatedMinutes} min
          </Badge>

          {task.template && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 px-2"
              onClick={() => onOpenTemplate(task)}
              disabled={locked}
            >
              <FileText className="h-3 w-3" />
              Template
            </Button>
          )}

          {task.toolLink && (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2" asChild disabled={locked}>
              <a href={task.toolLink.href}>
                <ExternalLink className="h-3 w-3" />
                {task.toolLink.label}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
