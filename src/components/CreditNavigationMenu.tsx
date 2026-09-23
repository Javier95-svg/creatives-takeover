import { useState } from "react";
import { Calendar, Coins, Loader2, Plus, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK_TOP_UP_PACKS = [
  { id: "pack_20", label: "Starter Pack", credits: 20 },
  { id: "pack_40", label: "Boost Pack", credits: 40 },
  { id: "pack_60", label: "Power Pack", credits: 60 },
] as const;


export function CreditNavigationMenu({totalAvailable, planMonthlyCredits, topUpCredits, creditsSpent, heldCredits = 0, actionLoading = false, showPurchaseButton = false, compact = false, navigate, createCreditPackCheckout, warmCheckout, checkoutMessage}: {
 totalAvailable: number; planMonthlyCredits: number; topUpCredits: number; creditsSpent: number; heldCredits?: number;
 actionLoading?: boolean; showPurchaseButton?: boolean; compact?: boolean;
 checkoutMessage?: string;
 warmCheckout?: () => unknown;
 navigate: (path: string) => void; createCreditPackCheckout: (id: string, source: string) => Promise<string | null>;
}) {
 const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
 const getBalanceColor = () => totalAvailable <= 0 ? "destructive" as const : totalAvailable <= 2 ? "secondary" as const : "default" as const;
 const getBalanceText = () => totalAvailable <= 0 ? "No credits" : `${totalAvailable} credit${totalAvailable !== 1 ? 's' : ''}`;
    return (
      <TooltipProvider>
        <DropdownMenu onOpenChange={(open) => {
          if (open) void warmCheckout?.();
        }}>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`${totalAvailable} credits`} variant="ghost" size="sm" className={compact ? "h-6 gap-1 rounded-full border border-[hsl(var(--credit-gold-edge)/0.5)] bg-gradient-to-br from-[hsl(var(--credit-gold-light))] via-[hsl(var(--credit-gold))] to-[hsl(var(--credit-gold-deep))] px-2 text-xs text-[hsl(var(--credit-gold-foreground))] shadow-sm transition-[filter,box-shadow] hover:text-[hsl(var(--credit-gold-foreground))] hover:brightness-110 hover:shadow-md focus-visible:ring-[hsl(var(--credit-gold-edge))]" : "gap-2 h-8 px-3"}>
              <Coins className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              {compact ? <span>{totalAvailable}</span> : <Badge variant={getBalanceColor()} className="text-xs">
                {totalAvailable}
              </Badge>}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="center"
            alignOffset={compact ? 0 : 12}
            sideOffset={8}
            collisionPadding={16}
            style={{ maxHeight: 'min(32rem, 70dvh, var(--radix-dropdown-menu-content-available-height))' }}
            className="credit-balance-dropdown-scroll w-64 overflow-y-auto overscroll-contain"
          >
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
                  onPointerEnter={() => void warmCheckout?.()}
                  onFocus={() => void warmCheckout?.()}
                  onClick={(event) => {
                    event.preventDefault();
                    setSelectedPackId(pack.id);
                    void createCreditPackCheckout(pack.id, 'credit_display')
                      .finally(() => setSelectedPackId(null));
                  }}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    {actionLoading && selectedPackId === pack.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Plus className="h-3 w-3" />}
                    {pack.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    +{pack.credits} Credits
                  </span>
                </Button>
              ))}
            </div>

            {/* Section 3: Monthly Plans */}
            {checkoutMessage && <p role="alert" className="px-3 pb-3 text-xs text-destructive">{checkoutMessage}</p>}
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" />
              Monthly Plans
            </DropdownMenuLabel>

            {showPurchaseButton && (
              <DropdownMenuItem
                className="flex items-center gap-2 text-sm cursor-pointer"
                onSelect={() => navigate('/pricing')}
              >
                <Plus className="h-4 w-4" />
                Upgrade my plan
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="flex items-center gap-2 text-sm cursor-pointer"
              onSelect={() => navigate('/purchase-history')}
            >
              <Coins className="h-4 w-4" />
              Purchase history
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    );
}
