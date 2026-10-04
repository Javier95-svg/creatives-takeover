import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// The single primary action on a tool screen. A screen shows one of these and
// no other filled button, so the founder never has to guess what comes first.

interface NextStepCardProps {
  title: string;
  reason: string;
  cta: string;
  onAction: () => void;
  disabled?: boolean;
  /** Secondary, low-emphasis links shown under the button. */
  secondary?: ReactNode;
  className?: string;
}

export function NextStepCard({ title, reason, cta, onAction, disabled, secondary, className }: NextStepCardProps) {
  return (
    <div className={cn('rounded-xl border border-primary/30 bg-card p-5 sm:p-6', className)}>
      <p className="text-sm font-medium text-primary">Next step</p>
      <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{reason}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="button" onClick={onAction} disabled={disabled}>
          {cta}
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
        </Button>
        {secondary}
      </div>
    </div>
  );
}
