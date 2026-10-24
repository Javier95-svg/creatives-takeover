import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, type LucideIcon } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/**
 * Document blocks for the Overview page: headings, rows, checklists, toggles
 * and callouts, the way a Notion page reads. No borders or cards; spacing and
 * type carry the structure. See DESIGN_SYSTEM.md → "Dashboard hierarchy".
 */

/** A titled part of the page, with an optional link to the full tool. */
export function DocSection({
  id,
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  icon?: LucideIcon;
  action?: { label: string; to: string } | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn('mt-12', className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 font-space-grotesk text-lg font-semibold tracking-tight text-foreground">
          {Icon ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
          {title}
        </h2>
        {action ? (
          <Link to={action.to} className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A soft, borderless highlight for the one thing to read first. */
export function DocCallout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl bg-muted/50 px-5 py-4', className)}>{children}</div>;
}

/** A property row: what it is, its value, and where it leads. */
export function DocRow({
  icon: Icon,
  label,
  value,
  to,
  muted = false,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  to?: string;
  muted?: boolean;
}) {
  const body = (
    <>
      <span className="flex w-36 shrink-0 items-center gap-2 text-muted-foreground sm:w-44">
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn('min-w-0 flex-1 truncate', muted ? 'text-muted-foreground' : 'text-foreground')}>{value}</span>
      {to ? <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" /> : null}
    </>
  );
  const className = 'group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-sm';
  return to ? (
    <Link to={to} className={cn(className, 'transition-colors hover:bg-muted/60')}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** A checklist line. Ticking completes it; done lines stay, struck through. */
export function DocCheck({
  title,
  done,
  onComplete,
  busy = false,
  meta,
  tone,
}: {
  title: string;
  done: boolean;
  onComplete?: () => void;
  busy?: boolean;
  meta?: ReactNode;
  tone?: 'overdue';
}) {
  const canTick = !done && Boolean(onComplete) && !busy;
  return (
    <div className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `${title}, done` : `Mark "${title}" as done`}
        disabled={!canTick}
        onClick={onComplete}
        // A 24px tap area around a 16px box; no-touch-target opts out of the
        // global 44px mobile minimum, which turned the box into a large square.
        className={cn(
          'no-touch-target group/check -m-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !canTick && !done && 'cursor-default',
        )}
      >
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-sm border transition-colors',
            done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50 group-hover/check:border-primary',
          )}
        >
          {done ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
        </span>
      </button>
      <span className={cn('min-w-0 flex-1 truncate', done ? 'text-muted-foreground line-through' : tone === 'overdue' ? 'text-destructive' : 'text-foreground')}>
        {title}
      </span>
      {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
    </div>
  );
}

/** A disclosure line. Its content mounts only when opened. */
export function DocToggle({
  title,
  summary,
  children,
  defaultOpen = false,
  onOpenChange,
}: {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="-mx-2 flex w-full min-h-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} aria-hidden="true" />
          <span className="font-medium text-foreground">{title}</span>
          {summary ? <span className="min-w-0 truncate text-muted-foreground">{summary}</span> : null}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-2 pl-6 pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
