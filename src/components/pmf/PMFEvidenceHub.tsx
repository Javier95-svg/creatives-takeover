import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Gauge, MessageSquareText, Search, Sparkles, Target, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PMFValidationEvidence } from '@/hooks/usePMFLab';
import type { PMFSurvey, PMFSurveyAggregate } from '@/hooks/usePMFSurvey';
import { getPmfConfidence, PMF_SIGNAL_THRESHOLDS } from '@/lib/pmfConfidence';

export type PMFHubRecommendation = 'interviews' | 'survey' | 'checklist' | 'discovery' | 'score';

interface PMFEvidenceHubProps {
  evidence: PMFValidationEvidence | null;
  requiredSignals: number;
  survey: PMFSurvey | null;
  surveyAggregate: PMFSurveyAggregate;
  customerDiscoverySignals: number;
  /** The single next action the user should take, spotlighted as "Start here". */
  recommended: PMFHubRecommendation;
  onLogInterviews: () => void;
  onCreateOrReviewSurvey: () => void;
  onFindCustomers: () => void;
  onRunScore: () => void;
  authoritativeSignalCount?: number;
  /** Verified Demo Studio behaviors counted by the scorer (server-side, capped at 10). */
  demoBehaviorSignals?: number;
}

// Mirrors the server weights in supabase/functions/_shared/pmf-evidence.ts. Founders
// could see a signal total but had no way to learn why 25 was out of reach or which
// action would move it, which is the single biggest reason scores never complete.
const SIGNAL_WEIGHTS = {
  interview: 1,
  survey: 0.75,
  demo: 0.75,
  research: 0.25,
} as const;
const DEMO_SIGNAL_CAP = 10;

const RECOMMENDATION_COPY: Record<PMFHubRecommendation, string> = {
  interviews: 'Start by logging the customer interviews behind your score.',
  survey: 'Start by collecting the Sean Ellis 40% signal from real users.',
  checklist: 'Start by saving the validation milestones you have already hit.',
  discovery: 'Start by finding real people and communities to validate with.',
  score: "You have enough evidence — run your PMF score now.",
};

const statusTone = (ready: boolean) =>
  ready
    ? 'border-success/25 bg-success/10 text-success'
    : 'border-border/60 bg-background/70 text-muted-foreground';

