import { Coins, Loader2, Plus } from "lucide-react";
import { CreditNavigationMenu } from "@/components/CreditNavigationMenu";
import { warmCheckoutPath } from "@/services/checkoutService";
import { CreditPriceList } from "@/components/CreditPriceList";
import { useCredits } from "@/hooks/useCredits";
import { useCreditWalletSummary } from "@/hooks/useCreditWalletSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_MONTHLY_CREDITS, normalizePlan } from "@/config/planPermissions";
import { useNavigate } from "react-router-dom";
import { useWorkspaceFrame } from '@/contexts/WorkspaceFrameContext';

interface CreditDisplayProps {
  variant?: "navigation" | "inline" | "detailed";
  showPurchaseButton?: boolean;
  compact?: boolean;
}

export function CreditDisplay({ variant = "navigation", showPurchaseButton = false, compact = false }: CreditDisplayProps) {
  const inWorkspace = useWorkspaceFrame();
  const { balance, monthlyQuota, heldCredits, totalAvailable, loading, refreshBalance, error: balanceError } = useCredits();
  const navigate = useNavigate();
  const { user } = useAuth();
  // We only need the credit-pack checkout action + current plan here, so skip the tiers fetch.
  const { createCreditPackCheckout, actionLoading, subscriptionData, statusError, loading: planLoading, refreshSubscription } = useSubscription({ fetchTiers: false, strictStatus: inWorkspace });
  // Monthly Quota mirrors the user's current plan allocation
  // (Rookie 50 / Starter 100 / Rising 250 / Pro 600), not the mutable remaining quota.
  const planMonthlyCredits =
    PLAN_MONTHLY_CREDITS[normalizePlan(subscriptionData.subscription_tier)] ?? PLAN_MONTHLY_CREDITS.rookie;
  // Top-up credits + credits spent in the current monthly window, anchored to the
  // account creation day (both reset each month). Navbar dropdown only.
  const { topUpCredits, creditsSpent, error: summaryError, loading: summaryLoading, refresh: refreshSummary } = useCreditWalletSummary(variant === "navigation");

  if (!user) return null;

  if (loading || (inWorkspace && (planLoading || summaryLoading))) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const getBalanceColor = () => {
    if (totalAvailable <= 0) return "destructive";
    if (totalAvailable <= 2) return "secondary"; // Low credit warning at 20% remaining for 10 credit free tier
    return "default";
  };

  const getBalanceText = () => {
    if (totalAvailable <= 0) return "No credits";
    return `${totalAvailable} credit${totalAvailable !== 1 ? 's' : ''}`;
  };

  if (inWorkspace && (balanceError || statusError || summaryError)) {
    return <button className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground" title="Retry loading credit balance" onClick={() => void Promise.all([refreshBalance(), refreshSubscription(), refreshSummary()])}>Credits unavailable · Retry</button>;
  }

  if (variant === "navigation") {
    return <CreditNavigationMenu {...{ totalAvailable, planMonthlyCredits, topUpCredits, creditsSpent, heldCredits, actionLoading, showPurchaseButton, navigate, createCreditPackCheckout }} warmCheckout={warmCheckoutPath} compact={compact} />;
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-muted-foreground" />
        <Badge variant={getBalanceColor()} className="text-xs">
          {totalAvailable}
        </Badge>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Credit Balance</h3>
          </div>
          <Button size="sm" variant="outline" onClick={refreshBalance}>
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {/* Monthly Quota */}
          {monthlyQuota > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Quota:</span>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {monthlyQuota} credits
              </Badge>
            </div>
          )}

          {/* Purchased Balance */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Purchased Balance:</span>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {balance} credits
            </Badge>
          </div>

          {/* Total Available */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">Total Available:</span>
            <Badge variant={getBalanceColor()} className="text-sm px-3 py-1">
              {getBalanceText()}
            </Badge>
          </div>

          {heldCredits > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Temporarily Held:</span>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {heldCredits} credits
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Credit Costs:</h4>
            <div className="pl-2">
              <CreditPriceList />
            </div>
          </div>

          {totalAvailable <= 2 && (
            <div className="bg-warning-subtle dark:bg-warning/20 border border-warning dark:border-warning rounded-md p-3 mt-3">
              <p className="text-sm text-warning dark:text-warning">
                ⚠️ Low credit balance. Upgrade to get more credits and unlock additional features.
              </p>
            </div>
          )}

          {showPurchaseButton && (
            <Button className="w-full gap-2" variant="default" onClick={() => navigate('/pricing')}>
              <Plus className="h-4 w-4" />
              Upgrade Plan
            </Button>
          )}

          <Button className="w-full" variant="ghost" onClick={() => navigate('/account#credit-activity')}>
            View credit activity
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
