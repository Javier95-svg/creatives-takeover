import { cn } from '@/lib/utils';

export function CohortModeSwitch({
  cohortLabel,
  workspace,
  onChange,
}: {
  /** "Cohort" for founders, "Program" for staff. */
  cohortLabel: string;
  workspace: boolean;
  onChange: (workspace: boolean) => void;
}) {
  const options = [
    { label: cohortLabel, active: !workspace, value: false },
    { label: 'My workspace', active: workspace, value: true },
  ];
  return (
    <div className="mb-5 inline-flex rounded-full border border-border/60 bg-background/70 p-1 shadow-sm" role="group" aria-label="Dashboard view">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={option.active}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            option.active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
