import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Crown, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useCredits } from "@/hooks/useCredits";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { trackActivity } from "@/lib/activity";
import { attributeContextualConversion } from "@/lib/contextualUpgrade";

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const tier = searchParams.get("tier") || "starter";
  const isCreditPack = searchParams.get("purchase_type") === "credit_pack";
  const billingCycle = searchParams.get("billing_cycle") === "yearly" ? "yearly" : "monthly";
  const returnTo = searchParams.get("return_to") === "/first-customer-sprint" ? "/first-customer-sprint" : "/dashboard";
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const { refreshSubscription } = useSubscription();
  const { refreshBalance, balance, totalAvailable } = useCredits();

  // Credit-pack purchases complete at Stripe (no subscription state to verify),
  // so attribute their conversion once on arrival. Subscription upgrades are
  // attributed inside the verification branch below.
  useEffect(() => {
    if (searchParams.get("purchase_type") === "credit_pack") {
      attributeContextualConversion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const verifySubscription = async () => {
      setVerifying(true);
      setVerifyError(false);

      if (isCreditPack) {
        const checkoutSessionId = searchParams.get("session_id");
        if (!checkoutSessionId) {
          setVerifyError(true);
          setVerifying(false);
          return;
        }

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const { data, error } = await supabase.functions.invoke("credit-service", {
              body: { action: "getHistory", limit: 50 },
            });

            if (error) throw error;
            const purchase = (data?.history ?? []).find((transaction: {
              tx_type?: string;
              metadata?: Record<string, unknown>;
            }) =>
              transaction.tx_type === "purchase" &&
              transaction.metadata?.stripeSessionId === checkoutSessionId,
            );

            if (purchase) {
              await refreshBalance();
              setVerified(true);
              setVerifying(false);
              return;
            }
          } catch (error) {
            console.error(`Credit-pack verification attempt ${attempt} failed:`, error);
          }

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        setVerifyError(true);
        setVerifying(false);
        return;
      }

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const refreshedSubscription = await refreshSubscription();
          await refreshBalance();

          if (refreshedSubscription?.subscribed) {
            setVerified(true);
            toast.success("Subscription activated successfully!");
            try {
              await trackActivity("subscription:created", { tier });
            } catch (activityError) {
              console.warn("Unable to track subscription activity:", activityError);
            }
            // Close the loop: if this upgrade was driven by a contextual prompt
            // CTA within the last hour, log the conversion with the original
            // trigger and elapsed time (feeds prompt-to-conversion + time-to-upgrade).
            attributeContextualConversion({ currentPlan: tier });
            setVerifying(false);
            return;
          }

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Subscription verification attempt ${attempt} failed:`, error);
          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      setVerifyError(true);
      setVerifying(false);
    };

    const timer = setTimeout(verifySubscription, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreditPack, retryCount]);

  const getTierInfo = (tierName: string) => {
    const tiers = {
      starter: { name: "Starter", credits: 100, monthly: 9, yearly: 79 },
      rising: { name: "Rising", credits: 250, monthly: 29, yearly: 239 },
      pro: { name: "Pro", credits: 600, monthly: 65, yearly: 589 },
      basic: { name: "Starter", credits: 100, monthly: 9, yearly: 79 },
      premium: { name: "Rising", credits: 250, monthly: 29, yearly: 239 },
      enterprise: { name: "Pro", credits: 600, monthly: 65, yearly: 589 },
    };
    return tiers[tierName as keyof typeof tiers] || tiers.starter;
  };

  const tierInfo = getTierInfo(tier);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Creatives Takeover</title>
        <meta
          name="description"
          content="Your BizMap AI subscription is now active. Start using your monthly credits to generate launch reports and assets."
        />
      </Helmet>

      <Navigation />

      <main className="flex-1 pt-header-offset pb-12">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            {verifying && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <h1 className="text-3xl font-bold">{isCreditPack ? "Adding your credits..." : "Activating your plan..."}</h1>
                <p className="text-muted-foreground text-lg">
                  Please wait while we confirm {isCreditPack ? "your credit purchase" : "your subscription"} with Stripe.
                </p>
              </div>
            )}

            {!verifying && verifyError && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-warning-subtle rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-warning" />
                  </div>
                  <h1 className="text-3xl font-bold">Confirming your {isCreditPack ? "credit purchase" : "subscription"}</h1>
                  <p className="text-muted-foreground text-lg">
                    We couldn't confirm this automatically. This sometimes happens when Stripe takes
                    a moment to process. If you were charged, please check again in a moment.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => setRetryCount((c) => c + 1)}>
                    <Loader2 className="w-4 h-4 mr-2" />
                    Check Again
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/contact">Contact Support</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </div>
            )}

            {!verifying && verified && isCreditPack && (
              <>
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-success-subtle rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h1 className="text-3xl font-bold">Credits added successfully</h1>
                  <p className="text-muted-foreground text-lg">Your purchase is complete and the credits are now available in your wallet.</p>
                </div>
                <Card><CardContent className="space-y-4 pt-6"><p className="text-3xl font-bold text-primary">{totalAvailable}</p><p className="text-sm text-muted-foreground">Current available credits</p><Button asChild><Link to={returnTo}>{returnTo === '/first-customer-sprint' ? 'Return to the sprint' : 'Return to dashboard'}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>
              </>
            )}

            {!verifying && verified && !isCreditPack && (
              <>
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-success-subtle rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h1 className="text-3xl font-bold">Subscription Successful!</h1>
                  <p className="text-muted-foreground text-lg">
                    Welcome to BizMap AI {tierInfo.name}! Your subscription is now active.
                  </p>
                </div>

                <Card className="text-left">
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      {tierInfo.name} Plan Active
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-primary">
                          {tierInfo.credits}
                        </div>
                        <div className="text-sm text-muted-foreground">Credits per month</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">${tierInfo[billingCycle]}</div>
                        <div className="text-sm text-muted-foreground">{billingCycle === 'yearly' ? 'Annual billing' : 'Monthly billing'}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-success">{balance}</div>
                        <div className="text-sm text-muted-foreground">Available now</div>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <h3 className="font-medium">What you get:</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span>{tierInfo.credits} credits every month</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span>
                            Generate {Math.floor(tierInfo.credits / 10)} launch reports per month
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span>
                            Create {Math.floor(tierInfo.credits / 5)} marketing assets per month
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span>Your plan's model access and research limits</span>
                        </li>
                      </ul>
                    </div>

                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Your credits have been added to your account and will automatically renew each
                        month.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button asChild>
                          <Link to="/bizmap-ai">
                            Start Using BizMap AI
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link to="/pricing#credit-packs">View Credit Analytics</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Generate Your First Launch Report</h4>
                        <p className="text-sm text-muted-foreground">
                          Use BizMap AI to create a comprehensive business plan with market analysis
                          and validation steps.
                        </p>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/bizmap-ai">Start Now</Link>
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Manage Your Subscription</h4>
                        <p className="text-sm text-muted-foreground">
                          Update billing, change plans, or cancel anytime through your account
                          dashboard.
                        </p>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/account">Manage</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Need help getting started? Check out our guides and tutorials.</p>
                  <div className="flex justify-center gap-4">
                    <Link to="/resources" className="hover:underline">
                      Resources
                    </Link>
                    <span>&bull;</span>
                    <Link to="/contact" className="hover:underline">
                      Contact Support
                    </Link>
                    <span>&bull;</span>
                    <Link to="/faq" className="hover:underline">
                      FAQ
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
