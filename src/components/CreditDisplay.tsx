import { Calendar, Coins, Loader2, Plus, Zap } from "lucide-react";
import { CreditPriceList } from "@/components/CreditPriceList";
import { useCredits } from "@/hooks/useCredits";
import { useCreditWalletSummary } from "@/hooks/useCreditWalletSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_MONTHLY_CREDITS, normalizePlan } from "@/config/planPermissions";
import { useNavigate } from "react-router-dom";

interface CreditDisplayProps {
  variant?: "navigation" | "inline" | "detailed";
  showPurchaseButton?: boolean;
}

const QUICK_TOP_UP_PACKS = [
  { id: "pack_20", label: "Starter Pack", credits: 20 },
  { id: "pack_40", label: "Boost Pack", credits: 40 },
  { id: "pack_60", label: "Power Pack", credits: 60 },
] as const;

export function CreditDisplay({ variant = "navigation", showPurchaseButton = false }: CreditDisplayProps) {
  const { balance, monthlyQuota, heldCredits, totalAvailable, loading, refreshBalance, CREDIT_COSTS } = useCredits();
  const navigate = useNavigate();
  const { user } = useAuth();
  // We only need the credit-pack checkout action + current plan here, so skip the tiers fetch.
  const { createCreditPackCheckout, actionLoading, subscriptionData } = useSubscription({ fetchTiers: false });
  // Monthly Quota mirrors the user's current plan allocation
  // (Rookie 50 / Starter 100 / Rising 250 / Pro 600), not the mutable remaining quota.
  const planMonthlyCredits =
    PLAN_MONTHLY_CREDITS[normalizePlan(subscriptionData.subscription_tier)] ?? PLAN_MONTHLY_CREDITS.rookie;
  // Top-up credits + credits spent in the current monthly window, anchored to the
  // account creation day (both reset each month). Navbar dropdown only.
  const { topUpCredits, creditsSpent } = useCreditWalletSummary(variant === "navigation");

  if (!user) return null;

  if (loading) {
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

  if (variant === "navigation") {
    return (
      <TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-8 px-3">
              <Coins className="h-4 w-4" />
              <Badge variant={getBalanceColor()} className="text-xs">
                {totalAvailable}
              </Badge>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Credit Balance (Monthly)
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Section 1: Credit Balance details */}
            <div className="p-3 space-y-3">
              {/* Plan Quota — mirrors the user's current plan allocation */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plan Quota:</span>
                <Badge variant="outline" className="text-xs">
                  {planMonthlyCredits} credits
                </Badge>
              </div>

              {/* Top Up Credits — bought via Quick Top Ups this monthly window */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Top Up Credits:</span>
                <Badge variant="outline" className="text-xs">
                  {topUpCredits} credits
                </Badge>
              </div>

              {/* Credits Spent — since the current billing period start; resets each cycle */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Credits Spent:</span>
                <Badge variant="outline" className="text-xs">
                  {creditsSpent} credits
                </Badge>
              </div>

              {/* Total Available */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total Available:</span>
                <Badge variant={getBalanceColor()}>
                  {getBalanceText()}
                </Badge>
              </div>

              {heldCredits > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Temporarily Held:</span>
                  <Badge variant="secondary" className="text-xs">
                    {heldCredits} credits
                  </Badge>
                </div>
              )}
            </div>

            {/* Section 2: Quick Top Ups */}
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Top Ups
            </DropdownMenuLabel>

            <div className="px-3 pb-3 pt-1 grid gap-2">
              {QUICK_TOP_UP_PACKS.map((pack) => (
                <Button
                  key={pack.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between gap-2 h-auto py-2"
                  disabled={actionLoading}
                  onClick={(event) => {
                    event.preventDefault();
                    void createCreditPackCheckout(pack.id, 'credit_display');
                  }}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Plus className="h-3 w-3" />
                    {pack.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    +{pack.credits} Credits
                  </span>
                </Button>
              ))}
            </div>

            {/* Section 3: Monthly Plans */}
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
              onSelect={() => navigate('/pricing')}
            >
              <Calendar className="h-4 w-4" />
              Monthly Plans
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center gap-2 text-sm cursor-pointer"
              onSelect={() => navigate('/account#credit-activity')}
            >
              <Coins className="h-4 w-4" />
              View credit activity
            </DropdownMenuItem>

            {showPurchaseButton && (
              <div className="px-3 pb-3 pt-1">
                <Button size="sm" className="w-full gap-2" variant="outline" onClick={() => navigate('/pricing')}>
                  <Plus className="h-3 w-3" />
                  Upgrade Plan
                </Button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    );
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
