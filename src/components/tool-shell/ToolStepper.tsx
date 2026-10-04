import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

// A short, numbered path through a tool. Founders can open any step, but the
// statuses make the expected order obvious.

export type ToolStepStatus = 'done' | 'current' | 'upcoming';

export interface ToolStep<Id extends string = string> {
  id: Id;
  label: string;
  /** Short state line, e.g. "3 of 5 logged". */
  detail?: string;
  status: ToolStepStatus;
}

interface ToolStepperProps<Id extends string> {
  steps: ToolStep<Id>[];
  activeId: Id;
  onSelect: (id: Id) => void;
  className?: string;
}

export function ToolStepper<Id extends string>({ steps, activeId, onSelect, className }: ToolStepperProps<Id>) {
  return (
    <nav aria-label="Steps" className={className}>
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => {
          const active = step.id === activeId;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active ? 'border-primary bg-card' : 'border-border/60 bg-background hover:border-primary/40',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    step.status === 'done'
                      ? 'bg-primary/15 text-primary'
                      : step.status === 'current'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.status === 'done' ? <Check className="h-4 w-4" aria-label="Done" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{step.label}</span>
                  {step.detail ? <span className="block truncate text-xs text-muted-foreground">{step.detail}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
