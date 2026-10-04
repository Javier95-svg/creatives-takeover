import { useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ExternalLink } from 'lucide-react';

import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { NextStepCard } from '@/components/tool-shell/NextStepCard';
import { getGTMNextStep } from '@/lib/gtmNextStep';
import { evaluateGTMOutcome } from '@/lib/gtmOutcome';
import { buildGTMTasks, getGTMPlanWeek, type GTMPlanV2, type GTMPlay, type GTMReviewProposal, type GTMWeeklyReview, type GTMWeeklyReviewInput } from '@/lib/gtmV2';
import { selectExecutableGTMPlays } from '@/lib/marketExperiment';
import { cn } from '@/lib/utils';
import GTMCompetitorsPanel from './GTMCompetitorsPanel';
import GTMDraftsPanel from './GTMDraftsPanel';
import GTMEvidenceManager from './GTMEvidenceManager';
import GTMPipelineBoard from './GTMPipelineBoard';
import GTMPlayCard from './GTMPlayCard';
import GTMReviewPanel from './GTMReviewPanel';
import GTMThisWeek from './GTMThisWeek';

type GTMView = 'week' | 'plan' | 'review';

const VIEWS: Array<[GTMView, string]> = [['week', 'This week'], ['plan', 'Plan'], ['review', 'Review']];

const CHECK_LABELS: Record<string, string> = {
  primaryChannel: 'A main channel',
  fallbackChannel: 'A backup channel',
  evidenceBackedMessaging: 'A message backed by what customers said',
  usableCampaignAssets: 'Outreach drafts',
  sixWeekTargets: 'Weekly targets',
  budgetAndTimeConstraints: 'Your time and budget',
  structuredKillRule: 'A rule for when to stop',
  tractionSprintCreated: 'An experiment running in Traction Engine',
};

const ROLE_TEXT = { primary: 'Main channel', secondary: 'Backup', deferred: 'Later' } as const;

interface GTMWorkspaceProps {
  plan: GTMPlanV2;
  planId: string;
  weeklyReview: GTMWeeklyReview | null;
  reviewProposal: GTMReviewProposal | null;
  isReviewing: boolean;
  onUpdatePlay: (play: GTMPlay) => Promise<void>;
  onUpdatePlan: (plan: GTMPlanV2) => Promise<void>;
  onStartSprint: (play: GTMPlay) => Promise<void>;
  onPreviewReview: (input: GTMWeeklyReviewInput) => Promise<void>;
  onApplyReview: () => Promise<void>;
  onDismissReview: () => void;
}

/** Monday of the current week (UTC), the same key the weekly review is saved under. */
const currentWeekStart = (now = new Date()) => {
  const date = new Date(now);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
};

const nextMonday = (now = new Date()) => {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (((8 - date.getDay()) % 7) || 7));
  return date;
};

