import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Target, Layers, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PMFContextBannerProps {
  icpPersonaName: string | null;
  waitlistProductName: string | null;
  loading?: boolean;
  className?: string;
}

export function PMFContextBanner({
  icpPersonaName,
  waitlistProductName,
  loading = false,
  className,
}: PMFContextBannerProps) {
  const hasIcp = Boolean(icpPersonaName);
  const hasWaitlist = Boolean(waitlistProductName);
  const hasBoth = hasIcp && hasWaitlist;

  const steps = [
    {
      label: 'Stage I',
      name: 'ICP Builder',
      detail: icpPersonaName ?? null,
      done: hasIcp,
      route: '/icp-builder',
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
          return (
            <div key={step.name} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  step.current
                    ? 'border-primary bg-primary text-primary-foreground'
                    : step.done
                    ? 'border-success/30 bg-success-subtle text-success'
                    : 'border-border bg-background/70 text-muted-foreground'
                )}
              >
                {step.done && !step.current ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span>{step.label}: {step.name}</span>
              </div>
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
            You defined{' '}
            <span className="font-semibold">{icpPersonaName}</span> in Stage I and built the{' '}
            <span className="font-semibold">{waitlistProductName}</span> waitlist in Stage II.{' '}
            PMF Lab will now tell you if the demand evidence from your customer interviews is strong enough to start building.
          </p>
        ) : hasIcp ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            You defined <span className="font-semibold text-foreground">{icpPersonaName}</span> in Stage I.{' '}
            <Link to="/demo-studio" className="text-primary underline underline-offset-2 hover:no-underline">
              Build your waitlist page in Stage II
            </Link>{' '}
            before running PMF Lab for a more accurate score.
          </p>
        ) : hasWaitlist ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            You have a waitlist for <span className="font-semibold text-foreground">{waitlistProductName}</span>.{' '}
            <Link to="/icp-builder" className="text-primary underline underline-offset-2 hover:no-underline">
              Complete the ICP Builder in Stage I
            </Link>{' '}
            before running PMF Lab for a more accurate score.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            PMF Lab works best after completing Stages I and II.{' '}
            <Link to="/icp-builder" className="text-primary underline underline-offset-2 hover:no-underline">
              Start with the ICP Builder
            </Link>{' '}
            to define your customer, then{' '}
            <Link to="/demo-studio" className="text-primary underline underline-offset-2 hover:no-underline">
              build a waitlist page
            </Link>{' '}
            before validating here.
          </p>
        )}
      </div>
    </div>
  );
}
