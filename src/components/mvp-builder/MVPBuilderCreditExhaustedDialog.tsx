import { useEffect } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, CreditCard, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlan } from '@/config/planPermissions';
import {
  trackContextualUpgradeImpression,
  trackContextualUpgradeCtaClicked,
  trackContextualUpgradeDismissed,
} from '@/lib/contextualUpgrade';
import { TOP_UP_PACKS } from '@/config/pricing';

const CREDIT_PACKS = TOP_UP_PACKS;

interface MVPBuilderCreditExhaustedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MVPBuilderCreditExhaustedDialog = ({
  open,
  onOpenChange,
}: MVPBuilderCreditExhaustedDialogProps) => {
  const navigate = useNavigate();
  const { createCreditPackCheckout, actionLoading, subscriptionData } = useSubscription();
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);

  const contextualProps = {
    trigger: 'mvp_credit_zero' as const,
    sourceTool: 'mvp_builder',
    currentPlan: normalizePlan(subscriptionData?.subscription_tier),
    creditsRemaining: 0,
    context: 'MVP Builder credits exhausted',
  };

  useEffect(() => {
    if (open) trackContextualUpgradeImpression(contextualProps);
    // Fire once per open; props are stable enough for this rule-based prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openPackCheckout = async (packId: string) => {
    trackContextualUpgradeCtaClicked({ ...contextualProps, outcome: 'credits', context: packId });
    setPendingPackId(packId);
    try {
      await createCreditPackCheckout(packId, 'mvp_builder_credit_exhausted');
    } finally {
      setPendingPackId(null);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && open) trackContextualUpgradeDismissed(contextualProps);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-warning" />
            Keep building your MVP
          </DialogTitle>
          <DialogDescription>
            You have used all your credits. Upgrade your plan or add a top-up pack to continue using MVP Builder.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Button
            type="button"
            className="h-auto justify-between gap-3 px-4 py-3"
            onClick={() => {
              trackContextualUpgradeCtaClicked({ ...contextualProps, outcome: 'plan' });
              onOpenChange(false);
              navigate('/pricing');
            }}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Upgrade your plan
            </span>
            <span className="text-xs opacity-80">Compare plans</span>
          </Button>

          <div className="pt-2">
            <div className="mb-2 text-sm font-medium">Or top up your credits</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {CREDIT_PACKS.map((pack) => (
                <Button
                  key={pack.id}
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-start gap-1 px-3 py-3"
                  onClick={() => void openPackCheckout(pack.id)}
                  disabled={actionLoading}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CreditCard className="h-4 w-4" />
                    {pack.label}
                  </span>
                  <span className="text-xs text-muted-foreground">+{pack.credits} Credits</span>
                  {pendingPackId === pack.id && (
                    <span className="text-xs text-muted-foreground">Opening checkout...</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
