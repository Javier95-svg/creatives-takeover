import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Repeat2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRoutine } from '@/hooks/useRoutine';
import { getCompletionKey, getLocalDateKey, getWeekEndLabel, getWeekStartKey } from '@/lib/routineTemplates';

interface RoutineSummaryCardProps {
  compact?: boolean;
}

export function RoutineSummaryCard({ compact = false }: RoutineSummaryCardProps) {
  const {
    config,
    todayTasks,
    weeklyTasks,
    completionByKey,
    isLoading,
    stats,
  } = useRoutine();

  const visibleTasks = [...todayTasks, ...weeklyTasks].slice(0, compact ? 4 : 6);
  const todayKey = getLocalDateKey();
  const weekKey = getWeekStartKey();

  if (isLoading) {
    return (
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Your Routine
          </CardTitle>
          <CardDescription>Loading your routine...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Repeat2 className="h-4 w-4 text-primary" />
            Your Routine
          </CardTitle>
          <CardDescription>Set a simple daily and weekly rhythm for your startup work.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/dashboard/routine">Build Routine</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat2 className="h-4 w-4 text-primary" />
              Your Routine
            </CardTitle>
            <CardDescription className="mt-1">
              Today plus the weekly habit due by {getWeekEndLabel()}.
            </CardDescription>
          </div>
          <Badge variant="secondary">{stats.completedCurrentCount}/{stats.totalCurrentCount}</Badge>
        </div>
        <div className="space-y-2">
          <Progress value={stats.progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">{stats.progressPercentage}% complete this period</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => {
            const periodType = task.cadence === 'weekly' ? 'weekly' : 'daily';
            const completion = completionByKey.get(
              getCompletionKey(task.id, periodType, periodType === 'weekly' ? weekKey : todayKey),
            );

            return (
              <div key={task.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3">
                {completion?.status === 'completed' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : completion?.status === 'skipped' ? (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-muted-foreground/50" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5 text-foreground">{task.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{task.cadence}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            No active routine tasks for this period.
          </div>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link to="/dashboard/routine">Open Your Routine</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
