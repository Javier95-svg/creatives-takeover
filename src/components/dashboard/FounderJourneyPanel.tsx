import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FlaskConical,
  Globe,
  Layers,
  Presentation,
  Rocket,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPanelHeader } from '@/components/dashboard/DashboardPanel';
import { useFounderJourneySnapshot } from '@/hooks/useFounderJourneySnapshot';
import {
  trackDashboardJourneyContinueClicked,
  trackDashboardJourneyPanelViewed,
  trackDashboardJourneyStageClicked,
  trackDashboardJourneyToolOpened,
} from '@/lib/analytics';
import type { JourneyStageNode, JourneyToolTile } from '@/lib/founderJourney';
import { cn } from '@/lib/utils';

const TILE_ICONS: Record<string, LucideIcon> = {
  'icp-builder': Target,
  'demo-studio': Layers,
  'pmf-lab': FlaskConical,
  'mvp-builder': Rocket,
  'gtm-strategist': Globe,
  'traction-engine': TrendingUp,
  'pitch-deck-analyzer': Presentation,
};

function StageNode({ node }: { node: JourneyStageNode }) {
  return (
    <Link
      to={node.route}
      onClick={() => trackDashboardJourneyStageClicked({ stage: node.stage, status: node.status })}
      className="group flex min-w-[64px] snap-start flex-col items-center gap-1.5 sm:min-w-0 sm:flex-1"
      title={`${node.title} stage`}
    >
      <span
        className={cn(
          'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
          node.status === 'complete' &&
            'border-success/40 bg-success/15 text-success',
          node.status === 'current' &&
            'border-primary bg-primary/10 text-primary ring-2 ring-primary/25',
          node.status === 'upcoming' &&
            'border-border/70 bg-background/80 text-muted-foreground group-hover:border-primary/40',
        )}
      >
        {node.status === 'complete' ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          node.numeral
        )}
        {node.status !== 'complete' && node.hasActivity ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-warning"
            aria-hidden="true"
            title="In progress"
          />
        ) : null}
      </span>
      <span
        className={cn(
          'text-center text-[10px] font-medium uppercase tracking-wide',
          node.status === 'current' ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {node.title}
      </span>
    </Link>
  );
}

function ToolTile({ tile }: { tile: JourneyToolTile }) {
  const Icon = TILE_ICONS[tile.key] ?? Compass;
  return (
    <Link
      to={tile.route}
      onClick={() => trackDashboardJourneyToolOpened({ tool: tile.key, status: tile.status, route: tile.route })}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border/60 bg-background/70 p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]',
        tile.status === 'not_started' && 'opacity-75',
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80">
        <Icon className="h-4 w-4 text-primary/80" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              tile.status === 'done' && 'bg-success',
              tile.status === 'started' && 'bg-warning',
              tile.status === 'not_started' && 'bg-muted-foreground/40',
            )}
            aria-hidden="true"
          />
          <span className="truncate text-sm font-semibold text-foreground">{tile.label}</span>
          {tile.highlight ? (
            <Badge variant="outline" className="shrink-0 border-success/40 bg-success/10 text-[10px] text-success">
              {tile.highlight}
            </Badge>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tile.outputLine}</span>
        {tile.updatedAt ? (
          <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
            Updated {formatDistanceToNow(new Date(tile.updatedAt), { addSuffix: true })}
          </span>
        ) : tile.status === 'not_started' ? (
          <span className="mt-0.5 block text-[10px] font-medium text-primary/80">Start →</span>
        ) : null}
      </span>
      <ArrowRight
        className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-primary/70"
        aria-hidden="true"
      />
    </Link>
  );
}

export default function FounderJourneyPanel() {
  const { snapshot, isLoading } = useFounderJourneySnapshot();
  const viewedRef = useRef(false);

  useEffect(() => {
    if (isLoading || viewedRef.current) return;
    viewedRef.current = true;
    trackDashboardJourneyPanelViewed({
      stage: snapshot.stages.find((node) => node.status === 'current')?.stage ?? null,
      stages_completed: snapshot.stagesCompleted,
      tools_done: snapshot.tools.filter((tile) => tile.status === 'done').length,
    });
  }, [isLoading, snapshot]);

  if (isLoading) {
    return <Skeleton className="mb-6 h-48 rounded-xl" />;
  }

  if (snapshot.isEmpty) {
    return (
      <Card className="mb-6 border-border/60 bg-card/70">
        <CardContent className="p-5 sm:p-6">
          <DashboardPanelHeader
            kicker="Startup journey"
            title="Your journey starts with one saved artifact."
            description="Each tool you complete lights up here, so you always know where you stand across the whole journey."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/icp-builder">
                1. Define your ICP
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/demo-studio">2. Publish a demo</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/pmf-lab">3. Validate demand</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-border/60 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader
          kicker="Startup journey"
          title="Where you stand"
          badges={<Badge variant="secondary">{snapshot.stagesCompleted}/7 stages</Badge>}
          action={
            snapshot.nextAction ? (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link
                  to={snapshot.nextAction.route}
                  onClick={() => trackDashboardJourneyContinueClicked({ milestone_key: snapshot.nextAction?.key })}
                >
                  Continue: {snapshot.nextAction.label}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null
          }
        />

        <Progress value={snapshot.progressPercent} className="mt-4 h-1.5" />

        <div className="relative mt-5">
          <div className="absolute left-4 right-4 top-4 hidden h-px bg-border/70 sm:block" aria-hidden="true" />
          <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:gap-0 sm:overflow-visible">
            {snapshot.stages.map((node) => (
              <StageNode key={node.stage} node={node} />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.tools.map((tile) => (
            <ToolTile key={tile.key} tile={tile} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <Link to="/bizmap-ai" className="font-medium text-primary hover:underline">
            Open Startup Development Cycle
          </Link>
          {snapshot.lastTouched ? (
            <Link
              to={snapshot.lastTouched.route}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Pick up where you left off: {snapshot.lastTouched.label}
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
