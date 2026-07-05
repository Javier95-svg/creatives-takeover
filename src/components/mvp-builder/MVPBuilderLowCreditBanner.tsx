import { useEffect, useRef, useState } from 'react';
import { Coins, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMVPCredits } from '@/hooks/useMVPCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlan } from '@/config/planPermissions';
import {
  trackContextualUpgradeImpression,
  trackContextualUpgradeCtaClicked,
  trackContextualUpgradeDismissed,
} from '@/lib/contextualUpgrade';

const SOURCE_TOOL = 'mvp_builder';
const LOW_WATER_RATIO = 0.2; // surface at 20% of the monthly allowance remaining

interface MVPBuilderLowCreditBannerProps {
  /** What the user is currently building — shown so the prompt has context. */
  projectName?: string;
  onGetCredits: () => void;
}

/**
 * Trigger 1 (limit proximity): a non-blocking, dismissible inline banner that
 * appears when the MVP Builder balance drops to ~20% of the monthly allowance
 * but is not yet zero. Zero is handled by MVPBuilderCreditExhaustedDialog. The
 * banner never interrupts a generation in progress — it sits above the chat and
 * the user can keep working or top up. Impression/CTA/dismiss are logged through
 * the unified contextual-upgrade taxonomy.
 */
export const MVPBuilderLowCreditBanner = ({ projectName, onGetCredits }: MVPBuilderLowCreditBannerProps) => {
  const { totalAvailable, monthlyQuota, loading } = useMVPCredits();
  const { subscriptionData } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const impressionLoggedRef = useRef(false);

  const plan = normalizePlan(subscriptionData?.subscription_tier);
  const threshold = monthlyQuota > 0 ? Math.ceil(monthlyQuota * LOW_WATER_RATIO) : 0;
  const isLow =
    !loading && monthlyQuota > 0 && totalAvailable > 0 && totalAvailable <= threshold;
  const visible = isLow && !dismissed;

  const contextLine = projectName
    ? `You're building "${projectName}" — ${totalAvailable} credits left.`
    : `${totalAvailable} credits left this cycle.`;

  const contextualProps = {
    trigger: 'mvp_credit_low' as const,
    sourceTool: SOURCE_TOOL,
    currentPlan: plan,
    creditsRemaining: totalAvailable,
    context: contextLine,
  };

  useEffect(() => {
    if (visible && !impressionLoggedRef.current) {
      impressionLoggedRef.current = true;
      trackContextualUpgradeImpression(contextualProps);
    }
    if (!visible) {
      impressionLoggedRef.current = false;
    }
    // contextualProps is recomputed each render; impression is guarded by the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-warning/20 bg-warning/10 px-4 py-2 text-sm text-warning">
      <div className="flex min-w-0 items-center gap-2">
        <Coins className="h-4 w-4 shrink-0 text-warning" />
        <span className="truncate">
          {contextLine} Top up or upgrade to keep building without interruptions.
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="pill-sm"
          className="bg-white px-3 text-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {
            trackContextualUpgradeCtaClicked({ ...contextualProps, outcome: 'credits' });
            onGetCredits();
          }}
        >
          Get credits
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss"
          className="text-warning/80 hover:bg-warning-subtle hover:text-white"
          onClick={() => {
            trackContextualUpgradeDismissed(contextualProps);
            setDismissed(true);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
