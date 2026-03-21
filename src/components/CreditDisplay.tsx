import { Coins, Loader2, Plus } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { CREDIT_PACK_PAYMENT_LINKS, TIER_MONTHLY_CREDITS } from "@/config/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface CreditDisplayProps {
  variant?: "navigation" | "inline" | "detailed";
  showPurchaseButton?: boolean;
}

export function CreditDisplay({ variant = "navigation", showPurchaseButton = false }: CreditDisplayProps) {
  const { balance, monthlyQuota, loading, refreshBalance } = useCredits();
  const { subscriptionData } = useSubscription();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const totalAvailable = balance + monthlyQuota;
  const tierKey = (subscriptionData?.subscription_tier || "free").toLowerCase() as keyof typeof TIER_MONTHLY_CREDITS;
  const planCredits = monthlyQuota || TIER_MONTHLY_CREDITS[tierKey] || TIER_MONTHLY_CREDITS.free;
  const planName = {
    free: "Rookie",
    creator: "Rising",
    professional: "Pro",
  }[tierKey] || "Rookie";
  const progressValue = planCredits > 0 ? Math.min(100, (Math.max(totalAvailable, 0) / planCredits) * 100) : 0;

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
              Credit Balance
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <div className="p-3 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {totalAvailable} out of {planCredits} - {planName} Plan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {balance > 0
                        ? `${balance} top-up credit${balance !== 1 ? "s" : ""} included`
                        : "Monthly credits remaining"}
                    </p>
                  </div>
                  <Badge variant={getBalanceColor()} className="shrink-0">
                    {getBalanceText()}
                  </Badge>
                </div>

                <Progress value={progressValue} className="h-2" />

                <div className="grid gap-2">
                  <Button size="sm" className="w-full" asChild>
                    <a href={CREDIT_PACK_PAYMENT_LINKS.pack_20} target="_blank" rel="noreferrer">
                      Top Up 20 Credits
                    </a>
                  </Button>
                  <Button size="sm" className="w-full" variant="outline" asChild>
                    <a href={CREDIT_PACK_PAYMENT_LINKS.pack_40} target="_blank" rel="noreferrer">
                      Top Up 40 Credits
                    </a>
                  </Button>
                  <Button size="sm" className="w-full" variant="outline" asChild>
                    <a href={CREDIT_PACK_PAYMENT_LINKS.pack_60} target="_blank" rel="noreferrer">
                      Top Up 60 Credits
                    </a>
                  </Button>
                </div>
              </div>

              {showPurchaseButton && (
                <Button size="sm" className="w-full gap-2" variant="outline" onClick={() => navigate('/pricing')}>
                  <Plus className="h-3 w-3" />
                  Upgrade Plan
                </Button>
              )}
            </div>
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

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Credit Costs:</h4>
            <div className="pl-2">
              <CreditPriceList />
            </div>
          </div>

          {totalAvailable <= 2 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
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
        </div>
      </div>
    );
  }

  return null;
}
