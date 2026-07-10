import { cn } from '@/lib/utils';

export type DecisionSprintStep = 1 | 2 | 3;

const SPRINT_STEPS: Array<{ step: DecisionSprintStep; label: string; subtitle: string }> = [
  { step: 1, label: 'Shortlist', subtitle: 'Capture the top 2-3 concepts you are considering' },
  { step: 2, label: 'Score', subtitle: 'Rate pain, reachability, and demand evidence' },
  { step: 3, label: 'Decide', subtitle: 'Pick the concept with the strongest signal' },
];

export function DecisionSprintStepNav({
  active,
  onSelect,
}: {
  active: DecisionSprintStep;
  onSelect: (step: DecisionSprintStep) => void;
}) {
  return (
    <div className="relative flex items-start justify-between">
      <div className="absolute top-4 h-[2px] bg-border" style={{ left: '16.5%', right: '16.5%' }} />
      {SPRINT_STEPS.map((entry) => (
        <button
          key={entry.step}
          type="button"
          onClick={() => onSelect(entry.step)}
          className={cn(
            'relative z-10 flex flex-1 flex-col items-center gap-1.5 px-2 pb-2 text-center transition-colors focus-visible:outline-none',
            active === entry.step ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70',
          )}
        >
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
              active === entry.step
                ? 'border-success bg-success text-white'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {entry.step}
          </span>
          <span className="text-label font-semibold leading-tight sm:text-xs">{entry.label}</span>
          <span className="hidden text-caption leading-tight text-muted-foreground sm:block">{entry.subtitle}</span>
        </button>
      ))}
    </div>
  );
}
