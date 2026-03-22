import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle, Coins, Crown, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useCredits } from "@/hooks/useCredits";
import { CREDIT_PACK_OPTIONS, TIER_MONTHLY_CREDITS } from "@/config/constants";
import { toast } from "sonner";
import { trackActivity } from "@/lib/activity";

const TIER_LABELS: Record<string, string> = {
  free: "Rookie",
  creator: "Rising",
  professional: "Pro",
};

const SUBSCRIPTION_PRICES: Record<string, { monthly: number; yearly: number }> = {
  creator: { monthly: 32.99, yearly: 300 },
  professional: { monthly: 74.99, yearly: 750 },
};

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const purchaseType = searchParams.get("purchase_type") === "credit_pack" ? "credit_pack" : "subscription";
  const requestedTier = (searchParams.get("tier") || "free").toLowerCase();
  const billingCycle = searchParams.get("billing_cycle") === "yearly" ? "yearly" : "monthly";
  const packId = searchParams.get("pack_id") || "";
  const [verifying, setVerifying] = useState(true);

  const { refreshSubscription, subscriptionData } = useSubscription();
  const { refreshBalance, balance, monthlyQuota } = useCredits();

  const currentTier = useMemo(() => {
    const liveTier = subscriptionData?.subscription_tier?.toLowerCase();
    if (purchaseType === "subscription" && liveTier && liveTier !== "free") {
      return liveTier;
    }
    return requestedTier;
  }, [purchaseType, requestedTier, subscriptionData?.subscription_tier]);

  const pack = useMemo(
    () => CREDIT_PACK_OPTIONS.find((option) => option.id === packId),
    [packId]
  );

  useEffect(() => {
    const verifyPurchase = async () => {
      try {
        await refreshSubscription();
        await refreshBalance();

        if (purchaseType === "credit_pack") {
          toast.success("Credits added successfully!");
          try {
            await trackActivity("credits:purchased", { packId });
          } catch {}
        } else {
          toast.success("Subscription activated successfully!");
          try {
            await trackActivity("subscription:created", { tier: requestedTier, billingCycle });
          } catch {}
        }
      } catch (error) {
        console.error("Error verifying Stripe purchase:", error);
        toast.error("Please refresh the page to see your updated credits.");
      } finally {
        setVerifying(false);
      }
    };

    const timer = window.setTimeout(verifyPurchase, 1500);
    return () => window.clearTimeout(timer);
  }, [billingCycle, packId, purchaseType, refreshBalance, refreshSubscription, requestedTier]);

  const subscriptionPrice = SUBSCRIPTION_PRICES[currentTier];
  const displayTierLabel = TIER_LABELS[currentTier] || "Plan";
  const displayMonthlyCredits = TIER_MONTHLY_CREDITS[currentTier as keyof typeof TIER_MONTHLY_CREDITS] ?? 0;
  const totalAvailable = balance + monthlyQuota;

  const title = purchaseType === "credit_pack" ? "Credits Added" : "Subscription Successful";
  const subtitle = purchaseType === "credit_pack"
    ? `Your ${pack?.credits ?? ""} credit top-up is being applied to your account.`
    : `Welcome to ${displayTierLabel}. Your plan upgrade is now active.`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{title} | Creatives Takeover</title>
        <meta
          name="description"
          content={purchaseType === "credit_pack"
            ? "Your credit purchase is being applied to your Creatives Takeover account."
            : "Your subscription is active and your plan credits are ready in Creatives Takeover."}
        />
      </Helmet>

      <Navigation />

      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="text-muted-foreground text-lg">{subtitle}</p>
            </div>

            <Card className="text-left">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  {purchaseType === "credit_pack" ? (
                    <>
                      <Coins className="h-5 w-5 text-primary" />
                      Credit Pack Confirmed
                    </>
                  ) : (
                    <>
                      <Crown className="h-5 w-5 text-primary" />
                      {displayTierLabel} Plan Active
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {verifying ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying your purchase...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    {purchaseType === "credit_pack" ? (
                      <>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-primary">+{pack?.credits ?? 0}</div>
                          <div className="text-sm text-muted-foreground">Purchased credits</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold">${pack?.price.toFixed(2) ?? "0.00"}</div>
                          <div className="text-sm text-muted-foreground">{pack?.label ?? "Credit Pack"}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
                          <div className="text-sm text-muted-foreground">Available now</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-primary">{displayMonthlyCredits}</div>
                          <div className="text-sm text-muted-foreground">Credits per month</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold">
                            ${subscriptionPrice ? subscriptionPrice[billingCycle] : 0}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {billingCycle === "yearly" ? "Yearly billing" : "Monthly billing"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
                          <div className="text-sm text-muted-foreground">Available now</div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium">What happens next</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {purchaseType === "credit_pack" ? (
                      <>
                        <Badge variant="outline">Purchased credits go to your persistent balance</Badge>
                        <Badge variant="outline">Top-up credits never expire</Badge>
                        <Badge variant="outline">Monthly plan quota stays separate</Badge>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">{displayMonthlyCredits} credits per month</Badge>
                        <Badge variant="outline">{displayTierLabel} feature access unlocked</Badge>
                        <Badge variant="outline">Credits refresh on your billing cycle</Badge>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {purchaseType === "credit_pack"
                      ? "Your balance has been refreshed. If the number still looks stale, give Stripe a few seconds and refresh once."
                      : "Your plan and credit balance have been refreshed from the platform billing system."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild>
                      <Link to="/bizmap-ai">
                        Start Using BizMap AI
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/pricing">
                        View Plans
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
