import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Coins, CreditCard, TrendingUp, Loader2, Zap, Rocket, Flame } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { getNextPlan, normalizePlan, PLAN_SUMMARIES, type Plan } from "@/config/planPermissions";
import {
  normalizePlanId,
  trackJourneyUpgradePromptClicked,
  trackJourneyUpgradePromptDismissed,
  trackJourneyUpgradePromptShown,
  trackUpgradeClicked,
} from "@/lib/analytics";
import {
  trackContextualUpgradeImpression,
  trackContextualUpgradeCtaClicked,
  trackContextualUpgradeDismissed,
  type ContextualUpgradeTrigger,
} from "@/lib/contextualUpgrade";
import { toast } from "sonner";

const TOP_UP_PACKAGES = [
  {
    label: "Starter Pack",
    credits: 20,
    url: "https://buy.stripe.com/dRm5kE4Gl9Kv8746zF0VO0h",
    icon: Zap,
  },
  {
    label: "Boost Pack",
    credits: 40,
    url: "https://buy.stripe.com/aFa4gAegV8Grafc3nt0VO0i",
    icon: Rocket,
  },
  {
    label: "Power Pack",
    credits: 60,
    url: "https://buy.stripe.com/8x29AUc8N1dZevsgaf0VO0j",
    icon: Flame,
  },
] as const;

function openTopUp(url: string, email?: string | null, userId?: string) {
  try {
    const checkoutUrl = new URL(url);
    if (email) checkoutUrl.searchParams.set("prefilled_email", email);
    if (userId) checkoutUrl.searchParams.set("client_reference_id", userId);
    window.location.assign(checkoutUrl.toString());
  } catch {
    window.location.assign(url);
  }
}

type UpgradeReason = "credits" | "limit" | "feature";

