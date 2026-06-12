/**
 * Journey Stage Grid - shown on the dashboard.
 *
 * Displays the core BizMap tools and reflects plan-based preview vs full access.
 */

import { useEffect, useRef, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Eye, FlaskConical, FolderOpen, Hammer, Radio, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import type { Phase } from '@/store/leanStartupStore';
import { PLAN_LABELS, type FeatureKey } from '@/config/planPermissions';
import { getJourneyTool } from '@/lib/journeyUpgradeCatalog';
import { trackSoftPreviewClicked, trackSoftPreviewShown } from '@/lib/analytics';

interface Stage {
  id: number;
  name: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  planFeature: FeatureKey;
  badge?: string;
  phase: Phase;
}

const STAGES: Stage[] = [
  {
    id: 1,
    name: 'ICP Builder',
    description: 'Define your ideal customer profile.',
    href: '/icp-builder',
    icon: Users,
    planFeature: 'icp_builder',
    badge: 'Free',
    phase: 'learn',
  },
  {
    id: 2,
    name: 'Demo Studio',
    description: 'Build demand before you launch.',
    href: '/demo-studio',
    icon: Radio,
    planFeature: 'waitlist_maker',
    badge: 'Credits',
    phase: 'learn',
  },
  {
    id: 3,
    name: 'PMF Lab',
    description: 'Validate product-market fit.',
    href: '/pmf-lab',
    icon: FlaskConical,
    planFeature: 'pmf_lab',
    badge: 'Credits',
    phase: 'learn',
  },
  {
    id: 4,
    name: 'MVP Builder',
    description: 'Ship your MVP in 14 days.',
    href: '/mvp-builder',
    icon: Hammer,
    planFeature: 'mvp_builder',
    badge: 'Credits',
    phase: 'build',
  },
  {
    id: 5,
    name: 'Tech Stack',
    description: 'Choose the right stack for your startup.',
    href: '/tech-stack',
    icon: Boxes,
    planFeature: 'tech_stack',
    badge: 'Credits',
    phase: 'build',
  },
  {
    id: 6,
    name: 'GTM Strategist',
    description: 'Go to market with confidence.',
    href: '/go-to-market',
    icon: TrendingUp,
    planFeature: 'gtm_strategist',
    badge: 'Credits',
    phase: 'measure',
  },
  {
    id: 7,
    name: 'Directories',
    description: 'Get listed where founders get found.',
    href: '/directories',
    icon: FolderOpen,
    planFeature: 'directories',
    badge: 'Credits',
    phase: 'measure',
  },
];

function StageCard({ stage }: { stage: Stage }) {
  const { state, upgradeTarget, plan } = usePlanAccess(stage.planFeature);
  const Icon = stage.icon;
  const trackedPreviewRef = useRef(false);
  const journeyTool = getJourneyTool(stage.planFeature);

  const isPreview = state === 'preview_only';
  const isLocked = state === 'locked' || state === 'hidden';
  const isSoftPreview = isPreview || isLocked;
  const targetPlan = upgradeTarget && upgradeTarget !== 'rookie' ? upgradeTarget : undefined;
  const requiredPlanLabel = targetPlan ? PLAN_LABELS[targetPlan] : 'a higher plan';

  useEffect(() => {
    if (!isSoftPreview || trackedPreviewRef.current) return;
    trackedPreviewRef.current = true;
    trackSoftPreviewShown({
      feature_key: stage.planFeature,
      tool_name: stage.name,
      current_plan: plan,
      target_plan: targetPlan,
      surface: 'journey_stage_grid',
      route: stage.href,
    });
  }, [isSoftPreview, plan, stage.href, stage.name, stage.planFeature, targetPlan]);

  if (isSoftPreview) {
    const previewCopy = journeyTool?.previewCopy || `${stage.description} Preview the outcome before this becomes part of your active workflow.`;
    const proofCopy = journeyTool?.proofCopy || `${requiredPlanLabel} unlocks this stage when it becomes the right next step.`;

    return (
      <div className="group flex min-h-[190px] flex-col rounded-xl border border-dashed border-primary/25 bg-card/70 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-card">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <Badge variant="outline" className="px-1.5 text-caption font-semibold uppercase tracking-wider">
            Preview
          </Badge>
        </div>
        <p className="mb-0.5 text-xs font-semibold text-foreground/70">
          Stage {stage.id} - {stage.name}
        </p>
        <p className="flex-1 text-xs leading-snug text-muted-foreground">
          {previewCopy}
        </p>
        <p className="mt-3 rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-label leading-4 text-muted-foreground">
          {proofCopy}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 px-2 text-label">
            <Link
              to={stage.href}
              onClick={() => trackSoftPreviewClicked({
                feature_key: stage.planFeature,
                tool_name: stage.name,
                current_plan: plan,
                target_plan: targetPlan,
                destination: 'tool_preview',
                surface: 'journey_stage_grid',
                route: stage.href,
              })}
            >
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Link>
          </Button>
          {targetPlan ? (
            <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-label">
              <Link
                to={`/pricing#${targetPlan}`}
                onClick={() => trackSoftPreviewClicked({
                  feature_key: stage.planFeature,
                  tool_name: stage.name,
                  current_plan: plan,
                  target_plan: targetPlan,
                  destination: 'plan',
                  surface: 'journey_stage_grid',
                  route: stage.href,
                })}
              >
                See {requiredPlanLabel}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Link
      to={stage.href}
      className="group flex flex-col rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-card/80 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        {stage.badge && (
          <Badge variant="outline" className="px-1.5 text-caption font-semibold uppercase tracking-wider">
            {stage.badge}
          </Badge>
        )}
      </div>
      <p className="mb-0.5 text-xs font-semibold text-foreground">
        Stage {stage.id} - {stage.name}
      </p>
      <p className="mb-3 flex-1 text-xs leading-snug text-muted-foreground">
        {stage.description}
      </p>
      <div className="flex items-center gap-1 text-label font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

export function JourneyStageGrid() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Your Startup Journey</h2>
        <span className="text-xs text-muted-foreground">7 stages</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {STAGES.map((stage) => (
          <StageCard key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  );
}
