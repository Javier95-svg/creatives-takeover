import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DashboardDisclosureProps {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function DashboardDisclosure({
  title,
  summary,
  children,
  defaultOpen = false,
  className,
}: DashboardDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('rounded-xl border border-border/60 bg-card/70', className)}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {summary ? <p className="mt-1 text-sm text-muted-foreground">{summary}</p> : null}
        </div>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0">
            {open ? 'Hide' : 'Show'}
            <ChevronDown
              className={cn('ml-1.5 h-4 w-4 transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="border-t border-border/60 p-4 pt-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
