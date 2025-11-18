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
  const { balance, hasCredits } = useCredits();

  const getStatusInfo = () => {
    if (requiredCredits && !hasCredits(requiredCredits)) {
      return {
        type: 'insufficient',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: `You need ${requiredCredits} credits to use ${feature || 'this feature'}, but you only have ${balance} credits.`
      };
    }

    if (balance <= 0) {
      return {
        type: 'empty',
        icon: AlertTriangle,
        variant: 'destructive' as const,
        message: 'You have no credits remaining. Purchase more credits to continue using BizMap AI features.'
      };
    }

    if (balance <= 5) {
      return {
        type: 'low',
        icon: Info,
        variant: 'default' as const,
        message: `You have ${balance} credits remaining. Consider purchasing more to avoid interruption.`
      };
    }

    return {
      type: 'sufficient',
      icon: CheckCircle,
      variant: 'default' as const,
      message: `You have ${balance} credits available.`
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  const getCreditCostMessage = () => {
    if (!feature) return '';
    
    if (feature.toLowerCase().includes('launch report')) {
      return ` Launch reports cost ${CREDIT_COSTS.LAUNCH_REPORT} credits each.`;
    }
    if (feature.toLowerCase().includes('asset')) {
      return ` Asset generation costs ${CREDIT_COSTS.ASSET_GENERATION} credits each.`;
    }
    return '';
  };

  return (
    <div className="space-y-3">
      {/* Current Balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Credit Balance:</span>
        </div>
        <Badge 
          variant={balance <= 0 ? 'destructive' : balance <= 5 ? 'secondary' : 'default'}
        >
          {balance} credits
        </Badge>
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