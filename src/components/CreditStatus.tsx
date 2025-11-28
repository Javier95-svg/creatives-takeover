import { Coins, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CREDIT_COSTS } from "@/config/constants";

interface CreditStatusProps {
  requiredCredits?: number;
  feature?: string;
  showPurchaseLink?: boolean;
}

export function CreditStatus({ requiredCredits, feature, showPurchaseLink = true }: CreditStatusProps) {
  const { balance, monthlyQuota, hasCredits } = useCredits();
  
  const totalAvailable = balance + monthlyQuota;

  const getStatusInfo = () => {
    if (requiredCredits && !hasCredits(requiredCredits)) {
      return {
        type: 'insufficient',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: `You need ${requiredCredits} credits to use ${feature || 'this feature'}, but you only have ${totalAvailable} credits available (${monthlyQuota} monthly quota + ${balance} purchased).`
      };
    }

    if (totalAvailable <= 0) {
      return {
        type: 'empty',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: 'You have no credits remaining. Purchase more credits to continue using BizMap AI features.'
      };
    }

    if (totalAvailable <= 5) {
      return {
        type: 'low',
        icon: Info,
        variant: 'default' as const,
        message: `You have ${totalAvailable} credits remaining (${monthlyQuota} monthly quota + ${balance} purchased). Consider purchasing more to avoid interruption.`
      };
    }

    return {
      type: 'sufficient',
      icon: CheckCircle,
      variant: 'default' as const,
      message: `You have ${totalAvailable} credits available (${monthlyQuota} monthly quota + ${balance} purchased).`
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
      return ` PDF export costs ${CREDIT_COSTS.PDF_EXPORT} credits.`;
    }
    if (featureLower.includes('chat') || featureLower.includes('message')) {
      return ` AI chat messages cost ${CREDIT_COSTS.AI_CHAT_MESSAGE} credit each.`;
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
            variant={totalAvailable <= 0 ? 'destructive' : totalAvailable <= 5 ? 'secondary' : 'default'}
          >
            {totalAvailable} credits
          </Badge>
        </div>
      </div>

      {/* Status Alert */}
      {(status.type === 'insufficient' || status.type === 'empty' || status.type === 'low') && (
        <Alert variant={status.variant}>
          <Icon className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {status.message}
            {getCreditCostMessage()}
            
            {showPurchaseLink && (status.type === 'insufficient' || status.type === 'empty') && (
              <div className="mt-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/credits">
                    Purchase Credits
                  </Link>
                </Button>
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