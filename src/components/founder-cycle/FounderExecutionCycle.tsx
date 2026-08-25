import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Hammer,
  LineChart,
  MessageSquareText,
  Target,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import CustomerEvidenceWorkspace from '@/components/founder-cycle/CustomerEvidenceWorkspace';
import FounderCycleActionFeedback from '@/components/founder-cycle/FounderCycleActionFeedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFounderCycle } from '@/hooks/useFounderCycle';
import { useFirstCustomerSprint } from '@/hooks/useFirstCustomerSprint';
import {
  FOUNDER_LOOPS,
  FOUNDER_LOOP_DEFINITIONS,
  loopProgress,
  type FounderLoop,
} from '@/lib/founderCycle';
import {
  trackCycleLoopAssigned,
  trackCyclePrimaryActionStarted,
} from '@/lib/analytics';
import { cn } from '@/lib/utils';

const LOOP_ICON = {
  PROVE: Target,
  SELL: MessageSquareText,
  GROW: TrendingUp,
} satisfies Record<FounderLoop, typeof Target>;

export default function FounderExecutionCycle({ embedded = false }: { embedded?: boolean }) {
  const cycle = useFounderCycle();
  const firstCustomerSprint = useFirstCustomerSprint();
  const snapshot = cycle.snapshot;

  if (!cycle.showCycle || !snapshot) return null;

  const progress = loopProgress(snapshot.selectedLoop, snapshot.evidence);

  const selectLoop = (loop: FounderLoop) => {
    if (!snapshot.businessModel) return;
    void cycle.saveCycleState({
      businessModel: snapshot.businessModel,
      customerCount: snapshot.customerCount,
      primaryGoal: snapshot.primaryGoal ?? FOUNDER_LOOP_DEFINITIONS[loop].objective,
      selectedLoop: loop,
      raiseActive: snapshot.raiseActive,
    }).then(() => {
      trackCycleLoopAssigned({
        loop,
        assignment_source: 'override',
        business_model: snapshot.businessModel,
      });
      toast.success(`${loop} is now your working loop. The evidence recommendation remains visible.`);
    }).catch((error) => {
      console.error(error);
      toast.error('The loop override could not be saved.');
    });
  };

  return (
    <div className={cn('space-y-6', !embedded && 'mx-auto max-w-6xl')}>
      <section className="space-y-4 text-center">
        <Badge className="bg-primary/10 text-primary">Founder Execution Cycle beta</Badge>
        <h1 className={cn('font-bold creatives-font takeover-gradient', embedded ? 'text-3xl' : 'text-3xl md:text-5xl')}>
          Prove. Sell. Grow.
        </h1>
        <p className="mx-auto max-w-3xl text-muted-foreground">
          Progress comes from customer conversations, commitments, payments, and retention—not from completing more documents.
        </p>
      </section>

      <Card className="overflow-hidden border-primary/30 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_45%),hsl(var(--card))]">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{snapshot.selectedLoop}</Badge>
                {snapshot.selectedLoop !== snapshot.recommendedLoop ? (
                  <Badge variant="outline">Recommended: {snapshot.recommendedLoop}</Badge>
                ) : null}
                {snapshot.raiseActive ? <Badge variant="secondary">RAISE active in parallel</Badge> : null}
              </div>
              <h2 className="mt-3 text-2xl font-semibold">{snapshot.primaryAction.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{snapshot.primaryAction.description}</p>
              <div className="mt-4 rounded-lg border border-border/60 bg-background/70 p-3 text-sm">
                <p><span className="font-semibold">Why now:</span> {snapshot.primaryAction.reason}</p>
                <p className="mt-1 text-muted-foreground">
                  Expected evidence: {snapshot.primaryAction.expectedEvidence.replaceAll('_', ' ')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-1">
              <Button asChild onClick={() => trackCyclePrimaryActionStarted({
                loop: snapshot.selectedLoop,
                action_key: snapshot.primaryAction.key,
                expected_evidence: snapshot.primaryAction.expectedEvidence,
              })}>
                <Link to={snapshot.primaryAction.route}>
                  Do this now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <FounderCycleActionFeedback actionKey={snapshot.primaryAction.key} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-border/50 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Evidence toward this loop</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="mt-2 h-2" />
              <p className="mt-3 text-sm text-muted-foreground">
                Strongest signal: {snapshot.strongestEvidence}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Still missing</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {snapshot.missingEvidence.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Circle className="mt-1 h-3.5 w-3.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {firstCustomerSprint.enabled ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="outline">Stage V: GTM Strategist</Badge>
              <h2 className="mt-2 text-xl font-semibold">First Customer Proof</h2>
              <p className="mt-1 text-sm text-muted-foreground">Run a focused 10-prospect, 10-message GTM cycle and decide from real buyer evidence.</p>
            </div>
            <Button asChild><Link to="/go-to-market?workspace=first-customer-proof">{firstCustomerSprint.snapshot?.sprint ? 'Continue First Customer Proof' : 'Open First Customer Proof'}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {FOUNDER_LOOPS.map((loop) => {
          const definition = FOUNDER_LOOP_DEFINITIONS[loop];
          const Icon = LOOP_ICON[loop];
          const active = snapshot.selectedLoop === loop;
          const recommended = snapshot.recommendedLoop === loop;
          return (
            <Card key={loop} className={cn('border-border/60', active && 'border-primary/50 bg-primary/5')}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex gap-2">
                    {recommended ? <Badge variant="outline">Recommended</Badge> : null}
                    {active ? <Badge>Working loop</Badge> : null}
                  </div>
                </div>
                <CardTitle>{loop}: {definition.label}</CardTitle>
                <CardDescription>{definition.objective}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Exit evidence:</span> {definition.exit}
                </div>
                <div className="space-y-2">
                  {definition.tools.map((tool) => (
                    <Link key={tool.route} to={tool.route} className="flex min-h-10 items-center justify-between rounded-lg border border-border/60 px-3 text-sm hover:border-primary/40 hover:bg-accent">
                      <span className="flex items-center gap-2">
                        {tool.support ? <Hammer className="h-3.5 w-3.5 text-muted-foreground" /> : <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        {tool.name}
                      </span>
                      {tool.support ? <span className="text-xs text-muted-foreground">support</span> : null}
                    </Link>
                  ))}
                </div>
                {!active ? (
                  <Button variant="outline" className="w-full" onClick={() => selectLoop(loop)}>
                    Work on {loop}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Named prospects', snapshot.evidence.prospects],
          ['Replies', snapshot.evidence.replies],
          ['Conversations', snapshot.evidence.interviews],
          ['Paying customers', snapshot.evidence.payingCustomers],
        ].map(([label, value]) => (
          <Card key={String(label)} className="border-border/60">
            <CardContent className="p-4">
              <LineChart className="h-4 w-4 text-primary" />
              <p className="mt-3 text-2xl font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {snapshot.raiseActive ? (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant="outline">Optional parallel track</Badge>
                <h2 className="mt-2 text-xl font-semibold">RAISE without leaving {snapshot.selectedLoop}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fundraising preparation runs beside customer execution; it does not replace it.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/pitch-deck-analyzer">Pitch Deck</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/vc-search">VC Search</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/accelerator-hunt">Accelerators</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!embedded ? <CustomerEvidenceWorkspace /> : null}
    </div>
  );
}
