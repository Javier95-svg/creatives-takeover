/**
 * Journey Stage Grid — shown on the dashboard.
 *
 * Displays the core BizMap tools and reflects plan-based preview vs full access.
 */

import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Users, Radio, FlaskConical, Hammer, Boxes, TrendingUp, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import type { Phase } from '@/store/leanStartupStore';
import type { FeatureKey } from '@/config/planPermissions';

interface Stage {
  id: number;
  name: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  planFeature: FeatureKey;
  badge?: string;
  phase: Phase; // which lean-startup phase this stage belongs to
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
    name: 'Waitlist Maker',
    description: 'Build demand before you launch.',
    href: '/waitlist',
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
  const { hasAccess, state, upgradeTarget } = usePlanAccess(stage.planFeature);
  const Icon = stage.icon;

  const isPreview = state === 'preview_only';
  const isLocked = state === 'locked' || state === 'hidden';

  if (isLocked) {
    const requiredPlanLabel = upgradeTarget ? upgradeTarget.charAt(0).toUpperCase() + upgradeTarget.slice(1) : 'higher';

    return (
      <div className="relative group rounded-xl border border-border/60 bg-card/60 p-4 opacity-60 grayscale cursor-not-allowed">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 border border-border/60 shadow-sm">
            <Lock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Locked
            </span>
          </div>
        </div>
        <p className="text-xs font-semibold text-foreground/60 mb-0.5">
          Stage {stage.id} · {stage.name}
        </p>
        <p className="text-xs text-muted-foreground leading-snug">
          Upgrade to {requiredPlanLabel} to unlock this tool.
        </p>
      </div>
    );
  }

  return (
    <Link
      to={stage.href}
      className="group flex flex-col rounded-xl border border-border/70 bg-card hover:bg-card/80 hover:border-primary/30 hover:shadow-md p-4 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        {stage.badge && (
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider px-1.5">
            {isPreview ? 'Preview' : stage.badge}
          </Badge>
        )}
      </div>
      <p className="text-xs font-semibold text-foreground mb-0.5">
        Stage {stage.id} · {stage.name}
      </p>
      <p className="text-xs text-muted-foreground leading-snug mb-3 flex-1">
        {isPreview ? `${stage.description} Preview only on your current plan.` : stage.description}
      </p>
      <div className="flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

export function JourneyStageGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Your Startup Journey</h2>
        <span className="text-xs text-muted-foreground">7 stages</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STAGES.map((stage) => (
          <StageCard key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  );
}
