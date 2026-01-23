import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Coins, CreditCard, TrendingUp } from "lucide-react";
import { CreditPriceList } from "@/components/CreditPriceList";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useCredits } from "@/hooks/useCredits";
import { CREDIT_COSTS, TIER_DETAILS } from "@/config/constants";

type UpgradeReason = "credits" | "limit" | "feature";

export interface UpgradePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: UpgradeReason;
  featureName?: string;
  requiredTier?: "creator" | "professional";
  requiredCredits?: number;
  limit?: number;
  limitLabel?: string;
  description?: string;
  onUpgrade?: () => void;
}

const UpgradePromptDialog = ({
  open,
  onOpenChange,
  reason = "feature",
  featureName,
  requiredTier,
  requiredCredits,
  limit,
  limitLabel,
  description,
  onUpgrade,
}: UpgradePromptDialogProps) => {
  const navigate = useNavigate();
  const { createCheckout, subscriptionData } = useSubscription();
  const { currentTier } = useFeatureGating();
  const { balance } = useCredits();

  const recommendedTier = useMemo(() => {
    if (requiredTier) return requiredTier;
    return currentTier === "free" ? "creator" : "professional";
  }, [requiredTier, currentTier]);

  const tierDetails = TIER_DETAILS[recommendedTier];
  const featureLabel = featureName || "this feature";
  const limitCopy = limitLabel || featureLabel;

  const title = useMemo(() => {
    if (reason === "credits") return "You're out of credits";
    if (reason === "limit") return "Monthly limit reached";
    return "Upgrade to keep going";
  }, [reason]);

  const defaultDescription = useMemo(() => {
    if (!tierDetails) {
      return "Upgrade your plan to unlock more credits and premium features.";
    }
    if (reason === "limit" && typeof limit === "number") {
      return `You've used all ${limit} ${limitCopy} this month. Upgrade to ${tierDetails.name} to keep exploring.`;
    }
    if (reason === "credits" && typeof requiredCredits === "number") {
      return `You need ${requiredCredits} credits to use ${featureLabel}. Upgrade to ${tierDetails.name} for ${tierDetails.credits} credits/month and keep moving.`;
    }
    return `Upgrade to ${tierDetails.name} to unlock ${featureLabel} plus ${tierDetails.credits} credits each month.`;
  }, [featureLabel, limit, limitCopy, reason, tierDetails, requiredCredits]);

  const canUpgrade = Boolean(tierDetails) && recommendedTier !== currentTier;
  const vcViewText = tierDetails?.vcViewLimit === -1
    ? "Unlimited VC views"
    : `${tierDetails?.vcViewLimit} VC views/month`;

  const handleUpgrade = async () => {
    if (!canUpgrade) {
      navigate("/pricing");
      onOpenChange(false);
      return;
    }
    await createCheckout(recommendedTier);
    onUpgrade?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {reason === "credits" && typeof requiredCredits === "number" && (
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">You have</div>
                    <Badge variant="secondary" className="mt-1">
                      <Coins className="h-3 w-3 mr-1" />
                      {balance} credits
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">-</div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">You need</div>
                    <Badge variant="outline" className="mt-1">
                      <Coins className="h-3 w-3 mr-1" />
                      {requiredCredits} credits
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {tierDetails && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{tierDetails.name} Plan</span>
                      <Badge className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tierDetails.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">${tierDetails.price}/mo</div>
                    <div className="text-xs text-muted-foreground">{tierDetails.credits} credits</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{tierDetails.credits} credits/month</Badge>
                  <Badge variant="outline">{vcViewText}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {reason === "credits" && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium mb-2 text-xs">Credit Usage Guide</h5>
              <CreditPriceList />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigate("/pricing");
              onOpenChange(false);
            }}
          >
            Compare Plans
          </Button>
          <Button onClick={handleUpgrade} className="gap-2">
            <CreditCard className="h-4 w-4" />
            {subscriptionData.subscribed ? "Upgrade Now" : "Get Started"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePromptDialog;
