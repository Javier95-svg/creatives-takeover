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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPanelHeader } from '@/components/dashboard/DashboardPanel';
import { RecommendationFeedback } from '@/components/dashboard/RecommendationFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardFocus } from '@/contexts/DashboardDataContext';
import { useFounderJourneySnapshot } from '@/hooks/useFounderJourneySnapshot';
import { getDashboardTool } from '@/config/dashboardToolRegistry';
import {
  trackDashboardJourneyContinueClicked,
  trackDashboardJourneyPanelViewed,
  trackDashboardJourneyStageClicked,
  trackDashboardJourneyToolOpened,
} from '@/lib/analytics';
import type { JourneyStageNode, JourneyToolTile } from '@/lib/founderJourney';
import { recordRecommendationOutcome } from '@/lib/recommendationLearning';
import { trackRetentionEvent } from '@/lib/retentionSystem';
import { getStageExplanation } from '@/lib/stageIntelligence';
import {
  STAGES,
  type FounderOperatingStageId,
} from '@/lib/stageDiagnostic';
import type {
  OnboardingCustomerCountBand,
  OnboardingEvidenceState,
} from '@/lib/onboardingContext';
import { cn } from '@/lib/utils';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';
import { isPMFPathwayEnvironmentEnabled, PMF_PATHWAY_FEATURE_FLAG } from '@/lib/pmfPathwayRollout';

const TILE_ICONS: Record<string, LucideIcon> = {
  'icp-builder': Target,
  'demo-studio': Layers,
  'pmf-lab': FlaskConical,
  'mvp-builder': Rocket,
  'gtm-strategist': Globe,
  'traction-engine': TrendingUp,
  'pitch-deck-analyzer': Presentation,
  'tech-stack': Layers,
  directories: Globe,
};

const EVIDENCE_ANSWER_LABELS: Record<OnboardingEvidenceState, string> = {
  none: 'No external evidence yet',
  prospects: 'I have named prospects to contact',
  replies: 'Target customers have replied',
  conversations: 'I completed qualified customer conversations',
  commitment: 'A customer made a costly commitment or signed a pilot',
  payment: 'A customer paid',
  repeatable_growth: 'I have repeatable acquisition or retention',
};

const CUSTOMER_COUNT_LABELS: Record<OnboardingCustomerCountBand, string> = {
  '0': 'No paying customers yet',
  '1': '1 paying customer',
  '2': '2 paying customers',
  '3': '3 paying customers',
  '4_plus': 'More than 3 paying customers',
};

