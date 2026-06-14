import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CircleDot,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlan, PLAN_LABELS, type Plan } from '@/config/planPermissions';
import { PLAN_JOURNEY_PROMISES } from '@/lib/journeyUpgradeCatalog';
import { trackMilestoneUpgradeHintShown } from '@/lib/analytics';

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'current_focus' | 'positioning_line' | 'startup_description' | 'startup_name' | 'startup_stage' | 'updated_at'
>;
type IcpRow = Database['public']['Tables']['icp_analysis_results']['Row'];
type WaitlistRow = Pick<
  Database['public']['Tables']['waitlist_pages']['Row'],
  'created_at' | 'mark_ready_at' | 'product_name' | 'published_at' | 'published_url' | 'status' | 'target_audience' | 'title' | 'value_proposition'
>;
type PmfRow = Database['public']['Tables']['pmf_validation_evidence']['Row'];
type MvpRow = Database['public']['Tables']['mvp_builder_artifacts']['Row'];
type TechStackRow = Database['public']['Tables']['tech_stack_reports']['Row'];
type GtmRow = Database['public']['Tables']['gtm_plans']['Row'];

type JourneyStageKey =
  | 'foundation'
  | 'identity'
  | 'prototype'
  | 'validation'
  | 'build'
  | 'stack'
  | 'launch';

interface StageDeliverable {
  title: string;
  summary: string;
  bullets: string[];
  completedAt: string | null;
  route: string;
  routeLabel: string;
  externalUrl?: string | null;
}

interface JourneyStageDefinition {
  key: JourneyStageKey;
  title: string;
  outcome: string;
}

interface JourneyStageView extends JourneyStageDefinition {
  completed: boolean;
  current: boolean;
  deliverable: StageDeliverable | null;
  requiredPlan: Plan;
}

const JOURNEY_STAGES: JourneyStageDefinition[] = [
  { key: 'foundation', title: 'Foundation', outcome: 'Idea and focus captured' },
  { key: 'identity', title: 'Identity', outcome: 'ICP and positioning defined' },
  { key: 'prototype', title: 'Prototype', outcome: 'Offer page prepared' },
  { key: 'validation', title: 'Validation', outcome: 'Demand evidence collected' },
  { key: 'build', title: 'Build Plan', outcome: 'MVP scope locked' },
  { key: 'stack', title: 'Tech Stack', outcome: 'Build stack selected' },
  { key: 'launch', title: 'Launch', outcome: 'Go-to-market plan saved' },
];

const STAGE_REQUIRED_PLAN: Record<JourneyStageKey, Plan> = {
  foundation: 'rookie',
  identity: 'rookie',
  prototype: 'rookie',
  validation: 'starter',
  build: 'rising',
  stack: 'rising',
  launch: 'rising',
};

const STAGE_TOOL_LABEL: Record<JourneyStageKey, string> = {
  foundation: 'Startup Profile',
  identity: 'ICP Builder',
  prototype: 'Demo Studio',
  validation: 'PMF Lab',
  build: 'MVP Builder',
  stack: 'Tech Stack Builder',
  launch: 'GTM Strategist',
};

