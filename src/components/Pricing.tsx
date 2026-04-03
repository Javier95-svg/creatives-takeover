import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Crown, Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Stripe Payment Links mapping by tier and billing cycle
const PAYMENT_LINKS: Record<string, Record<string, string>> = {
  // New tier names
  rising: {
    monthly: "https://buy.stripe.com/aFacN67Sxg8T9b80bh0VO00",
    yearly: "https://buy.stripe.com/3cIdRa7SxcWH1IG6zF0VO01",
  },
  pro: {
    monthly: "https://buy.stripe.com/cNifZi0q5f4P7303nt0VO02",
    yearly: "https://buy.stripe.com/4gMbJ2dcR09V1IGf6b0VO03",
  },
  // Legacy names (backward compat)
  creator: {
    monthly: "https://buy.stripe.com/aFacN67Sxg8T9b80bh0VO00",
    yearly: "https://buy.stripe.com/3cIdRa7SxcWH1IG6zF0VO01",
  },
  professional: {
    monthly: "https://buy.stripe.com/cNifZi0q5f4P7303nt0VO02",
    yearly: "https://buy.stripe.com/4gMbJ2dcR09V1IGf6b0VO03",
  },
};

// Get payment link for a given tier and billing cycle
const getPaymentLink = (
  tierName: string,
  billingCycle: "monthly" | "yearly"
): string | null => {
  const normalizedTier = tierName.trim().toLowerCase();
  const links = PAYMENT_LINKS[normalizedTier];
  if (!links) return null;
  return links[billingCycle] || null;
};

