import { AlertCircle, Coins, CreditCard, Zap, Crown, TrendingUp } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { Button } from "@/components/ui/button";
import { CREDIT_COSTS } from "@/config/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CreditGateProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  feature: string;
  onPurchase?: () => void;
}

export function CreditGate({ 
  isOpen, 
  onClose, 
  requiredCredits, 
  feature,
  onPurchase 
}: CreditGateProps) {
  const { balance } = useCredits();
  const { createCheckout, tiers, subscriptionData } = useSubscription();
  const { currentTier } = useFeatureGating();

  const handleSubscriptionPurchase = async (tier: string) => {
    const url = await createCheckout(tier);
    if (url) {
      onPurchase?.();
      onClose();
      window.location.href = url;
    }
  };

  // Get recommended tier based on current tier
  const getRecommendedTier = () => {
    if (currentTier === 'free') return 'creator';
    if (currentTier === 'creator') return 'professional';
    return null;
  };

  const recommendedTier = getRecommendedTier();
  const currentTierData = tiers.find(t => t.tier_name === currentTier);
  const recommendedTierData = recommendedTier ? tiers.find(t => t.tier_name === recommendedTier) : null;

  // Calculate credit usage percentage
  const creditUsagePercent = currentTierData 
    ? Math.round((balance / currentTierData.monthly_credits) * 100)
    : 0;
  
  const isLowCredits = creditUsagePercent >= 80;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-5 w-5" />
            {isLowCredits ? 'Running Low on Credits' : 'Insufficient Credits'}
          </DialogTitle>
          <DialogDescription>
            {isLowCredits 
              ? `You've used ${100 - creditUsagePercent}% of your monthly credits. Upgrade to ${recommendedTierData?.tier_name || 'a higher tier'} for more credits and unlock additional features!`
              : `You need ${requiredCredits} credits to use ${feature}, but you only have ${balance} credits available. Upgrade to get more credits and unlock additional features!`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current vs Required */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">You have</div>
                  <Badge variant="secondary" className="mt-1">
                    <Coins className="h-3 w-3 mr-1" />
                    {balance} credits
                  </Badge>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">You need</div>
                  <Badge variant="outline" className="mt-1">
                    <Zap className="h-3 w-3 mr-1" />
                    {requiredCredits} credits
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Plans */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Upgrade to a Monthly Plan:
            </h4>
            <div className="space-y-2">
              {tiers.filter(tier => tier.tier_name !== 'free' && tier.tier_name !== currentTier).map((tier) => {
                const isRecommended = tier.tier_name === recommendedTier;
                const creditIncrease = currentTierData 
                  ? tier.monthly_credits - currentTierData.monthly_credits
                  : tier.monthly_credits;
                
                return (
                  <Card key={tier.tier_name} className={isRecommended ? "ring-2 ring-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="h-4 w-4 text-primary" />
                            <span className="font-medium capitalize">{tier.tier_name} Plan</span>
                            {isRecommended && (
                              <Badge variant="default" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                            {(tier.tier_name === 'professional') && (
                              <Badge variant="secondary" className="text-xs">
                                Best Value
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>{tier.monthly_credits} credits per month</div>
                            {creditIncrease > 0 && (
                              <div className="text-green-600 dark:text-green-400">
                                +{creditIncrease} more credits than your current plan
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold">${(tier.price_cents / 100).toFixed(2)}/month</div>
                          <Button
                            size="sm"
                            variant={isRecommended ? "default" : "outline"}
                            onClick={() => handleSubscriptionPurchase(tier.tier_name)}
                            className="mt-1"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            {subscriptionData.subscribed ? 'Upgrade' : 'Subscribe'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {recommendedTierData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-xs">
                <p className="text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> The {recommendedTierData.tier_name} plan gives you {recommendedTierData.monthly_credits} credits/month plus access to premium features like {currentTier === 'free' ? 'community posting, market intelligence, and collaboration tools' : 'unlimited reports, API access, and advanced analytics'}.
                </p>
              </div>
            )}
          </div>

          {/* Feature Costs Reference */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs">
            <h5 className="font-medium mb-2">Credit Usage Guide:</h5>
            <div className="space-y-1 text-muted-foreground">
              <div>• BizMap AI Message: {CREDIT_COSTS.AI_CHAT_MESSAGE} credit</div>
              <div>• Tech Stack Generation: {CREDIT_COSTS.TECH_STACK_GENERATION} credits</div>
              <div>• Product-Market Fit Analysis: {CREDIT_COSTS.PMF_ANALYSIS} credits</div>
              <div>• Insighta Test: {CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS} credits</div>
              <div>• Investor Matching: {CREDIT_COSTS.INVESTOR_MATCHING} credits</div>
              <div>• Launch Report: {CREDIT_COSTS.LAUNCH_REPORT} credits</div>
              <div>• Market Research: {CREDIT_COSTS.MARKET_RESEARCH} credits</div>
              <div>• Market Validation: {CREDIT_COSTS.MARKET_VALIDATION} credits</div>
              <div>• Financial Analysis: {CREDIT_COSTS.FINANCIAL_ANALYSIS} credits</div>
              <div>• Roadmap Generation: {CREDIT_COSTS.ROADMAP_GENERATION} credits</div>
              <div>• Sprint Task Generation: {CREDIT_COSTS.SPRINT_TASK_GENERATION} credits</div>
              <div>• PDF Export: {CREDIT_COSTS.PDF_EXPORT} credits</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}