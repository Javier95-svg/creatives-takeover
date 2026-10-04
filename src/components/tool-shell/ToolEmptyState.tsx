import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ToolEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function ToolEmptyState({ title, description, action, className }: ToolEmptyStateProps) {
  return (
    <div className={cn('rounded-xl border border-dashed border-border bg-background px-5 py-8 text-center', className)}>
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
