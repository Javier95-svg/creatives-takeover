import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DecisionSprintStep = 1 | 2 | 3;

const SPRINT_STEPS: Array<{ step: DecisionSprintStep; label: string; subtitle: string }> = [
  { step: 1, label: 'Your ideas', subtitle: 'Up to three, three fields each' },
  { step: 2, label: 'Quick check', subtitle: 'Five questions per idea' },
  { step: 3, label: 'Decision', subtitle: 'Pick one to validate' },
];

export function DecisionSprintStepNav({
  active,
  onSelect,
  canOpen,
}: {
  active: DecisionSprintStep;
  onSelect: (step: DecisionSprintStep) => void;
  /** Steps unlock in order; a locked step can't be opened from the bar. */
  canOpen: (step: DecisionSprintStep) => boolean;
}) {
  return (
    <ol className="relative flex items-start justify-between">
      <div className="absolute top-4 h-0.5 bg-border" style={{ left: '16.5%', right: '16.5%' }} aria-hidden />
      {SPRINT_STEPS.map((entry) => {
        const isActive = active === entry.step;
        const isDone = entry.step < active;
        const isLocked = !canOpen(entry.step);
        return (
          <li key={entry.step} className="relative z-10 flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => onSelect(entry.step)}
              disabled={isLocked}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex flex-col items-center gap-1.5 px-2 pb-2 text-center transition-colors focus-visible:outline-none',
                isActive ? 'text-foreground' : 'text-muted-foreground',
                !isLocked && !isActive && 'hover:text-foreground/80',
                isLocked && 'cursor-not-allowed opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                  isActive && 'border-success bg-success text-white',
                  isDone && !isActive && 'border-success bg-card text-success',
                  !isActive && !isDone && 'border-border bg-card text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden /> : entry.step}
              </span>
              <span className="text-label font-semibold leading-tight sm:text-xs">{entry.label}</span>
              <span className="hidden text-caption leading-tight text-muted-foreground sm:block">{entry.subtitle}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
