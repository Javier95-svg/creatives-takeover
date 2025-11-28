import { Coins, Loader2, Plus } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

interface CreditDisplayProps {
  variant?: "navigation" | "inline" | "detailed";
  showPurchaseButton?: boolean;
}

export function CreditDisplay({ variant = "navigation", showPurchaseButton = false }: CreditDisplayProps) {
  const { balance, monthlyQuota, loading, refreshBalance, CREDIT_COSTS } = useCredits();
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

  const getBalanceColor = () => {
    if (totalAvailable <= 0) return "destructive";
    if (totalAvailable <= 5) return "secondary";
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
              
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Launch Report: {CREDIT_COSTS.LAUNCH_REPORT} credits</div>
                <div>• Asset Generation: {CREDIT_COSTS.ASSET_GENERATION} credits each</div>
                <div>• AI Chat Message: {CREDIT_COSTS.AI_CHAT_MESSAGE} credit</div>
              </div>
              
              {showPurchaseButton && (
                <Button size="sm" className="w-full gap-2" variant="outline" onClick={() => navigate('/pricing')}>
                  <Plus className="h-3 w-3" />
                  Buy More Credits
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
          
          <div className="space-y-2 text-xs text-muted-foreground">
            <h4 className="font-medium text-foreground">Credit Costs:</h4>
            <div className="grid grid-cols-1 gap-1 pl-2">
              <div>• Launch Report Generation: {CREDIT_COSTS.LAUNCH_REPORT} credits</div>
              <div>• Asset Generation (each): {CREDIT_COSTS.ASSET_GENERATION} credits</div>
              <div>• AI Chat Message: {CREDIT_COSTS.AI_CHAT_MESSAGE} credit</div>
              <div>• Premium Features: {CREDIT_COSTS.PREMIUM_FEATURE} credits</div>
            </div>
          </div>
          
          {totalAvailable <= 5 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Low credit balance. Consider purchasing more credits to continue using all features.
              </p>
            </div>
          )}
          
          {showPurchaseButton && (
            <Button className="w-full gap-2" variant="default" onClick={() => navigate('/pricing')}>
              <Plus className="h-4 w-4" />
              Purchase More Credits
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}