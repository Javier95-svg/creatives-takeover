import { Coins, AlertTriangle, CheckCircle, Info, TrendingUp } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CREDIT_COSTS } from "@/config/constants";
import { normalizePlan, PLAN_MONTHLY_CREDITS } from "@/config/planPermissions";

interface CreditStatusProps {
  requiredCredits?: number;
  feature?: string;
  showPurchaseLink?: boolean;
}

export function CreditStatus({ requiredCredits, feature, showPurchaseLink = true }: CreditStatusProps) {
  const { balance, monthlyQuota, hasCredits } = useCredits();
  const { currentTier } = useFeatureGating();
  
  const totalAvailable = balance + monthlyQuota;
  const normalizedTier = normalizePlan(currentTier);
  const monthlyCredits = PLAN_MONTHLY_CREDITS[normalizedTier];
  const creditUsagePercent = monthlyCredits > 0 
    ? Math.round(((monthlyCredits - totalAvailable) / monthlyCredits) * 100)
    : 0;
  const isLowCredits = creditUsagePercent >= 80 && totalAvailable > 0;
  const isVeryLowCredits = creditUsagePercent >= 90 && totalAvailable > 0;

  const getStatusInfo = () => {
    if (requiredCredits && !hasCredits(requiredCredits)) {
      return {
        type: 'insufficient',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: `You need ${requiredCredits} credits to use ${feature || 'this feature'}, but you only have ${totalAvailable} credits available.`
      };
    }

    if (totalAvailable <= 0) {
      return {
        type: 'empty',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: 'You have no credits remaining. Upgrade to get more credits and continue using features.'
      };
    }

    if (isVeryLowCredits) {
      return {
        type: 'very_low',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: `You've used ${creditUsagePercent}% of your monthly credits (${totalAvailable} remaining). Upgrade now to avoid interruption.`
      };
    }

    if (isLowCredits) {
      return {
        type: 'low',
        icon: Info,
        variant: 'default' as const,
        message: `You've used ${creditUsagePercent}% of your monthly credits (${totalAvailable} remaining). Consider upgrading for more credits.`
      };
    }

    return {
      type: 'sufficient',
      icon: CheckCircle,
      variant: 'default' as const,
      message: `You have ${totalAvailable} credits available.`
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  const getCreditCostMessage = () => {
    if (!feature) return '';
    
    const featureLower = feature.toLowerCase();
    
    if (featureLower.includes('launch report')) {
      return ` Launch reports cost ${CREDIT_COSTS.LAUNCH_REPORT} credits each.`;
    }
    if (featureLower.includes('asset')) {
      return ` Asset generation costs ${CREDIT_COSTS.ASSET_GENERATION} credits each.`;
    }
    if (featureLower.includes('fundraising') || featureLower.includes('readiness')) {
      return ` Fundraising readiness analysis costs ${CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS} credits.`;
    }
    if (featureLower.includes('roadmap')) {
      return ` Roadmap generation costs ${CREDIT_COSTS.ROADMAP_GENERATION} credits.`;
    }
    if (featureLower.includes('waitlist')) {
      return normalizedTier === 'rookie'
        ? ` Publishing a waitlist page costs ${CREDIT_COSTS.WAITLIST_GENERATION} credits on Rookie.`
        : ' Waitlist publishing is included on your plan.';
    }
    if (featureLower.includes('market validation') || featureLower.includes('validation')) {
      return ` Market validation costs ${CREDIT_COSTS.MARKET_VALIDATION} credits.`;
    }
    if (featureLower.includes('business insights') || featureLower.includes('insights')) {
      return ` Business insights generation costs ${CREDIT_COSTS.BUSINESS_INSIGHTS} credits.`;
    }
    if (featureLower.includes('sprint') || featureLower.includes('task generation')) {
      return ` Sprint task generation costs ${CREDIT_COSTS.SPRINT_TASK_GENERATION} credits.`;
    }
    if (featureLower.includes('pdf') || featureLower.includes('export')) {
      return ` Report exports cost ${CREDIT_COSTS.PDF_EXPORT} credits.`;
    }
    if (featureLower.includes('chat') || featureLower.includes('message') || featureLower.includes('bizmap')) {
      return ` BizMap AI messages cost ${CREDIT_COSTS.AI_CHAT_MESSAGE} credit each.`;
    }
    if (featureLower.includes('mvp')) {
      return normalizedTier === 'rising' || normalizedTier === 'pro'
        ? ' MVP Builder is included on your plan.'
        : ' MVP Builder unlocks on Rising and Pro.';
    }
    if (featureLower.includes('gtm')) {
      return normalizedTier === 'rising' || normalizedTier === 'pro'
        ? ' GTM Strategist is included on your plan.'
        : ' GTM Strategist unlocks on Rising and Pro.';
    }
    if (featureLower.includes('tech stack')) {
      return normalizedTier === 'rising' || normalizedTier === 'pro'
        ? ' Tech Stack Builder is included on your plan.'
        : ' Tech Stack Builder unlocks on Rising and Pro.';
    }
    if (featureLower.includes('pmf') || featureLower.includes('product-market fit')) {
      if (normalizedTier === 'rookie') {
        return ' Product-Market Fit Lab unlocks on Starter and above.';
      }
      return ' Product-Market Fit Lab is included on your plan.';
    }
    if (featureLower.includes('insighta') || featureLower.includes('test')) {
      return ` Insighta Test costs ${CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS} credits.`;
    }
    if (featureLower.includes('investor') || featureLower.includes('matching')) {
      return ` Investor matching costs ${CREDIT_COSTS.INVESTOR_MATCHING} credits.`;
    }
    if (featureLower.includes('pitch deck')) {
      return normalizedTier === 'rising' || normalizedTier === 'pro'
        ? ' Pitch Deck Analyzer is included on your plan.'
        : ' Pitch Deck Analyzer unlocks on Rising and Pro.';
    }
    if (featureLower.includes('market research')) {
      return ` Market research costs ${CREDIT_COSTS.MARKET_RESEARCH} credits.`;
    }
    if (featureLower.includes('financial')) {
      return ` Financial analysis costs ${CREDIT_COSTS.FINANCIAL_ANALYSIS} credits.`;
    }
    return '';
  };

  return (
    <div className="space-y-3">
      {/* Credit Breakdown */}
      <div className="space-y-2">
        {/* Monthly Quota */}
        {monthlyQuota > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Monthly Quota:</span>
            </div>
            <Badge variant="outline">
              {monthlyQuota} credits
            </Badge>
          </div>
        )}
        
        {/* Purchased Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Purchased Balance:</span>
          </div>
          <Badge variant="outline">
            {balance} credits
          </Badge>
        </div>
        
        {/* Total Available */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Available:</span>
          </div>
          <Badge 
            variant={totalAvailable <= 0 ? 'destructive' : totalAvailable <= 2 ? 'secondary' : 'default'}
          >
            {totalAvailable} credits
          </Badge>
        </div>
      </div>

      {/* Status Alert */}
      {(status.type === 'insufficient' || status.type === 'empty' || status.type === 'low' || status.type === 'very_low') && (
        <Alert variant={status.variant}>
          <Icon className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {status.message}
            {getCreditCostMessage()}
            
            {showPurchaseLink && (status.type === 'insufficient' || status.type === 'empty' || status.type === 'very_low' || (status.type === 'low' && normalizedTier === 'rookie')) && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant={status.type === 'very_low' || status.type === 'empty' ? "default" : "outline"} asChild>
                  <Link to="/pricing">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {normalizedTier === 'rookie' ? 'Upgrade Plan' : 'View Plans'}
                  </Link>
                </Button>
                {normalizedTier !== 'rookie' && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/credits">
                      Learn More
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Feature Cost Info */}
      {requiredCredits && feature && (
        <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
          <div className="font-medium mb-1">Credit Cost:</div>
          <div>{feature}: {requiredCredits} credits</div>
        </div>
      )}
    </div>
  );
}
