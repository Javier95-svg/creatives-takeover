import { Coins, Loader2, Plus } from "lucide-react";
import { CreditPriceList } from "@/components/CreditPriceList";
import { useCredits } from "@/hooks/useCredits";
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
  const { balance, monthlyQuota, heldCredits, loading, refreshBalance, CREDIT_COSTS } = useCredits();
  const navigate = useNavigate();
  const { user } = useAuth();
  // We only need the credit-pack checkout action here, so skip the tiers fetch.
  const { createCreditPackCheckout, actionLoading } = useSubscription({ fetchTiers: false });

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
              {/* Monthly Quota */}
              {monthlyQuota > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Quota:</span>
                  <Badge variant="outline" className="text-xs">
                    {monthlyQuota} credits
                  </Badge>
                </div>
              )}

              {/* Purchased Balance */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Purchased Balance:</span>
                <Badge variant="outline" className="text-xs">
                  {balance} credits
                </Badge>
              </div>

              {/* Total Available */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total Available:</span>
                <Badge variant={getBalanceColor()}>
                  {getBalanceText()}
                </Badge>
              </div>

              <div className="pt-2 border-t">
                <h4 className="text-xs font-semibold mb-2">Quick Top Ups</h4>
                <div className="grid gap-2">
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
                        void createCreditPackCheckout(pack.id);
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
              </div>

              {heldCredits > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Temporarily Held:</span>
                  <Badge variant="secondary" className="text-xs">
                    {heldCredits} credits
                  </Badge>
                </div>
              )}

              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => navigate('/account#credit-activity')}
              >
                View credit activity
              </DropdownMenuItem>

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
        </div>
      </div>
    );
  }

  return null;
}