export default function GTMWorkspace({
  plan,
  planId,
  weeklyReview,
  reviewProposal,
  isReviewing,
  onUpdatePlay,
  onUpdatePlan,
  onStartSprint,
  onPreviewReview,
  onApplyReview,
  onDismissReview,
}: GTMWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tasksRef = useRef<HTMLDivElement>(null);
  const quickLogRef = useRef<HTMLDivElement>(null);
  const requested = searchParams.get('view');
  const view: GTMView = requested === 'plan' || requested === 'review' ? requested : 'week';
  const setView = (next: GTMView) => setSearchParams((params) => {
    if (next === 'week') params.delete('view');
    else params.set('view', next);
    return params;
  }, { replace: true });

  const executablePlays = selectExecutableGTMPlays(plan);
  const primaryPlay = plan.plays.find((play) => play.status === 'active') ?? executablePlays[0] ?? plan.plays[0];
  const tasks = useMemo(() => buildGTMTasks(plan), [plan]);
  const week = getGTMPlanWeek(plan);
  const outcome = evaluateGTMOutcome(plan);
  const checks = Object.entries(outcome.checks);
  const readyCount = checks.filter(([, done]) => done).length;

  const nextStep = getGTMNextStep({
    channel: primaryPlay?.channelName ?? null,
    hasActivePlay: plan.plays.some((play) => Boolean(play.tractionSprintId)),
    openTaskCount: tasks.filter((task) => task.week === week && task.status !== 'done' && task.status !== 'skipped').length,
    hasResult: plan.plays.some((play) => typeof play.actual === 'number'),
    reviewedThisWeek: weeklyReview?.weekStart === currentWeekStart(),
    hasProposal: Boolean(reviewProposal),
  });

  const runNextStep = () => {
    if (!nextStep) return;
    if (nextStep.action === 'start_play') {
      if (primaryPlay) void onStartSprint(primaryPlay);
      return;
    }
    if (nextStep.action === 'log_result') {
      // The week can be logged right here; Traction Engine stays the full log.
      if (quickLogRef.current || view !== 'week') {
        setView('week');
        requestAnimationFrame(() => quickLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
      navigate(`/traction-engine?planId=${encodeURIComponent(planId)}${primaryPlay ? `&playId=${encodeURIComponent(primaryPlay.id)}` : ''}`);
      return;
    }
    if (nextStep.action === 'do_tasks') {
      setView('week');
      requestAnimationFrame(() => tasksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    setView('review');
  };

  return (
    <div className="space-y-6">
      {/* On the Review tab the review panel carries its own button, so the card would only repeat it. */}
      {nextStep && !(view === 'review' && (nextStep.action === 'compare_review' || nextStep.action === 'review_week')) ? <NextStepCard title={nextStep.title} reason={nextStep.reason} cta={nextStep.cta} onAction={runNextStep} /> : null}

      <div role="tablist" aria-label="GTM Strategist views" className="inline-flex rounded-lg border border-border/60 bg-card p-1">
        {VIEWS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', view === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'week' ? (
        <GTMThisWeek
          ref={tasksRef}
          plan={plan}
          planId={planId}
          week={week}
          tasks={tasks}
          primaryPlay={primaryPlay}
          nextReviewDate={nextMonday()}
          onUpdatePlan={onUpdatePlan}
          onUpdatePlay={onUpdatePlay}
          onOpenReview={() => setView('review')}
          quickLogRef={quickLogRef}
        />
      ) : null}

      {view === 'plan' ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Channels</h2>
              <p className="text-sm text-muted-foreground">Run one channel at a time. The backup is there if the numbers say to stop.</p>
            </div>
            {executablePlays.map((play) => (
              <GTMPlayCard key={play.id} play={play} plan={plan} planId={planId} onSave={onUpdatePlay} onStartSprint={onStartSprint} />
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Six weeks</h2>
            <ol className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
              {plan.sixWeekPlan.map((item) => (
                <li key={item.week} className={cn('p-4', item.week === week && 'bg-primary/5')}>
                  <p className="text-sm text-muted-foreground">Week {item.week}{item.week === week ? ', this week' : ''}</p>
                  <p className="mt-0.5 font-medium text-foreground">{item.objective}</p>
                  {item.actions.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">{item.actions.map((action) => <li key={action}>{action}</li>)}</ul>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">First Customer Proof</h2>
            <p className="mt-1 text-sm text-muted-foreground">Turn the main channel into 10 people contacted by you, with what each buyer said and a decision at the end.</p>
            <Link to="/go-to-market?workspace=first-customer-proof" className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
              Open First Customer Proof
            </Link>
          </section>

          <div className="space-y-3">
            <DashboardDisclosure title="Plan checklist" summary={`${readyCount} of ${checks.length} in place`}>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {checks.map(([key, done]) => (
                  <li key={key} className="flex items-center gap-2">
                    <Check className={cn('h-4 w-4', done ? 'text-primary' : 'text-muted-foreground/40')} aria-hidden="true" />
                    <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{CHECK_LABELS[key] ?? key}</span>
                  </li>
                ))}
              </ul>
            </DashboardDisclosure>

            <DashboardDisclosure title="Why these channels" summary={plan.thesis.rationale}>
              <div className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div><p className="font-medium text-foreground">When people buy</p><p className="mt-1 text-muted-foreground">{plan.thesis.buyingTrigger}</p></div>
                  <div><p className="font-medium text-foreground">What they use today</p><p className="mt-1 text-muted-foreground">{plan.thesis.competitiveAlternative}</p></div>
                  <div><p className="font-medium text-foreground">Why you win</p><p className="mt-1 text-muted-foreground">{plan.thesis.value}</p></div>
                </div>
                <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                  {plan.channels.map((channel) => (
                    <li key={channel.id} className="space-y-1 p-3">
                      <p className="font-medium text-foreground">{channel.name} <span className="font-normal text-muted-foreground">· {ROLE_TEXT[channel.role]} · scored {channel.score} of 100</span></p>
                      <p className="text-muted-foreground">{channel.rationale}</p>
                    </li>
                  ))}
                </ul>
                {(plan.excludedChannels ?? []).length > 0 ? (
                  <div>
                    <p className="font-medium text-foreground">Left out</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {(plan.excludedChannels ?? []).map((channel) => <li key={channel.id}>{channel.name}: {channel.rejectionReason}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </DashboardDisclosure>

            <DashboardDisclosure title="Positioning and message" summary={plan.messaging.headline}>
              <div className="space-y-3 text-sm">
                <p className="text-foreground">{plan.positioning.positioningStatement}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><p className="font-medium text-foreground">Opening line</p><p className="mt-1 text-muted-foreground">{plan.messaging.hookLine}</p></div>
                  <div><p className="font-medium text-foreground">Proof and ask</p><p className="mt-1 text-muted-foreground">{plan.messaging.proofPoint} {plan.messaging.ctaCopy}</p></div>
                </div>
              </div>
            </DashboardDisclosure>

            <DashboardDisclosure title="Competitors" summary="What buyers use today, and how to answer each one">
              <GTMCompetitorsPanel plan={plan} />
            </DashboardDisclosure>

            <DashboardDisclosure title="Outreach drafts" summary="Edit and copy. Nothing is sent from here.">
              <GTMDraftsPanel plan={plan} planId={planId} onUpdatePlan={onUpdatePlan} />
            </DashboardDisclosure>

            <DashboardDisclosure title="Research and evidence" summary={plan.researchStatus === 'complete' ? 'Sources behind this plan' : 'Research was limited, so some points are still guesses'}>
              <div className="space-y-5 text-sm">
                <GTMEvidenceManager plan={plan} onUpdatePlan={onUpdatePlan} />
                {plan.researchSources.length > 0 ? (
                  <ul className="space-y-2">
                    {plan.researchSources.map((source, index) => (
                      <li key={`${source.url}-${index}`}>
                        <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
                          {source.title}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                        {source.snippet ? <p className="mt-0.5 line-clamp-2 text-muted-foreground">{source.snippet}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Live research was not available, so market points are treated as guesses until you check them.</p>
                )}
                {plan.assumptions.length > 0 ? (
                  <div>
                    <p className="font-medium text-foreground">Guesses to check</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">{plan.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                {(plan.claimAttributions ?? []).length > 0 ? (
                  <div>
                    <p className="font-medium text-foreground">Where each point comes from</p>
                    <ul className="mt-1 space-y-2">
                      {plan.claimAttributions?.map((claim) => (
                        <li key={claim.id}>
                          <p className="text-foreground">{claim.claim}</p>
                          <p className="text-xs text-muted-foreground">
                            {claim.assumption ? 'A guess, not yet checked' : claim.sourceIds.length > 0 ? `Sources: ${claim.sourceIds.join(', ')}` : 'No source attached'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </DashboardDisclosure>
          </div>
        </div>
      ) : null}

      {view === 'review' ? (
        <div className="space-y-6">
          <GTMReviewPanel
            plan={plan}
            weeklyReview={weeklyReview}
            reviewProposal={reviewProposal}
            isReviewing={isReviewing}
            onPreview={onPreviewReview}
            onApply={onApplyReview}
            onDismiss={onDismissReview}
          />
          <DashboardDisclosure title="Pipeline and funnel" summary={plan.metrics.primaryOutcome}>
            <div className="space-y-5 text-sm">
              <ol className="space-y-2">
                {plan.funnel.map((stage, index) => (
                  <li key={stage.stage}>
                    <p className="font-medium text-foreground">{index + 1}. {stage.stage}</p>
                    <p className="text-muted-foreground">Done when: {stage.exitCriteria}. Measure: {stage.metric}.</p>
                  </li>
                ))}
              </ol>
              <div>
                <p className="font-medium text-foreground">{plan.growthLoop.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {plan.growthLoop.input} → {plan.growthLoop.action} → {plan.growthLoop.output}. {plan.growthLoop.reinvestment}
                </p>
              </div>
              <GTMPipelineBoard plan={plan} onUpdatePlan={onUpdatePlan} />
            </div>
          </DashboardDisclosure>
        </div>
      ) : null}
    </div>
  );
}
