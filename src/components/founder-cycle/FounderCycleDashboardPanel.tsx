import { Link } from 'react-router-dom';
import { ArrowRight, Circle, Target } from 'lucide-react';
import type { ReactNode } from 'react';

import { DashboardPanelHeader } from '@/components/dashboard/DashboardPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFounderCycle } from '@/hooks/useFounderCycle';
import { useFirstCustomerSprint } from '@/hooks/useFirstCustomerSprint';
import { loopProgress } from '@/lib/founderCycle';
import { trackCyclePrimaryActionStarted } from '@/lib/analytics';
import FounderCycleActionFeedback from '@/components/founder-cycle/FounderCycleActionFeedback';

export default function FounderCycleDashboardPanel({ fallback }: { fallback: ReactNode }) {
  const cycle = useFounderCycle();
  const firstCustomerSprint = useFirstCustomerSprint();
  const snapshot = cycle.snapshot;
  if (!cycle.showCycle || !snapshot) return <>{fallback}</>;
  const progress = loopProgress(snapshot.selectedLoop, snapshot.evidence);

  return (
    <Card className="border-primary/30 bg-card/70">
      <CardContent className="p-5 sm:p-6">
        <DashboardPanelHeader
          kicker="Founder execution cycle"
          title={`${snapshot.selectedLoop}: ${snapshot.primaryAction.title}`}
          description={snapshot.primaryAction.reason}
          badges={(
            <>
              <Badge>{snapshot.selectedLoop}</Badge>
              {snapshot.raiseActive ? <Badge variant="outline">RAISE parallel</Badge> : null}
            </>
          )}
          action={(
            <Button asChild size="sm" onClick={() => trackCyclePrimaryActionStarted({
              loop: snapshot.selectedLoop,
              action_key: snapshot.primaryAction.key,
              expected_evidence: snapshot.primaryAction.expectedEvidence,
            })}>
              <Link to={snapshot.primaryAction.route}>
                Do this now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        />
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Evidence toward the loop outcome</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="mt-2 h-2" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" /> Strongest evidence
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{snapshot.strongestEvidence}</p>
            <p className="mt-3 text-xs text-muted-foreground">{snapshot.evidence.thisWeek} customer evidence events this week</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <p className="text-sm font-semibold">Evidence still missing</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {snapshot.missingEvidence.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Circle className="mt-1 h-3 w-3 shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/bizmap-ai">Open the full execution cycle</Link>
        </Button>
        {firstCustomerSprint.enabled ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">30-day First Customer Sprint</p>
              <p className="text-xs text-muted-foreground">20 prospects, 10 manual messages, one mentor checkpoint, and customer evidence.</p>
            </div>
            <Button asChild size="sm"><Link to="/first-customer-sprint">{firstCustomerSprint.snapshot?.sprint ? 'Continue sprint' : 'Start sprint'}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        ) : null}
        <FounderCycleActionFeedback
          actionKey={snapshot.primaryAction.key}
          className="mt-2 justify-end"
        />
      </CardContent>
    </Card>
  );
}