function StageNode({ node }: { node: JourneyStageNode }) {
  return (
    <Link
      to={node.route}
      onClick={() => trackDashboardJourneyStageClicked({ stage: node.stage, status: node.status })}
      className="group flex min-w-[64px] snap-start flex-col items-center gap-1.5 sm:min-w-0 sm:flex-1"
      title={`${node.title} stage${node.optional ? ' (optional)' : ''}`}
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
      {node.optional ? (
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Optional</span>
      ) : <span className="text-[9px] font-semibold uppercase tracking-wide text-primary/75">{node.executionLoop}</span>}
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
        tile.status === 'not_started' && !tile.isCurrentStage && 'opacity-75',
        tile.isCurrentStage && 'border-primary/40 ring-1 ring-primary/25',
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
          {tile.outcomeStatus ? (
            <Badge variant="secondary" className="shrink-0 text-[10px] capitalize" title="Artifact evidence status, not a guarantee of business success">
              {tile.outcomeStatus}
            </Badge>
          ) : null}
          {tile.ctClaim ? (
            <Badge variant="outline" className={cn('shrink-0 text-[10px]', tile.ctClaim.evidenceLevel === 'ct_verified' && 'border-success/40 bg-success/10 text-success')}>
              {tile.ctClaim.evidenceLevel === 'ct_verified' ? 'CT Verified' : tile.ctClaim.evidenceLevel.replaceAll('_', ' ')}
            </Badge>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tile.outputLine}</span>
        {tile.ctClaim ? <span className="mt-1 block text-[10px] text-muted-foreground"><span className="capitalize">{tile.ctClaim.result}</span> · {tile.ctClaim.missingEvidence[0] ?? tile.ctClaim.nextAction ?? 'Evidence requirements satisfied'}</span> : null}
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

export default function FounderJourneyPanel({ showRecommendedAction = false }: { showRecommendedAction?: boolean }) {
  const { user } = useAuth();
  const {
    snapshot,
    isLoading,
    onboarding,
    stageIntelligence,
  } = useFounderJourneySnapshot();
  const { primaryAction, recommendationPolicy } = useDashboardFocus();
  const pathwayFlag = useFeatureFlagEnabled(PMF_PATHWAY_FEATURE_FLAG);
  const enhancedPathway = isPMFPathwayEnvironmentEnabled() && pathwayFlag === true;
  const viewedRef = useRef(false);
  const recommendedRoute = primaryAction ? getDashboardTool(primaryAction.toolKey).route : null;
  const proofClaims = snapshot.tools
    .map((tile) => tile.ctClaim)
    .filter((claim, index, claims) => Boolean(claim) && claims.findIndex((candidate) => candidate?.id === claim?.id) === index);
  const assignedStage = Math.min(
    6,
    Math.max(
      1,
      Number(
        stageIntelligence?.current_stage
        ?? onboarding?.context.operatingStage
        ?? onboarding?.context.assignedStage
        ?? 1,
      ),
    ),
  ) as FounderOperatingStageId;
  const onboardingEvidence = onboarding?.answers.evidenceState || 'none';
  const evidenceAnswer = EVIDENCE_ANSWER_LABELS[onboardingEvidence];
  const customerCount = onboarding?.answers.customerCountBand
    ? CUSTOMER_COUNT_LABELS[onboarding.answers.customerCountBand]
    : null;
  const stageExplanations = getStageExplanation(
    stageIntelligence ?? {
      current_stage: assignedStage,
      rationale_codes: onboarding?.context.stageRationaleCodes ?? [],
      stage_stale: false,
    },
  ).slice(0, 2);

  const handleRecommendedOpen = () => {
    if (!primaryAction) return;
    void recordRecommendationOutcome({
      recommendationKey: primaryAction.key,
      surface: 'command_center',
      outcomeType: 'opened',
    }).catch(() => {
      // The journey CTA remains usable while the additive learning pipeline rolls out.
    });
    if (user?.id) {
      void trackRetentionEvent('dashboard_recommendation_opened', {
        user_id: user.id,
        recommendation_key: primaryAction.key,
        recommendation_family: primaryAction.toolKey,
        policy_version: recommendationPolicy?.policyVersion ?? 'deterministic_v1',
        assignment: recommendationPolicy?.assignment ?? 'baseline',
        source: 'founder_journey',
      });
    }
    trackDashboardJourneyContinueClicked({ milestone_key: primaryAction.key });
  };

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
            {showRecommendedAction && primaryAction && recommendedRoute ? (
              <Button asChild size="sm">
                <Link to={recommendedRoute} onClick={handleRecommendedOpen}>
                  {primaryAction.title}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : snapshot.nextAction ? (
              <Button asChild size="sm">
                <Link
                  to={snapshot.nextAction.route}
                  onClick={() => trackDashboardJourneyContinueClicked({ milestone_key: snapshot.nextAction?.key })}
                >
                  {snapshot.nextAction.label}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/bizmap-ai">
                  Open your startup journey
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  Review assigned stage
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Operating stage {assignedStage}</Badge>
                  </div>
                  <DialogTitle>{STAGES[assignedStage].name}</DialogTitle>
                  <DialogDescription>
                    This is your current operating maturity. Your goal and fundraising intent are evaluated separately.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {onboarding?.isLegacy ? 'Evidence currently on file' : 'Your onboarding answer'}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      “{evidenceAnswer}”
                    </p>
                    {customerCount ? (
                      <p className="mt-1 text-xs text-muted-foreground">{customerCount}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Why we assigned this stage
                    </p>
                    <div className="mt-2 grid gap-2">
                      {stageExplanations.map((explanation) => (
                        <p key={explanation} className="flex items-start gap-2 text-sm leading-5 text-foreground/90">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          {explanation}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button">Got it</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {showRecommendedAction && primaryAction ? (
            <RecommendationFeedback
              surface="command_center"
              recommendationKey={primaryAction.key}
              metadata={{
                recommendation_family: primaryAction.toolKey,
                policy_version: recommendationPolicy?.policyVersion ?? 'deterministic_v1',
                assignment: recommendationPolicy?.assignment ?? 'baseline',
              }}
              recordExposure={false}
            />
          ) : null}
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
          badges={<Badge variant="secondary">{snapshot.stagesCompleted}/6 core stages</Badge>}
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

        {showRecommendedAction && primaryAction && recommendedRoute ? (
          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Recommended next
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{primaryAction.title}</p>
                {primaryAction.description ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{primaryAction.description}</p>
                ) : null}
                <RecommendationFeedback
                  surface="command_center"
                  recommendationKey={primaryAction.key}
                  metadata={{
                    recommendation_family: primaryAction.toolKey,
                    policy_version: recommendationPolicy?.policyVersion ?? 'deterministic_v1',
                    assignment: recommendationPolicy?.assignment ?? 'baseline',
                  }}
                  recordExposure={false}
                />
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to={recommendedRoute} onClick={handleRecommendedOpen}>
                  Continue
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : snapshot.nextAction ? (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Recommended next</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{snapshot.nextAction.label}</p>
              {enhancedPathway ? <p className="mt-1 text-xs text-muted-foreground">{snapshot.nextAction.reason}</p> : null}
              {enhancedPathway ? <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Expected evidence:</span> {snapshot.nextAction.expectedEvidence}</p> : null}
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link
                to={snapshot.nextAction.route}
                onClick={() => trackDashboardJourneyContinueClicked({ milestone_key: snapshot.nextAction?.key })}
              >
                {enhancedPathway ? 'Continue exact artifact' : `Continue: ${snapshot.nextAction.label}`}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.tools.filter((tile) => enhancedPathway ? tile.role === 'core' : tile.role !== 'support').map((tile) => (
            <ToolTile key={tile.key} tile={tile} />
          ))}
        </div>

        {proofClaims.length > 0 ? <div className="mt-5 rounded-xl border border-success/25 bg-success/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">Portable proof history</p><p className="mt-1 text-sm font-semibold">CT verifies the evidence and observed result—not startup success.</p></div><Badge variant="outline">{proofClaims.filter((claim) => claim?.evidenceLevel === 'ct_verified').length} CT Verified</Badge></div>
          <div className="mt-3 space-y-2">{proofClaims.slice(0, 3).map((claim) => claim ? <div key={claim.id} className="rounded-lg border bg-background/70 p-3 text-xs"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-medium text-foreground">{claim.claim}</p><Badge variant="outline" className="capitalize">{claim.result}</Badge></div><p className="mt-1 text-muted-foreground">{claim.nextAction}</p>{claim.unlockedBenefit === 'mentor_checkpoint' ? <p className="mt-1 font-medium text-success">Mentor checkpoint unlocked</p> : null}</div> : null)}</div>
        </div> : null}

        {enhancedPathway ? <div className="mt-5 border-t border-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Optional support and fundraising</p>
          <p className="mt-1 text-xs text-muted-foreground">These tools can accelerate a core outcome but never block or inflate journey completion.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.tools.filter((tile) => tile.role !== 'core').map((tile) => (
              <ToolTile key={tile.key} tile={tile} />
            ))}
          </div>
        </div> : null}

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
