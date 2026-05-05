import { Check, Circle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  BIZMAP_STAGES,
  isStageUnlocked,
  type BizMapStage,
} from '@/lib/bizmapStages';

interface StageMapRailProps {
  currentStage: BizMapStage;
  highestUnlockedStage: BizMapStage;
  stageState: Record<BizMapStage, { unlocked: boolean; completed: boolean; completedAt: string | null }>;
  onSelectStage?: (stage: BizMapStage) => void;
  selectedStage?: BizMapStage;
}

export function StageMapRail({
  currentStage,
  highestUnlockedStage,
  stageState,
  onSelectStage,
  selectedStage,
}: StageMapRailProps) {
  const activeStage = selectedStage ?? currentStage;

  return (
    <div className="rounded-3xl border border-border/70 bg-card/85 backdrop-blur-sm p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Startup Development Cycle</p>
        <p className="text-sm text-muted-foreground">
          Where you are in the journey, what you've shipped, and what unlocks next.
        </p>
      </div>

      <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {BIZMAP_STAGES.map((stage, index) => {
          const state = stageState[stage.id];
          const completed = state?.completed ?? false;
          const unlocked = state?.unlocked ?? isStageUnlocked(stage.id, highestUnlockedStage);
          const isActive = stage.id === activeStage;
          const isCurrent = stage.id === currentStage;
          const isLast = index === BIZMAP_STAGES.length - 1;

          const statusIcon = completed ? (
            <Check className="h-3.5 w-3.5" />
          ) : unlocked ? (
            <Circle className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          );

          return (
            <li key={stage.id} className="relative">
              <button
                type="button"
                onClick={() => onSelectStage?.(stage.id)}
                disabled={!onSelectStage}
                className={cn(
                  'group flex w-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all',
                  isActive
                    ? 'border-primary/50 bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-background/70 hover:border-primary/30',
                  !unlocked && 'opacity-60',
                  !onSelectStage && 'cursor-default',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                      completed
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {completed ? statusIcon : stage.numeral}
                  </div>
                  {isCurrent && !completed ? (
                    <Badge variant="default" className="text-[10px]">Active</Badge>
                  ) : completed ? (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Done</Badge>
                  ) : !unlocked ? (
                    <Badge variant="outline" className="text-[10px]">Locked</Badge>
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{stage.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{stage.description}</p>
                </div>
              </button>

              {!isLast ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute right-[-6px] top-1/2 hidden h-0.5 w-3 -translate-y-1/2 bg-border/60 sm:block"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