const PLAN_RANK: Record<Plan, number> = {
  rookie: 0,
  starter: 1,
  rising: 2,
  pro: 3,
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function truncate(value: string | null | undefined, max = 180) {
  if (!value) return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trimEnd()}...`;
}

function extractStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (value && typeof value === 'object') {
    return Object.values(value)
      .flatMap((item) => extractStringList(item))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function buildFoundationDeliverable(profile: ProfileRow | null): StageDeliverable | null {
  if (!profile) return null;

  const summary =
    truncate(profile.startup_description, 220) ||
    truncate(profile.current_focus, 220) ||
    truncate(profile.positioning_line, 220);

  if (!summary) return null;

  const bullets = [
    profile.startup_name ? `Startup: ${profile.startup_name}` : null,
    profile.startup_stage ? `Profile stage: ${profile.startup_stage}` : null,
    profile.positioning_line ? `Positioning: ${truncate(profile.positioning_line, 100)}` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    title: profile.startup_name ? `${profile.startup_name} foundation` : 'Founder foundation',
    summary,
    bullets,
    completedAt: profile.updated_at,
    route: '/account',
    routeLabel: 'Open account',
  };
}

function buildIdentityDeliverable(icp: IcpRow | null): StageDeliverable | null {
  if (!icp) return null;

  const analysisData = (icp.analysis_data ?? {}) as Record<string, unknown>;
  const bullets = [
    icp.target_audience ? `Audience: ${truncate(icp.target_audience, 90)}` : null,
    icp.industry ? `Industry: ${icp.industry}` : null,
    icp.verdict ? `Verdict: ${icp.verdict}` : null,
    ...extractStringList(analysisData?.pain_points).slice(0, 2).map((item) => `Pain point: ${truncate(item, 80)}`),
  ].filter((item): item is string => Boolean(item));

  return {
    title: 'Ideal customer profile',
    summary: truncate(icp.business_description, 220) || 'ICP saved.',
    bullets,
    completedAt: icp.created_at,
    route: '/icp-builder',
    routeLabel: 'Open ICP Builder',
  };
}

function buildPrototypeDeliverable(waitlist: WaitlistRow | null): StageDeliverable | null {
  if (!waitlist) return null;

  const bullets = [
    waitlist.product_name ? `Product: ${waitlist.product_name}` : null,
    waitlist.target_audience ? `Audience: ${truncate(waitlist.target_audience, 90)}` : null,
    waitlist.status ? `Status: ${waitlist.status}` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    title: waitlist.title || waitlist.product_name || 'Waitlist deliverable',
    summary: truncate(waitlist.value_proposition, 220) || 'Waitlist page prepared.',
    bullets,
    completedAt: waitlist.published_at ?? waitlist.mark_ready_at ?? waitlist.created_at,
    route: '/demo-studio',
    routeLabel: 'Open Demo Studio',
    externalUrl: waitlist.published_url,
  };
}

function buildValidationDeliverable(pmf: PmfRow | null): StageDeliverable | null {
  if (!pmf) return null;

  const totalSignals = Number(pmf.interview_notes_count ?? 0) + Number(pmf.survey_results_count ?? 0);
  const bullets = [
    `Interview notes: ${pmf.interview_notes_count ?? 0}`,
    `Survey results: ${pmf.survey_results_count ?? 0}`,
    `Required signals: ${pmf.required_signals ?? 0}`,
  ];

  return {
    title: 'Validation evidence',
    summary: `Captured ${totalSignals} validation signals and saved the PMF checklist.`,
    bullets,
    completedAt: pmf.checklist_saved_at,
    route: '/pmf-lab',
    routeLabel: 'Open PMF Lab',
  };
}

function buildMvpDeliverable(mvp: MvpRow | null): StageDeliverable | null {
  if (!mvp) return null;

  const spec = (mvp.spec_json ?? {}) as Record<string, unknown>;
  const bullets = extractStringList(spec.mustHaveFeatures).slice(0, 3).map((item) => `Feature: ${truncate(item, 80)}`);

  return {
    title: mvp.scope_title || 'MVP scope',
    summary: truncate(mvp.scope_summary, 220) || 'MVP scope saved.',
    bullets,
    completedAt: mvp.saved_at ?? mvp.created_at,
    route: '/mvp-builder',
    routeLabel: 'Open MVP Builder',
  };
}

function buildStackDeliverable(stack: TechStackRow | null): StageDeliverable | null {
  if (!stack) return null;

  const selectedProducts = extractStringList(stack.selected_products).slice(0, 3);
  const bullets = [
    stack.name ? `Plan: ${stack.name}` : null,
    formatCurrency(stack.budget_total) ? `Budget: ${formatCurrency(stack.budget_total)}` : null,
    ...selectedProducts.map((item) => `Product: ${truncate(item, 80)}`),
  ].filter((item): item is string => Boolean(item));

  return {
    title: stack.name || 'Tech stack report',
    summary: `Saved a build stack with an estimated budget of ${formatCurrency(stack.budget_total) || 'a defined budget'}.`,
    bullets,
    completedAt: stack.created_at,
    route: '/tech-stack',
    routeLabel: 'Open Tech Stack',
  };
}

function buildLaunchDeliverable(gtm: GtmRow | null): StageDeliverable | null {
  if (!gtm) return null;

  const content = (gtm.plan_content ?? {}) as Record<string, unknown>;
  const bullets = [
    `Status: ${gtm.status}`,
    ...extractStringList(content.channels).slice(0, 2).map((item) => `Channel: ${truncate(item, 80)}`),
    ...extractStringList(content.kpis).slice(0, 1).map((item) => `KPI: ${truncate(item, 80)}`),
  ];

  return {
    title: gtm.plan_title || 'Launch plan',
    summary: 'Saved a go-to-market plan with launch actions and distribution priorities.',
    bullets,
    completedAt: gtm.exported_at ?? gtm.saved_at ?? gtm.created_at,
    route: '/go-to-market',
    routeLabel: 'Open GTM Strategist',
  };
}

function StepNode({
  stage,
  index,
  currentPlan,
  onSelect,
}: {
  stage: JourneyStageView;
  index: number;
  currentPlan: Plan;
  onSelect: (stage: JourneyStageView) => void;
}) {
  const isClickable = stage.completed && !!stage.deliverable;
  const requiresUpgrade = PLAN_RANK[currentPlan] < PLAN_RANK[stage.requiredPlan];

  return (
    <button
      type="button"
      onClick={() => isClickable && onSelect(stage)}
      disabled={!isClickable}
      className="group flex flex-col items-center text-center disabled:cursor-default"
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
          stage.completed
            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
            : stage.current
            ? 'border-primary bg-background text-primary'
            : 'border-border bg-muted/50 text-muted-foreground'
        }`}
      >
        {stage.completed ? <Check className="h-5 w-5" /> : stage.current ? <CircleDot className="h-5 w-5" /> : index + 1}
        {stage.current && (
          <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
        )}
      </div>
      <span
        className={`mt-3 text-sm font-semibold ${
          stage.completed ? 'text-foreground' : stage.current ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {stage.title}
      </span>
      <span className="mt-1 max-w-[120px] text-xs leading-4 text-muted-foreground">
        {stage.outcome}
      </span>
      {requiresUpgrade ? (
        <span className="mt-2 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-caption font-medium text-primary">
          {PLAN_LABELS[stage.requiredPlan]}
        </span>
      ) : null}
    </button>
  );
}

export function BizMapJourneyProgress() {
  const { user } = useAuth();
  const { progress, loading: progressLoading } = useBizMapProgress();
  const { subscriptionData } = useSubscription();
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const hintedStageRef = useRef<string | null>(null);
  const [artifacts, setArtifacts] = useState<{
    profile: ProfileRow | null;
    icp: IcpRow | null;
    waitlist: WaitlistRow | null;
    pmf: PmfRow | null;
    mvp: MvpRow | null;
    stack: TechStackRow | null;
    launch: GtmRow | null;
  }>({
    profile: null,
    icp: null,
    waitlist: null,
    pmf: null,
    mvp: null,
    stack: null,
    launch: null,
  });
  const [artifactsLoading, setArtifactsLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<JourneyStageView | null>(null);

  useEffect(() => {
    if (!user) {
      setArtifactsLoading(false);
      return;
    }

    let cancelled = false;

    const loadArtifacts = async () => {
      setArtifactsLoading(true);

      try {
        const [
          profileRes,
          icpRes,
          waitlistRes,
          pmfRes,
          mvpRes,
          stackRes,
          launchRes,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('current_focus, positioning_line, startup_description, startup_name, startup_stage, updated_at')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('icp_analysis_results')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('waitlist_pages')
            .select('created_at, mark_ready_at, product_name, published_at, published_url, status, target_audience, title, value_proposition')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('pmf_validation_evidence')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('mvp_builder_artifacts')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('tech_stack_reports')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('gtm_plans')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        setArtifacts({
          profile: (profileRes.data as ProfileRow | null) ?? null,
          icp: (icpRes.data as IcpRow | null) ?? null,
          waitlist: (waitlistRes.data as WaitlistRow | null) ?? null,
          pmf: (pmfRes.data as PmfRow | null) ?? null,
          mvp: (mvpRes.data as MvpRow | null) ?? null,
          stack: (stackRes.data as TechStackRow | null) ?? null,
          launch: (launchRes.data as GtmRow | null) ?? null,
        });
      } catch (error) {
        console.error('Failed to load journey artifacts:', error);
      } finally {
        if (!cancelled) {
          setArtifactsLoading(false);
        }
      }
    };

    void loadArtifacts();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const stages = useMemo<JourneyStageView[]>(() => {
    const foundationDeliverable = buildFoundationDeliverable(artifacts.profile);
    const identityDeliverable = buildIdentityDeliverable(artifacts.icp);
    const prototypeDeliverable = buildPrototypeDeliverable(artifacts.waitlist);
    const validationDeliverable = buildValidationDeliverable(artifacts.pmf);
    const mvpDeliverable = buildMvpDeliverable(artifacts.mvp);
    const stackDeliverable = buildStackDeliverable(artifacts.stack);
    const launchDeliverable = buildLaunchDeliverable(artifacts.launch);

    const completionMap: Record<JourneyStageKey, boolean> = {
      foundation: Boolean(foundationDeliverable),
      identity: Boolean(progress?.identity_completed_at || identityDeliverable),
      prototype: Boolean(progress?.prototype_completed_at || prototypeDeliverable?.completedAt),
      validation: Boolean(progress?.validating_completed_at || validationDeliverable?.completedAt),
      build: Boolean(mvpDeliverable?.completedAt),
      stack: Boolean(stackDeliverable?.completedAt),
      launch: Boolean(progress?.launch_completed_at || launchDeliverable?.completedAt),
    };

    const deliverableMap: Record<JourneyStageKey, StageDeliverable | null> = {
      foundation: foundationDeliverable,
      identity: identityDeliverable,
      prototype: prototypeDeliverable,
      validation: validationDeliverable,
      build: mvpDeliverable,
      stack: stackDeliverable,
      launch: launchDeliverable,
    };

    const currentIndex = JOURNEY_STAGES.findIndex((stage) => !completionMap[stage.key]);

    return JOURNEY_STAGES.map((stage, index) => ({
      ...stage,
      requiredPlan: STAGE_REQUIRED_PLAN[stage.key],
      completed: completionMap[stage.key],
      current: currentIndex === index,
      deliverable: deliverableMap[stage.key],
    }));
  }, [artifacts, progress]);

  const completedCount = stages.filter((stage) => stage.completed).length;
  const fillPercent = stages.length > 1 ? (completedCount / (stages.length - 1)) * 100 : 0;
  const currentStage = stages.find((stage) => stage.current) ?? null;
  const loading = progressLoading || artifactsLoading;
  const currentStageRequiresUpgrade =
    currentStage ? PLAN_RANK[currentPlan] < PLAN_RANK[currentStage.requiredPlan] : false;

  useEffect(() => {
    if (!currentStage || !currentStageRequiresUpgrade) return;
    const hintKey = `${currentPlan}:${currentStage.key}:${currentStage.requiredPlan}`;
    if (hintedStageRef.current === hintKey) return;
    hintedStageRef.current = hintKey;
    const targetPlan = (currentStage.requiredPlan === 'rookie' ? 'starter' : currentStage.requiredPlan) as Exclude<Plan, 'rookie'>;
    trackMilestoneUpgradeHintShown({
      stage: currentStage.key,
      tool_name: STAGE_TOOL_LABEL[currentStage.key],
      current_plan: currentPlan,
      target_plan: targetPlan,
      route: currentStage.deliverable?.route,
    });
  }, [currentPlan, currentStage, currentStageRequiresUpgrade, hintedStageRef]);

  return (
    <>
      <Card className="border-primary/20 bg-card/90" id="journey-progress">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Compass className="h-5 w-5 text-primary" />
                Founder Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Seven visible milestones across the founder journey, mapped from your current BizMap progress and saved outputs.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{stages.length} completed
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
              <div className="grid min-w-[820px] grid-cols-7 gap-4 overflow-hidden">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="space-y-2 text-center">
                    <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted" />
                    <div className="mx-auto h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="mx-auto h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto pb-2">
                <div className="relative min-w-[820px] px-2 pt-2">
                  <div className="absolute left-[44px] right-[44px] top-8 h-1 rounded-full bg-border/60" />
                  <motion.div
                    className="absolute left-[44px] top-8 h-1 rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `calc((100% - 88px) * ${Math.max(0, Math.min(fillPercent, 100)) / 100})` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />

                  <div className="relative grid grid-cols-7 gap-4">
                    {stages.map((stage, index) => (
                      <StepNode key={stage.key} stage={stage} index={index} currentPlan={currentPlan} onSelect={setSelectedStage} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current focus</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {currentStage
                      ? currentStageRequiresUpgrade
                        ? `You have reached ${currentStage.title}. ${PLAN_LABELS[currentStage.requiredPlan]} unlocks ${STAGE_TOOL_LABEL[currentStage.key]} for this next layer.`
                        : `${currentStage.title}: ${currentStage.outcome}`
                      : 'All visible stages completed. Review your saved outputs and tighten the weakest one.'}
                  </p>
                  {currentStageRequiresUpgrade ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PLAN_LABELS[currentStage.requiredPlan]} is the {PLAN_JOURNEY_PROMISES[currentStage.requiredPlan].toLowerCase()} layer.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {currentStage?.deliverable?.route ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={currentStage.deliverable.route}>
                        Continue
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                  <span className="text-xs text-muted-foreground">Click any completed node to inspect its deliverable.</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedStage} onOpenChange={(open) => !open && setSelectedStage(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="pr-8">
            <Badge variant="secondary" className="w-fit text-xs">
              {selectedStage?.title}
            </Badge>
            <SheetTitle>{selectedStage?.deliverable?.title ?? 'Stage deliverable'}</SheetTitle>
            <SheetDescription>
              {selectedStage?.outcome}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {selectedStage?.deliverable?.completedAt ? (
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Completed {formatDate(selectedStage.deliverable.completedAt)}
              </p>
            ) : null}

            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-sm leading-6 text-foreground">
                {selectedStage?.deliverable?.summary ?? 'No saved deliverable summary available yet.'}
              </p>
            </div>

            {selectedStage?.deliverable?.bullets?.length ? (
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">What was produced</p>
                <div className="space-y-2">
                  {selectedStage.deliverable.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {selectedStage?.deliverable?.route ? (
                <Button asChild>
                  <Link to={selectedStage.deliverable.route}>
                    {selectedStage.deliverable.routeLabel}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              {selectedStage?.deliverable?.externalUrl ? (
                <Button asChild variant="outline">
                  <a href={selectedStage.deliverable.externalUrl} target="_blank" rel="noreferrer">
                    View live output
                    <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
