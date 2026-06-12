import { Link } from 'react-router-dom';
import { Check, Circle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChecklistStep {
  label: string;
  description?: string;
  done: boolean;
  /** Future milestone (e.g. VSL / Launch) — shown muted with a "Soon" badge. */
  soon?: boolean;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
}

interface GettingStartedChecklistProps {
  title: string;
  subtitle?: string;
  steps: ChecklistStep[];
  className?: string;
}

export default function GettingStartedChecklist({
  title,
  subtitle,
  steps,
  className,
}: GettingStartedChecklistProps) {
  const actionable = steps.filter((s) => !s.soon);
  const doneCount = actionable.filter((s) => s.done).length;
  const currentIndex = steps.findIndex((s) => !s.done && !s.soon);
  const allDone = doneCount === actionable.length;

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {doneCount} / {actionable.length} done
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${actionable.length ? (doneCount / actionable.length) * 100 : 0}%` }}
        />
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          return (
            <li
              key={step.label}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 transition',
                isCurrent ? 'border-primary/40 bg-primary/5' : 'border-transparent',
                step.soon && 'opacity-60',
              )}
            >
              <span className="mt-0.5 shrink-0">
                {step.done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : step.soon ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Lock className="h-3 w-3" />
                  </span>
                ) : (
                  <Circle className={cn('h-5 w-5', isCurrent ? 'text-primary' : 'text-muted-foreground/50')} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-medium', step.done && 'text-muted-foreground line-through')}>
                    {step.label}
                  </p>
                  {step.soon && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">
                      Soon
                    </span>
                  )}
                  {isCurrent && !step.soon && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-caption font-medium text-primary">
                      Next
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>

              {isCurrent && step.action && !allDone && (
                <div className="shrink-0">
                  {step.action.to ? (
                    <Button asChild size="sm">
                      <Link to={step.action.to}>{step.action.label}</Link>
                    </Button>
                  ) : (
                    <Button size="sm" onClick={step.action.onClick}>
                      {step.action.label}
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
