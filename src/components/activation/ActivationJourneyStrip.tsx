import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActivationJourneyStripProps {
  stageLabel: string;
  title: string;
  description: string;
  doneLabel: string;
  completedLabel: string;
  nextRoute: string;
  nextLabel: string;
  isComplete: boolean;
  className?: string;
}

export function ActivationJourneyStrip({
  stageLabel,
  title,
  description,
  doneLabel,
  completedLabel,
  nextRoute,
  nextLabel,
  isComplete,
  className,
}: ActivationJourneyStripProps) {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] border px-5 py-5 shadow-sm backdrop-blur-sm',
        isComplete
          ? 'border-green-500/25 bg-green-500/10'
          : 'border-sky-500/25 bg-sky-500/10',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="border-current/20 bg-background/70">
            {stageLabel}
          </Badge>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-start gap-2 rounded-2xl border border-current/10 bg-background/65 px-4 py-3 text-sm">
            {isComplete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
            )}
            <p className="leading-relaxed text-foreground/85">
              {isComplete ? completedLabel : doneLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isComplete ? (
            <Button asChild className="rounded-full">
              <Link to={nextRoute}>
                {nextLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button className="rounded-full" disabled>
              Complete this step first
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
