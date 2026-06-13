import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock, Lock, CheckCircle2, Circle, Lightbulb } from 'lucide-react';
import type { JourneyDay, DayTask, DayStatus, DayProgress } from '@/types/journey';
import DayTaskItem from './DayTaskItem';
import FounderExampleCard from './FounderExampleCard';
import TemplateViewer from './TemplateViewer';

interface DayCardProps {
  day: JourneyDay;
  status: DayStatus;
  progress?: DayProgress;
  isSelected: boolean;
  onToggleTask: (taskId: string) => void;
}

const statusConfig: Record<DayStatus, { icon: typeof Lock; label: string; color: string }> = {
  locked: { icon: Lock, label: 'Locked', color: 'text-muted-foreground' },
  available: { icon: Circle, label: 'Ready', color: 'text-info' },
  'in-progress': { icon: Circle, label: 'In Progress', color: 'text-warning' },
  completed: { icon: CheckCircle2, label: 'Complete', color: 'text-success' },
};

export default function DayCard({ day, status, progress, isSelected, onToggleTask }: DayCardProps) {
  const [templateTask, setTemplateTask] = useState<DayTask | null>(null);
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const locked = status === 'locked';

  const completedCount = progress
    ? Object.values(progress.tasks).filter((t) => t.completed).length
    : 0;

  return (
    <>
      <Collapsible defaultOpen={isSelected}>
        <Card className={`transition-all ${locked ? 'opacity-60' : ''} ${isSelected ? 'ring-1 ring-primary/30' : ''}`}>
          <CollapsibleTrigger className="w-full text-left">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold ${
                      status === 'completed'
                        ? 'border-success bg-success/10 text-success'
                        : status === 'in-progress'
                        ? 'border-warning bg-warning/10 text-warning'
                        : status === 'available'
                        ? 'border-info bg-info/10 text-info'
                        : 'border-muted bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      day.dayNumber
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      Day {day.dayNumber}: {day.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{day.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
                    <Clock className="h-3 w-3" />
                    {day.estimatedMinutes} min
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${config.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status === 'in-progress' || status === 'completed'
                      ? `${completedCount}/${day.tasks.length}`
                      : config.label}
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Tasks */}
              <div className="space-y-2">
                {day.tasks.map((task) => (
                  <DayTaskItem
                    key={task.id}
                    task={task}
                    progress={progress?.tasks[task.id]}
                    locked={locked}
                    onToggle={onToggleTask}
                    onOpenTemplate={(t) => setTemplateTask(t)}
                  />
                ))}
              </div>

              {/* Pro Tip */}
              {day.proTip && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10">
                  <Lightbulb className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning dark:text-warning">{day.proTip}</p>
                </div>
              )}

              {/* Founder Example */}
              <FounderExampleCard example={day.founderExample} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <TemplateViewer
        template={templateTask?.template ?? null}
        open={!!templateTask}
        onOpenChange={(open) => !open && setTemplateTask(null)}
      />
    </>
  );
}