const Pricing = () => {
  const { tiers, loading, subscriptionData } = useSubscription();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Map tier names for display
  const getTierDisplayName = (tierName: string): string => {
    const displayNames: Record<string, string> = {
      rookie: "Rookie",
      rising: "Rising",
      pro: "Pro",
      // legacy fallbacks
      free: "Rookie",
      creator: "Rising",
      professional: "Pro",
    };
    return displayNames[tierName] || tierName;
  };

  // Get pricing based on billing cycle
  const getPrice = (tierName: string): { price: number; period: string } => {
    if (tierName === "rookie" || tierName === "free") {
      return { price: 0, period: "" };
    }

    if (billingCycle === "yearly") {
      const yearlyPrices: Record<string, number> = {
        rising: 300, creator: 300,
        pro: 750, professional: 750,
      };
      return { price: yearlyPrices[tierName] || 0, period: "/year" };
    }

    // Monthly prices
    const monthlyPrices: Record<string, number> = {
      rising: 32.99, creator: 32.99,
      pro: 74.99, professional: 74.99,
    };
    return { price: monthlyPrices[tierName] || 0, period: "/month" };
  };

  // Define feature list per tier
  const getFeatures = (tierName: string): string[] => {
    const featureMap: Record<string, string[]> = {
      rookie: [
        "25 credits per month",
        "ICP Builder — free, no credits needed",
        "PMF Lab & Waitlist Maker (credit-based)",
        "Insighta Test & Stories — full access",
        "VC Search & Accelerator Hunt — browse only",
        "Discovery Calls — 10 credits per call",
        "Community — read-only",
      ],
      rising: [
        "100 credits per month",
        "ICP Builder, Waitlist Maker, PMF Lab",
        "Tech Stack Builder, MVP Builder, GTM Strategist",
        "Email Templates & Pitch Deck Analyzer",
        "3 free discovery calls/month (then 10 credits)",
        "3 VC Search & Accelerator profile views/month",
        "Full community access — mentors & co-founders",
        "Full Prompt Library",
      ],
      pro: [
        "300 credits per month",
        "Everything in Rising",
        "Unlimited discovery calls",
        "Unlimited VC & Accelerator profile views",
        "Angels Community — exclusive access",
        "WhatsApp Founders Group — private network",
        "Priority support",
      ],
    };
    // legacy name fallback
    return featureMap[tierName] || featureMap[tierName === 'creator' ? 'rising' : tierName === 'professional' ? 'pro' : 'rookie'] || [];
  };

  // Get target audience description
  const getTargetAudience = (tierName: string) => {
    const audiences: Record<string, string> = {
      rookie: "Explore the platform and validate your idea",
      rising: "Build your startup with all 7 tools",
      pro: "Scale with unlimited access and an exclusive founder network",
      free: "Explore the platform and validate your idea",
      creator: "Build your startup with all 7 tools",
      professional: "Scale with unlimited access and an exclusive founder network",
    };
    return audiences[tierName] || "";
  };

  // Get subtitle for each tier
  const getSubtitle = (tierName: string) => {
    const subtitles: Record<string, string> = {
      rookie: "Start",
      rising: "Build",
      pro: "Scale",
      free: "Start",
      creator: "Build",
      professional: "Scale",
    };
    return subtitles[tierName] || "";
  };

  const getTitleAndCTA = (tierName: string) => {
    const details: Record<string, { title: string; cta: string }> = {
      rookie: { title: "Get Started", cta: "Start Free" },
      rising: { title: "Build Your Startup", cta: "Upgrade to Rising" },
      pro: { title: "Scale & Connect", cta: "Upgrade to Pro" },
      free: { title: "Get Started", cta: "Start Free" },
      creator: { title: "Build Your Startup", cta: "Upgrade to Rising" },
      professional: { title: "Scale & Connect", cta: "Upgrade to Pro" },
    };
    return details[tierName] || { title: "Get Started", cta: "Subscribe" };
  };

  const handleSubscribe = (tierName: string) => {
    if (tierName === "rookie" || tierName === "free") {
      if (!user) {
        window.location.href = "/auth";
      }
      return;
    }

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const paymentLink = getPaymentLink(tierName, billingCycle);
    if (!paymentLink) {
      toast.error("Unable to find payment link for this plan. Please try again.");
      return;
    }

    const checkoutWindow = window.open(paymentLink, "_blank", "noopener,noreferrer");
    if (!checkoutWindow) {
      toast.error("Please allow popups to open checkout in a new tab.");
      return;
    }

    toast.success("Opening secure checkout in a new tab...");
  };

  if (loading) {
    return (
      <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading pricing plans...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Pricing Section */}
      <section className="relative overflow-hidden pt-28 pb-section-mobile md:pt-32 lg:pt-36 lg:pb-section-desktop" id="pricing-plans">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight mb-6 gradient-text font-space-grotesk">
              Choose Your Plan
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-poppins">
              Start taking action and move your ideas forward with plans that scale as you do.
            </p>

            {/* Billing Cycle Tabs */}
            <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as "monthly" | "yearly")} className="inline-block">
              <TabsList className="grid w-full grid-cols-2 rounded-full border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur">
                <TabsTrigger className="rounded-full text-sm font-medium font-poppins data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="monthly">Monthly</TabsTrigger>
                <TabsTrigger className="rounded-full text-sm font-medium font-poppins data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="yearly">
                  Yearly
                  <Badge variant="secondary" className="ml-1.5 sm:ml-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px] sm:text-xs px-1.5 sm:px-2.5">
                    <span className="hidden sm:inline">Save up to </span>24%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto items-start">
            {tiers.map((tier, index) => {
              const { cta } = getTitleAndCTA(tier.tier_name);
              const features = getFeatures(tier.tier_name);
              const targetAudience = getTargetAudience(tier.tier_name);
              const subtitle = getSubtitle(tier.tier_name);
              const isCurrentPlan = subscriptionData?.subscription_tier === tier.tier_name;
              const isPopular = tier.tier_name === "rising" || tier.tier_name === "creator";
              const { price, period } = getPrice(tier.tier_name);

              return (
                <div
                  key={tier.tier_name}
                  className={`relative rounded-2xl border border-border/60 bg-card/80 p-6 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col backdrop-blur ${isCurrentPlan
                    ? "border-green-500/60 ring-1 ring-green-500/30 shadow-md"
                    : isPopular
                      ? "border-primary/60 ring-1 ring-primary/30 shadow-md"
                      : (tier.tier_name === "pro" || tier.tier_name === "professional")
                        ? "border-red-500/60 ring-1 ring-red-500/30 shadow-md"
                        : "border-border/60"
                    }`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  {/* Current Plan or Popular Badge */}
                  {((isCurrentPlan && user) || isPopular) && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className={`px-3 py-1 text-xs font-medium ${isCurrentPlan
                        ? "bg-green-600 text-white"
                        : "bg-primary text-primary-foreground"
                        }`}>
                        {isCurrentPlan ? (<> <Crown className="w-3 h-3 mr-1 inline" /> Your Plan </>) : (<> <Star className="w-3 h-3 mr-1 inline fill-current" /> Suggested </>)}
                      </Badge>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold mb-1 capitalize tracking-tight font-space-grotesk">{getTierDisplayName(tier.tier_name)}</h3>
                    {subtitle && (
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3 font-poppins">{subtitle}</p>
                    )}
                    <div className="mb-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl sm:text-5xl font-semibold tracking-tight font-space-grotesk tabular-nums">
                          ${price === 0 ? "0" : price.toFixed(2)}
                        </span>
                        {period && (
                          <span className="text-muted-foreground text-base font-poppins">{period}</span>
                        )}
                      </div>
                      {billingCycle === "yearly" && tier.tier_name !== "free" && tier.tier_name !== "rookie" && (
                        <div className="text-sm text-green-600 dark:text-green-400 mt-1 font-poppins">
                          ${(price / 12).toFixed(2)}/month billed annually
                        </div>
                      )}
                      {tier.monthly_credits > 0 && (
                        <div className="text-sm text-muted-foreground mt-2 font-poppins">
                          {tier.tier_name === "free" ? 25 : tier.monthly_credits} credits/month
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-6 font-poppins">
                      {targetAudience}
                    </p>
                  </div>

                  {/* Plan Highlights */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4 font-poppins">Plan highlights:</p>
                    <div className="space-y-3">
                      {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground leading-relaxed font-poppins">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSubscribe(tier.tier_name)}
                    disabled={!!(isCurrentPlan && user)}
                    className={`w-full rounded-full py-3 px-4 font-semibold font-poppins transition-all shadow-sm hover:shadow-md ${isCurrentPlan
                      ? "bg-green-600 text-white cursor-default hover:bg-green-700"
                      : isPopular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                      }`}
                  >
                    {isCurrentPlan && user ? "Current Plan" : !user && tier.tier_name === "free" ? "Start Now" : cta}
                  </Button>
                </div>
              );
            })}
          </div>

        </div>
      </section>
    </>
  );
};

export default Pricing;
