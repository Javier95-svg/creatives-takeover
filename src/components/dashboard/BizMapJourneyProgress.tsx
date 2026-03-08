import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Lock, Sparkles, ArrowRight, Compass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useBizMapStageTasks } from '@/hooks/useBizMapStageTasks';
import { BIZMAP_STAGES, BIZMAP_STAGE_ORDER, getStageIndex, type BizMapStage } from '@/lib/bizmapStages';

// ── stage node ────────────────────────────────────────────────────────────────

interface StageNodeProps {
  stage: BizMapStage;
  numeral: string;
  title: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isUnlocked: boolean;
  isLast: boolean;
}

function StageNode({ stage, numeral, title, isCompleted, isCurrent, isUnlocked, isLast }: StageNodeProps) {
  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className="flex flex-col items-center gap-1">
        <div
          className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : isCurrent
              ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30 ring-offset-1'
              : isUnlocked
              ? 'border-border bg-muted text-muted-foreground'
              : 'border-border/40 bg-background text-muted-foreground/40'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : !isUnlocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            numeral
          )}
          {isCurrent && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span
          className={`text-[10px] font-medium text-center leading-none max-w-[56px] truncate ${
            isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
          }`}
        >
          {title}
        </span>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div
          className={`h-0.5 flex-1 mx-1 ${
            isCompleted ? 'bg-green-400' : isUnlocked ? 'bg-border' : 'bg-border/30 border-dashed'
          }`}
        />
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function BizMapJourneyProgress() {
  const { currentStage, highestUnlockedStage, stageState, setCurrentStage } = useBizMapProgress();
  const { completedCount, totalCount, completionPercent, nextIncompleteTask } =
    useBizMapStageTasks(currentStage as BizMapStage | null);

  const currentDefinition = BIZMAP_STAGES.find((s) => s.id === currentStage);

  return (
    <Card className="border-primary/20 bg-card/90" id="journey-progress">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-5 w-5 text-primary" />
            Founder Journey
          </CardTitle>
          {currentDefinition && (
            <Badge variant="secondary" className="text-xs">
              Stage {currentDefinition.numeral}: {currentDefinition.title}
            </Badge>
          )}
        </div>

        {/* 5-stage progress rail */}
        <div className="flex items-center w-full overflow-hidden">
          {BIZMAP_STAGES.map((stageDef, idx) => {
            const isCompleted = !!(stageState as any)?.[stageDef.id]?.completed;
            const isCurrent = stageDef.id === currentStage;
            const isUnlocked =
              getStageIndex(stageDef.id) <= getStageIndex(highestUnlockedStage as BizMapStage);

            return (
              <StageNode
                key={stageDef.id}
                stage={stageDef.id}
                numeral={stageDef.numeral}
                title={stageDef.title}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                isUnlocked={isUnlocked}
                isLast={idx === BIZMAP_STAGES.length - 1}
              />
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current stage task progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount}/{totalCount} tasks completed in {currentDefinition?.title}
            </span>
            <span className="font-medium text-foreground">{completionPercent}%</span>
          </div>
          <Progress value={completionPercent} className="h-2" />
        </div>

        {/* Next action */}
        {nextIncompleteTask && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">Next action</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground leading-snug flex-1">
                {nextIncompleteTask.title}
              </p>
              <Link to={nextIncompleteTask.route}>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* All stage tasks done */}
        {totalCount > 0 && completedCount === totalCount && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">
              All {currentDefinition?.title} tasks complete! Check your next stage.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            {BIZMAP_STAGES.filter((s, i) => (stageState as any)?.[s.id]?.completed).length}/
            {BIZMAP_STAGES.length} stages completed
          </p>
          <Link to="/bizmap-ai" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            View full BizMap <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
