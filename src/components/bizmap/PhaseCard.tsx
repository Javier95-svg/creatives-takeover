import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, CheckCircle2, ArrowRight, SkipForward } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Phase } from '@/store/leanStartupStore';

interface JourneyInfo {
  title: string;
  href: string;
  totalDays: number;
  journeyPercent: number;
  started: boolean;
}

interface ToolInfo {
  name: string;
  href: string;
  icon: LucideIcon;
  used: boolean;
}

interface PhaseCardProps {
  phase: Phase;
  title: string;
  description: string;
  icon: LucideIcon;
  journey: JourneyInfo;
  tools: ToolInfo[];
  completionPercent: number;
  isActive: boolean;
  isLocked: boolean;
  onSkipAhead?: () => void;
}

export default function PhaseCard({
  title,
  description,
  icon: Icon,
  journey,
  tools,
  completionPercent,
  isActive,
  isLocked,
  onSkipAhead,
}: PhaseCardProps) {
  const isComplete = completionPercent === 100;

  // Determine badge
  let badgeContent: string;
  let badgeClass: string;
  if (isComplete) {
    badgeContent = 'Complete';
    badgeClass = 'bg-success/10 text-success border-success/20';
  } else if (isActive) {
    badgeContent = `${completionPercent}%`;
    badgeClass = 'bg-primary/10 text-primary border-primary/20';
  } else if (isLocked) {
    badgeContent = 'Locked';
    badgeClass = 'bg-muted text-muted-foreground border-muted';
  } else {
    badgeContent = `${completionPercent}%`;
    badgeClass = 'bg-muted text-muted-foreground border-muted';
  }

  // Determine CTA
  let ctaLabel: string;
  if (isComplete) ctaLabel = 'Review Journey';
  else if (journey.started) ctaLabel = 'Continue Journey';
  else ctaLabel = 'Start Journey';

  return (
    <Card
      className={`relative transition-all ${
        isActive
          ? 'border-primary/30 bg-primary/[0.02] shadow-sm'
          : isLocked
            ? 'border-muted/50 opacity-60'
            : 'border-border'
      }`}
    >
      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
          <Lock className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center px-4">
            Complete 30% of the previous phase to unlock
          </p>
          {onSkipAhead && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs gap-1"
              onClick={onSkipAhead}
            >
              <SkipForward className="h-3 w-3" />
              Skip Ahead
            </Button>
          )}
        </div>
      )}

      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <Badge className={badgeClass}>{badgeContent}</Badge>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall progress */}
        <Progress value={completionPercent} className="h-1.5" />

        {/* Journey section */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Journey
          </p>
          <Link
            to={journey.href}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">{journey.title}</span>
            <span className="text-xs text-muted-foreground">{journey.totalDays}d</span>
          </Link>
        </div>

        {/* Tools section */}
        {tools.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Tools
            </p>
            <div className="space-y-1">
              {tools.map((tool) => {
                const ToolIcon = tool.icon;
                return (
                  <Link
                    key={tool.name}
                    to={tool.href}
                    className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    {tool.used ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : (
                      <ToolIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={tool.used ? 'text-foreground' : 'text-muted-foreground'}>
                      {tool.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <Button className="w-full gap-2" size="sm" asChild>
          <Link to={journey.href}>
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
