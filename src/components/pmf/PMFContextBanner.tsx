import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Target, Layers, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PMFContextBannerProps {
  icpPersonaName: string | null;
  waitlistProductName: string | null;
  /** Links the provenance chip back to the exact draft this context came from. */
  icpDraftId?: string | null;
  loading?: boolean;
  className?: string;
}

export function PMFContextBanner({
  icpPersonaName,
  waitlistProductName,
  icpDraftId = null,
  loading = false,
  className,
}: PMFContextBannerProps) {
  const hasIcp = Boolean(icpPersonaName);
  const hasWaitlist = Boolean(waitlistProductName);
  const hasBoth = hasIcp && hasWaitlist;
  const icpRoute = icpDraftId ? `/icp/draft/${icpDraftId}` : '/icp-builder';

  const steps = [
    {
      label: 'Stage I',
      name: 'ICP Builder',
      detail: icpPersonaName ?? null,
      done: hasIcp,
      route: icpRoute,
      icon: Target,
    },
    {
      label: 'Stage II',
      name: 'Demo Studio',
      detail: waitlistProductName ?? null,
      done: hasWaitlist,
      route: '/demo-studio',
      icon: Layers,
    },
    {
      label: 'Stage III',
      name: 'PMF Lab',
      detail: 'You are here',
      done: false,
      route: '/pmf-lab',
      icon: FlaskConical,
      current: true,
    },
  ];

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-border/60 bg-muted/20 p-5 animate-pulse', className)}>
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="mt-3 h-3 w-full rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-primary/15 bg-primary/5 p-5 space-y-4', className)}>
      {/* Journey breadcrumb */}
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const chipClass = cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            step.current
              ? 'border-primary bg-primary text-primary-foreground'
              : step.done
              ? 'border-success/30 bg-success-subtle text-success hover:bg-success-subtle/80'
              : 'border-border bg-background/70 text-muted-foreground hover:bg-background'
          );
          const chipBody = (
            <>
              {step.done && !step.current ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span>{step.label}: {step.name}</span>
            </>
          );
          return (
            <div key={step.name} className="flex items-center gap-2">
              {/* The completed stages link back to the artifact they came from, so the
                  inherited context is verifiable rather than an unexplained assertion. */}
              {step.current ? (
                <div className={chipClass}>{chipBody}</div>
              ) : (
                <Link
                  to={step.route}
                  className={chipClass}
                  title={step.detail ? `${step.name}: ${step.detail}` : `Open ${step.name}`}
                >
                  {chipBody}
                </Link>
              )}
              {index < steps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Contextual message */}
      <div className="space-y-1">
        {hasBoth ? (
          <p className="text-sm leading-relaxed text-foreground">
            Carried over from your earlier stages: you defined{' '}
            <Link to={icpRoute} className="font-semibold underline underline-offset-2 hover:no-underline">
              {icpPersonaName}
            </Link>{' '}
            in Stage I and built{' '}
            <span className="font-semibold">{waitlistProductName}</span> in Stage II.{' '}
            PMF Lab scores whether the evidence from those conversations and demand signals is strong enough to start building.
          </p>
        ) : hasIcp ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Carried over from Stage I: you defined{' '}
            <Link to={icpRoute} className="font-semibold text-foreground underline underline-offset-2 hover:no-underline">
              {icpPersonaName}
            </Link>
            .{' '}
            <Link to="/demo-studio" className="text-primary underline underline-offset-2 hover:no-underline">
              Publish a demo in Stage II
            </Link>{' '}
            to add verified demand signals to this score.
          </p>
        ) : hasWaitlist ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Carried over from Stage II: <span className="font-semibold text-foreground">{waitlistProductName}</span>.{' '}
            <Link to="/icp-builder" className="text-primary underline underline-offset-2 hover:no-underline">
              Complete the ICP Builder in Stage I
            </Link>{' '}
            so this score knows which customer you are testing.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            PMF Lab works best after Stages I and II.{' '}
            <Link to="/icp-builder" className="text-primary underline underline-offset-2 hover:no-underline">
              Start with the ICP Builder
            </Link>{' '}
            to define your customer, then{' '}
            <Link to="/demo-studio" className="text-primary underline underline-offset-2 hover:no-underline">
              publish a demo
            </Link>{' '}
            before validating here.
          </p>
        )}
      </div>
    </div>
  );
}
