/**
 * Non-blocking inline banner that renders the single active upgrade trigger.
 * Place once inside the dashboard content area. Respects the single-surface rule
 * enforced by useUpgradeTrigger.
 */

import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUpgradeTriggerContext } from '@/contexts/UpgradeTriggerContext';
import { PLAN_LABELS } from '@/config/planPermissions';
import { trackUpgradeClicked, normalizePlanId } from '@/lib/analytics';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { normalizePlan } from '@/config/planPermissions';

export function UpgradeTriggerBanner() {
  const { activeTrigger, dismissActive } = useUpgradeTriggerContext();
  const { currentTier } = useFeatureGating();

  if (!activeTrigger) return null;

  const { targetPlan, headline, body, ctaLabel } = activeTrigger;
  const pricingUrl = `/pricing#${targetPlan}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-primary/25 bg-primary/6 px-5 py-4 backdrop-blur-sm"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-foreground">{headline}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          asChild
          size="sm"
          onClick={() =>
            trackUpgradeClicked({
              from_plan: normalizePlanId(normalizePlan(currentTier)),
              to_plan: normalizePlanId(targetPlan),
              location: 'upgrade_trigger_banner',
            })
          }
        >
          <Link to={pricingUrl}>
            {ctaLabel}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <button
          onClick={dismissActive}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Dismiss ${PLAN_LABELS[targetPlan]} upgrade suggestion`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