export interface UpgradePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: UpgradeReason;
  featureName?: string;
  requiredTier?: Plan;
  requiredCredits?: number;
  limit?: number;
  limitLabel?: string;
  description?: string;
  journeyTrigger?: string;
  sourceTool?: string;
  /**
   * Canonical contextual-upgrade trigger. When set, the dialog auto-logs
   * impression / CTA / dismiss through the unified taxonomy in
   * `@/lib/contextualUpgrade`, so prompt-to-conversion can be measured per
   * trigger and the resulting conversion attributed after checkout.
   */
  contextualTrigger?: ContextualUpgradeTrigger;
  /** One plain-language line of what the user was doing when blocked. */
  contextLine?: string;
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
  journeyTrigger,
  sourceTool,
  contextualTrigger,
  contextLine,
  onUpgrade,
}: UpgradePromptDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Mounted globally (via UpgradePromptProvider) but only needs the checkout
  // action + the user's plan, never the tiers list — skip the tiers fetch so it
  // doesn't fire subscription_tiers on every route (incl. anonymous ones).
  const { createCheckout, subscriptionData } = useSubscription({ fetchTiers: false });
  const { currentTier } = useFeatureGating();
  const { balance } = useCredits();
  const normalizedCurrentTier = normalizePlan(currentTier);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const recommendedTier = useMemo(() => {
    if (requiredTier) return requiredTier;
    return getNextPlan(normalizedCurrentTier);
  }, [requiredTier, normalizedCurrentTier]);

  const tierDetails = PLAN_SUMMARIES[recommendedTier];
  const featureLabel = featureName || "this feature";
  const limitCopy = limitLabel || featureLabel;
  const isStarterRecommendation = recommendedTier === "starter";

  const title = useMemo(() => {
    if (reason === "credits") return "You're out of credits";
    if (reason === "limit") return "Monthly limit reached";
    return "This is the next journey layer";
  }, [reason]);

  const defaultDescription = useMemo(() => {
    if (!tierDetails) {
      return "Upgrade your plan to unlock more credits and premium features.";
    }
    if (reason === "limit" && typeof limit === "number") {
      return `You've used all ${limit} ${limitCopy} this month. Upgrade to ${tierDetails.name} to keep exploring.`;
    }
    if (reason === "credits" && typeof requiredCredits === "number") {
      return `You need ${requiredCredits} credits to use ${featureLabel}. Upgrade to ${tierDetails.name} for ${tierDetails.monthlyCredits} credits/month and keep moving.`;
    }
    if (isStarterRecommendation) {
      return `Starter is your validation step: ${tierDetails.monthlyCredits} credits/month, PMF Lab, Email Templates, and deeper research access.`;
    }
    return `Upgrade to ${tierDetails.name} to unlock ${featureLabel} plus ${tierDetails.monthlyCredits} credits each month.`;
  }, [featureLabel, isStarterRecommendation, limit, limitCopy, reason, tierDetails, requiredCredits]);

  const canUpgrade = Boolean(tierDetails) && recommendedTier !== normalizedCurrentTier;
  const journeyTargetPlan = recommendedTier === "rookie" ? "starter" : recommendedTier;

  const contextualOutcome = reason === "credits" ? "credits" : "plan";
  const contextualBase = useMemo(
    () => ({
      trigger: contextualTrigger!,
      sourceTool,
      currentPlan: normalizedCurrentTier,
      targetPlan: journeyTargetPlan,
      outcome: contextualOutcome as "plan" | "credits",
      creditsRemaining: reason === "credits" ? balance : undefined,
      context: contextLine ?? featureName,
    }),
    [balance, contextLine, contextualOutcome, contextualTrigger, featureName, journeyTargetPlan, normalizedCurrentTier, reason, sourceTool],
  );
  const vcViewText = tierDetails?.vcViewLimit === Infinity
    ? "Unlimited VC views"
    : `${tierDetails?.vcViewLimit} VC views/month`;

  const handleUpgrade = async () => {
    trackUpgradeClicked({
      from_plan: normalizePlanId(normalizedCurrentTier),
      to_plan: normalizePlanId(recommendedTier),
      location: "feature_gate",
    });

    if (contextualTrigger) {
      trackContextualUpgradeCtaClicked({ ...contextualBase, outcome: "plan" });
    }

    if (!canUpgrade) {
      navigate("/pricing");
      onOpenChange(false);
      return;
    }

    if (journeyTrigger) {
      trackJourneyUpgradePromptClicked({
        trigger: journeyTrigger,
        current_plan: normalizePlanId(normalizedCurrentTier),
        target_plan: normalizePlanId(journeyTargetPlan),
        source_tool: sourceTool,
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    }

    setIsCheckingOut(true);
    try {
      await createCheckout(recommendedTier, undefined, "monthly");
      onUpgrade?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Checkout failed:', err);
      toast.error('Unable to start checkout. Please try again or contact support.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    if (!open || !journeyTrigger || !tierDetails) return;
    trackJourneyUpgradePromptShown({
      trigger: journeyTrigger,
      current_plan: normalizedCurrentTier,
      target_plan: journeyTargetPlan,
      source_tool: sourceTool,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [journeyTargetPlan, journeyTrigger, normalizedCurrentTier, open, sourceTool, tierDetails]);

  useEffect(() => {
    if (!open || !contextualTrigger) return;
    trackContextualUpgradeImpression(contextualBase);
  }, [open, contextualTrigger, contextualBase]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open && journeyTrigger) {
      try {
        window.localStorage.setItem(`ct_journey_upgrade_${journeyTrigger}`, String(Date.now()));
      } catch {
        // Ignore localStorage failures.
      }
      trackJourneyUpgradePromptDismissed({
        trigger: journeyTrigger,
        source_tool: sourceTool,
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    }
    if (!nextOpen && open && contextualTrigger) {
      trackContextualUpgradeDismissed(contextualBase);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
          {contextLine ? (
            <p className="mt-1 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              {contextLine}
            </p>
          ) : null}
        </DialogHeader>

        {reason === "credits" ? (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <Coins className="h-3.5 w-3.5 mr-1.5" />
                  {balance} credits remaining
                </Badge>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Top Up Credits
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {TOP_UP_PACKAGES.map(({ label, credits, url, icon: Icon }) => (
                    <button
                      key={label}
                      onClick={() => {
                        if (contextualTrigger) {
                          trackContextualUpgradeCtaClicked({ ...contextualBase, outcome: "credits", context: label });
                        }
                        handleOpenChange(false);
                        openTopUp(url, user?.email, user?.id);
                      }}
                      className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {label}
                      </span>
                      <Badge variant="outline">+{credits} credits</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => handleOpenChange(false)}
              >
                Maybe later
              </Button>
              <Button
                className="w-full sm:w-auto gap-2"
                onClick={() => {
                  if (contextualTrigger) {
                    trackContextualUpgradeCtaClicked({ ...contextualBase, outcome: "plan" });
                  }
                  navigate("/pricing");
                  handleOpenChange(false);
                }}
              >
                <Crown className="h-4 w-4" />
                Upgrade Plan
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-5">
              {tierDetails && (
                <Card className={isStarterRecommendation ? "border-2 border-info/70 bg-info/5" : "border-primary/30 bg-primary/5"}>
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{tierDetails.name} Plan</span>
                          <Badge className={isStarterRecommendation ? "bg-warning text-warning text-xs" : "text-xs"}>
                            {isStarterRecommendation ? "Most popular" : "Recommended"}
                          </Badge>
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
                      <Badge variant="outline">{tierDetails.monthlyCredits} credits/month</Badge>
                      <Badge variant="outline">{vcViewText}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (journeyTrigger) {
                    trackJourneyUpgradePromptClicked({
                      trigger: journeyTrigger,
                      current_plan: normalizePlanId(normalizedCurrentTier),
                      target_plan: normalizePlanId(journeyTargetPlan),
                      source_tool: sourceTool,
                      route: typeof window !== "undefined" ? window.location.pathname : undefined,
                    });
                  }
                  trackUpgradeClicked({
                    from_plan: normalizePlanId(normalizedCurrentTier),
                    to_plan: normalizePlanId(recommendedTier),
                    location: "feature_gate",
                  });
                  if (contextualTrigger) {
                    trackContextualUpgradeCtaClicked({ ...contextualBase, outcome: "plan" });
                  }
                  navigate("/pricing");
                  onOpenChange(false);
                }}
              >
                Compare Plans
              </Button>
              <Button onClick={handleUpgrade} className="gap-2" disabled={isCheckingOut}>
                {isCheckingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {isStarterRecommendation ? "Upgrade to Starter - $9/mo" : subscriptionData.subscribed ? "Upgrade Now" : "Get Started"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePromptDialog;
