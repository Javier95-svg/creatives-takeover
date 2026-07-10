import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Dashboard hierarchy contract (see DESIGN_SYSTEM.md → "Dashboard hierarchy"):
 * L1 primary — one `DashboardPanelHeader as="h1" size="page"` per tab, plus at
 *   most one MetricTile row (2–4 tiles).
 * L2 secondary — badge row (secondary=primary count, outline=context,
 *   destructive=overdue) and `as="h2" size="panel"` section headers.
 * L3 tertiary — optional content lives in DashboardDisclosure.
 */

interface DashboardPanelHeaderProps {
  kicker: string;
  title: string;
  as?: 'h1' | 'h2';
  size?: 'page' | 'panel';
  description?: string;
  badges?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DashboardPanelHeader({
  kicker,
  title,
  as: Heading = 'h2',
  size = 'panel',
  description,
  badges,
  action,
  className,
}: DashboardPanelHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        <p className="text-label font-semibold uppercase tracking-[0.18em] text-primary/80">{kicker}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Heading
            className={cn(
              'font-space-grotesk font-semibold tracking-tight text-foreground',
              size === 'page' ? 'text-2xl sm:text-3xl' : 'text-lg',
            )}
          >
            {title}
          </Heading>
          {badges}
        </div>
        {description ? (
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">{action}</div> : null}
    </div>
  );
}

export interface MetricTileDelta {
  direction: 'up' | 'down' | 'flat';
  label: string;
}

interface MetricTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: MetricTileDelta | null;
  progress?: number | null;
  icon?: LucideIcon;
  to?: string;
  className?: string;
}

const DELTA_STYLES: Record<MetricTileDelta['direction'], { icon: LucideIcon; className: string }> = {
  up: { icon: ArrowUpRight, className: 'text-success' },
  down: { icon: ArrowDownRight, className: 'text-destructive' },
  flat: { icon: Minus, className: 'text-muted-foreground' },
};

export function MetricTile({
  label,
  value,
  hint,
  delta,
  progress,
  icon: Icon,
  to,
  className,
}: MetricTileProps) {
  const DeltaIcon = delta ? DELTA_STYLES[delta.direction].icon : null;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-label font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" /> : null}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="font-space-grotesk text-2xl font-semibold text-foreground">{value}</span>
        {delta && DeltaIcon ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              DELTA_STYLES[delta.direction].className,
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {delta.label}
          </span>
        ) : null}
      </div>
      {typeof progress === 'number' ? <Progress value={progress} className="mt-2 h-1.5" /> : null}
      {hint ? <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  const baseClass = cn('block rounded-xl border border-border/60 bg-background/70 p-4', className);

  if (to) {
    return (
      <Link to={to} className={cn(baseClass, 'transition-colors hover:border-primary/40 hover:bg-primary/[0.03]')}>
        {body}
      </Link>
    );
  }

  return <div className={baseClass}>{body}</div>;
}