const PMFEvidenceHub = ({
  evidence,
  requiredSignals,
  survey,
  surveyAggregate,
  customerDiscoverySignals,
  recommended,
  onLogInterviews,
  onCreateOrReviewSurvey,
  onFindCustomers,
  onRunScore,
  authoritativeSignalCount,
  demoBehaviorSignals = 0,
}: PMFEvidenceHubProps) => {
  const savedInterviews = evidence?.interview_notes_count ?? 0;
  const surveyResponses = surveyAggregate.total || evidence?.survey_results_count || 0;
  const estimatedSignals = Math.floor(savedInterviews + surveyResponses * 0.75);
  const totalSignals = authoritativeSignalCount ?? estimatedSignals;
  const progress = requiredSignals > 0 ? Math.min(100, Math.round((totalSignals / requiredSignals) * 100)) : 0;
  const checklistCount = evidence?.validation_checklist?.length ?? 0;
  const hasSurvey = Boolean(survey);
  const hasDiscovery = customerDiscoverySignals > 0;
  const confidence = getPmfConfidence(totalSignals);

  const cappedDemoBehaviors = Math.min(DEMO_SIGNAL_CAP, Math.max(0, demoBehaviorSignals));
  const ledger: Array<{
    key: string;
    source: string;
    detail: string;
    contribution: number;
    action: { label: string; onClick: () => void } | { label: string; to: string };
  }> = [
    {
      key: 'interviews',
      source: 'Customer interviews',
      detail: `${savedInterviews} logged · full weight (×${SIGNAL_WEIGHTS.interview})`,
      contribution: savedInterviews * SIGNAL_WEIGHTS.interview,
      action: { label: savedInterviews > 0 ? 'Log another' : 'Log the first', onClick: onLogInterviews },
    },
    {
      key: 'survey',
      source: 'Hosted survey responses',
      detail: `${surveyResponses} response${surveyResponses === 1 ? '' : 's'} · ×${SIGNAL_WEIGHTS.survey}`,
      contribution: surveyResponses * SIGNAL_WEIGHTS.survey,
      action: { label: hasSurvey ? 'Share survey' : 'Create survey', onClick: onCreateOrReviewSurvey },
    },
    {
      key: 'demo',
      source: 'Verified demo behavior',
      detail: `${cappedDemoBehaviors} behavior${cappedDemoBehaviors === 1 ? '' : 's'} · ×${SIGNAL_WEIGHTS.demo}, capped at ${DEMO_SIGNAL_CAP}`,
      contribution: cappedDemoBehaviors * SIGNAL_WEIGHTS.demo,
      action: { label: 'Open Demo Studio', to: '/demo-studio' },
    },
  ];

  const nextSignalsNeeded = confidence.signalsToNext;

  const cards: Array<{ key: PMFHubRecommendation; label: string; value: string; description: string; icon: typeof UsersRound; ready: boolean }> = [
    {
      key: 'interviews',
      label: 'Interview evidence',
      value: `${savedInterviews}/${requiredSignals}`,
      description: savedInterviews > 0 ? 'Saved interview signals' : 'Log the conversations behind the score',
      icon: UsersRound,
      ready: savedInterviews > 0,
    },
    {
      key: 'survey',
      label: 'Sean Ellis test',
      value: surveyResponses > 0 ? `${surveyAggregate.veryPct || 0}%` : hasSurvey ? 'Link ready' : 'Not created',
      description: surveyResponses > 0 ? `${surveyResponses} hosted response${surveyResponses === 1 ? '' : 's'}` : 'Collect the canonical 40% PMF metric',
      icon: Gauge,
      ready: surveyResponses > 0,
    },
    {
      key: 'checklist',
      label: 'Checklist',
      value: `${checklistCount}/6`,
      description: checklistCount > 0 ? 'Validation milestones saved' : 'Save proof that the process is real',
      icon: ClipboardCheck,
      ready: checklistCount > 0,
    },
    {
      key: 'discovery',
      label: 'Discovery',
      value: hasDiscovery ? `${customerDiscoverySignals}` : 'Not run',
      description: hasDiscovery ? 'Customer discovery signals saved' : 'Find people and communities to validate with',
      icon: Search,
      ready: hasDiscovery,
    },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
            Evidence hub
          </Badge>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Build proof before the score</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              PMF Lab works best when the AI is interpreting interviews, survey responses, and live customer discovery instead of judging an idea in isolation.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 lg:min-w-64">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Evidence signals</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{totalSignals}/{requiredSignals}</p>
            </div>
            <Target className="h-6 w-6 text-primary" />
          </div>
          <Progress value={progress} className="mt-3 h-2" />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">{confidence.label}.</span> {confidence.description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-border/60 bg-background/70">
        {[
          { value: PMF_SIGNAL_THRESHOLDS.directional, label: 'Directional' },
          { value: PMF_SIGNAL_THRESHOLDS.emerging, label: 'Patterns' },
          { value: PMF_SIGNAL_THRESHOLDS.decisionGrade, label: 'Decision grade' },
        ].map((milestone) => {
          const reached = totalSignals >= milestone.value;
          return (
            <div key={milestone.value} className={cn('px-3 py-3 text-center', reached ? 'bg-success/10 text-success' : 'text-muted-foreground')}>
              <p className="text-lg font-semibold">{milestone.value}</p>
              <p className="text-caption font-medium uppercase tracking-wide">{milestone.label}</p>
            </div>
          );
        })}
      </div>

      {/* Signal ledger — where the count comes from and what moves it next. */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            How your {totalSignals} signal{totalSignals === 1 ? '' : 's'} adds up
          </p>
          {nextSignalsNeeded > 0 && (
            <p className="text-xs text-muted-foreground">
              {nextSignalsNeeded} more to reach {confidence.nextThreshold}
            </p>
          )}
        </div>
        <ul className="mt-3 divide-y divide-border/60">
          {ledger.map((row) => (
            <li key={row.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{row.source}</p>
                <p className="text-xs text-muted-foreground">{row.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  +{Number.isInteger(row.contribution) ? row.contribution : row.contribution.toFixed(2)}
                </span>
                {'to' in row.action ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={row.action.to}>{row.action.label}</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={row.action.onClick}>
                    {row.action.label}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Cited market research adds up to {PMF_SIGNAL_THRESHOLDS.directional} weighted signals at ×{SIGNAL_WEIGHTS.research}, but it does not count toward the {PMF_SIGNAL_THRESHOLDS.decisionGrade} direct signals a decision-grade call requires — only people acting or describing a recent behavior do.
        </p>
      </div>

      {/* Single, unmistakable "do this first" banner so the page has one clear entry point. */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Start here</p>
          <p className="text-sm font-medium text-foreground">{RECOMMENDATION_COPY[recommended]}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, label, value, description, icon: Icon, ready }) => {
          const isRecommended = recommended === key;
          return (
            <div
              key={label}
              className={cn(
                'relative rounded-2xl border p-4',
                statusTone(ready),
                isRecommended && 'ring-2 ring-primary/60 ring-offset-1 ring-offset-background',
              )}
            >
              {isRecommended && (
                <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground">Start here</Badge>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          size="sm"
          variant={recommended === 'score' ? 'default' : 'outline'}
          onClick={onRunScore}
        >
          Run PMF score
          {recommended === 'score' && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
        <Button size="sm" variant={recommended === 'interviews' ? 'default' : 'outline'} onClick={onLogInterviews}>
          <MessageSquareText className="mr-2 h-4 w-4" />
          Log interviews
        </Button>
        <Button size="sm" variant={recommended === 'survey' ? 'default' : 'outline'} onClick={onCreateOrReviewSurvey}>
          <Gauge className="mr-2 h-4 w-4" />
          {hasSurvey ? 'Review survey' : 'Create Sean Ellis survey'}
        </Button>
        <Button size="sm" variant={recommended === 'discovery' ? 'default' : 'ghost'} onClick={onFindCustomers}>
          <Search className="mr-2 h-4 w-4" />
          Find customers to talk to
        </Button>
      </div>
    </section>
  );
};

export default PMFEvidenceHub;
