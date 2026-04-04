import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Sparkles, Star } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type BillingCycle = "monthly" | "yearly";
type PlanKey = "rookie" | "starter" | "rising" | "pro";

const PLAN_PAYMENT_LINKS: Record<Exclude<PlanKey, "rookie">, Record<BillingCycle, string>> = {
  starter: {
    monthly: "https://buy.stripe.com/cNibJ22yd4qb2MK8HN0VO0R",
    yearly: "https://buy.stripe.com/cNidRadcR5ufafc7DJ0VO0S",
  },
  rising: {
    monthly: "https://buy.stripe.com/bJe00k5KpcWH9b81fl0VO0P",
    yearly: "https://buy.stripe.com/3cI3cw1u9g8Tfzw0bh0VO0Q",
  },
  pro: {
    monthly: "https://buy.stripe.com/8x23cw1u96yjfzw4rx0VO0N",
    yearly: "https://buy.stripe.com/6oU4gA4Glf4P5YW8HN0VO0O",
  },
};

const PLAN_CONFIG: Array<{
  key: PlanKey;
  title: string;
  subtitle: string;
  audience: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyEquivalent: string;
  savings: string | null;
  credits: number;
  highlight?: string;
  features: string[];
}> = [
  {
    key: "rookie",
    title: "Rookie",
    subtitle: "Just getting started",
    audience: "Explore the platform, define the problem, and get your first traction signal.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyEquivalent: "Free forever",
    savings: null,
    credits: 25,
    features: [
      "Dashboard Rookie Mode",
      "ICP Builder (free)",
      "Waitlist Maker (uses credits)",
      "PMF Lab, MVP Builder, Tech Stack Builder, GTM Strategist, and Directories (preview only)",
      "1 free discovery call/month (mentorship)",
      "1 Find a Co-Founder post/month",
      "VC Search & Accelerator Hunt (browse only)",
      "Prompt Library (free models only)",
      "Insighta Test",
      "Newspaper",
    ],
  },
  {
    key: "starter",
    title: "Starter",
    subtitle: "Building momentum",
    audience: "Bridge the gap between free exploration and full startup-building momentum.",
    monthlyPrice: 9,
    yearlyPrice: 79,
    yearlyEquivalent: "$6.58/mo",
    savings: "Save 27%",
    credits: 50,
    features: [
      "Dashboard Starter Mode",
      "ICP Builder (free)",
      "Waitlist Maker + PMF Lab (use credits)",
      "MVP Builder, Tech Stack Builder, GTM Strategist, and Directories (preview only)",
      "2 free discovery calls/month (mentorship)",
      "2 Find a Co-Founder posts/month",
      "VC Search & Accelerator Hunt (2 profile views/monthly)",
      "Email Templates (full access)",
      "Prompt Library (free models only)",
      "Insighta Test",
      "Newspaper",
    ],
  },
  {
    key: "rising",
    title: "Rising",
    subtitle: "Actively building",
    audience: "The default plan for founders shipping, validating, and iterating every week.",
    monthlyPrice: 29,
    yearlyPrice: 239,
    yearlyEquivalent: "$19.92/mo",
    savings: "Save 31%",
    credits: 100,
    highlight: "Most Popular",
    features: [
      "Dashboard Rising Mode",
      "Waitlist Maker, PMF Lab, Tech Stack Builder, and Directories included",
      "MVP Builder + GTM Strategist (use credits)",
      "3 free discovery calls/month (mentorship)",
      "Unlimited Find a Co-Founder posts",
      "VC Search & Accelerator Hunt (5 profile views/monthly)",
      "Email Templates (full access)",
      "Pitch Deck Analyzer (included)",
      "Prompt Library (full access)",
      "Insighta Test",
      "Newspaper",
    ],
  },
  {
    key: "pro",
    title: "Pro",
    subtitle: "Fundraising and scaling",
    audience: "For founders running faster, fundraising actively, and needing priority support.",
    monthlyPrice: 65,
    yearlyPrice: 589,
    yearlyEquivalent: "$49.08/mo",
    savings: "Save 25%",
    credits: 300,
    features: [
      "Dashboard Pro Mode",
      "Find Your Angel",
      "Waitlist Maker, PMF Lab, Tech Stack Builder, and Directories included",
      "MVP Builder + GTM Strategist (use credits)",
      "Unlimited discovery calls (mentorship)",
      "Unlimited Find a Co-Founder posts",
      "VC Search & Accelerator Hunt (unlimited profile views)",
      "Email Templates (full access)",
      "Pitch Deck Analyzer (included)",
      "Prompt Library (full access)",
      "Insighta Test",
      "Newspaper",
    ],
  },
];

const PLAN_CARD_STYLES: Record<PlanKey, { border: string; ring: string; button: string }> = {
  rookie: {
    border: "border-green-500/60",
    ring: "ring-green-500/30",
    button: "border-green-600 bg-green-600 text-white hover:bg-green-700 hover:border-green-700",
  },
  starter: {
    border: "border-yellow-500/60",
    ring: "ring-yellow-500/30",
    button: "border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-600 hover:border-yellow-600",
  },
  rising: {
    border: "border-blue-500/60",
    ring: "ring-blue-500/30",
    button: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700",
  },
  pro: {
    border: "border-red-500/50",
    ring: "ring-red-500/20",
    button: "border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700",
  },
};

const normalizeTierName = (tierName?: string | null): PlanKey => {
  const normalized = (tierName || "").trim().toLowerCase();
  if (normalized === "starter") return "starter";
  if (normalized === "creator" || normalized === "rising") return "rising";
  if (normalized === "professional" || normalized === "pro") return "pro";
  return "rookie";
};

const formatPrice = (value: number) => {
  if (value === 0) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

export default function Pricing() {
  const { loading, actionLoading, subscriptionData } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const currentTier = normalizeTierName(subscriptionData?.subscription_tier);

  const handleSubscribe = async (plan: PlanKey) => {
    if (user && currentTier === plan) {
      navigate("/account");
      return;
    }

    if (plan === "rookie") {
      if (user) {
        navigate("/dashboard");
      } else {
        window.location.href = "/auth";
      }
      return;
    }

    window.location.href = PLAN_PAYMENT_LINKS[plan][billingCycle];
  };

  if (loading) {
    return (
      <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground mt-4">Loading pricing plans...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden pt-28 pb-section-mobile md:pt-32 lg:pt-36 lg:pb-section-desktop" id="pricing-plans">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight mb-6 gradient-text font-space-grotesk">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 font-poppins">
            Four plans, clear credits, and a smoother path from first idea to fundraising momentum.
          </p>

          <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)} className="inline-block">
            <TabsList className="grid w-full grid-cols-2 rounded-full border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur">
              <TabsTrigger className="rounded-full text-sm font-medium font-poppins data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="monthly">
                Monthly
              </TabsTrigger>
              <TabsTrigger className="rounded-full text-sm font-medium font-poppins data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="yearly">
                Yearly
                <Badge variant="secondary" className="ml-2 rounded-full bg-green-500/10 text-green-600 border-green-500/20 text-xs px-2.5">
                  Save up to 31%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 justify-items-center md:grid-cols-2 xl:grid-cols-4 gap-8 xl:gap-12 max-w-[104rem] mx-auto items-start">
          {PLAN_CONFIG.map((plan, index) => {
            const isCurrentPlan = currentTier === plan.key;
            const isPopular = plan.key === "rising";
            const isPro = plan.key === "pro";
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const period = billingCycle === "yearly" ? "/year" : plan.monthlyPrice === 0 ? "" : "/month";
            const cardStyle = PLAN_CARD_STYLES[plan.key];

            return (
              <div
                key={plan.key}
                className={`relative w-full max-w-[320px] rounded-2xl border bg-card/80 p-6 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col backdrop-blur ${cardStyle.border} ${
                  isCurrentPlan || isPopular || isPro ? `ring-1 ${cardStyle.ring} shadow-md` : ""
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {((isCurrentPlan && user) || isPopular || plan.highlight) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`px-3 py-1 text-xs font-medium ${
                      isCurrentPlan
                        ? "bg-green-600 text-white"
                        : isPopular
                          ? "bg-primary text-primary-foreground"
                          : "bg-red-600 text-white"
                    }`}>
                      {isCurrentPlan ? <><Crown className="w-3 h-3 mr-1 inline" />Your Plan</> : isPopular ? <><Star className="w-3 h-3 mr-1 inline fill-current" />Most Popular</> : <><Sparkles className="w-3 h-3 mr-1 inline" />Premium</>}
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl sm:text-3xl font-semibold mb-1 tracking-tight font-space-grotesk">
                    {plan.title}
                  </h3>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3 font-poppins">
                    {plan.subtitle}
                  </p>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-semibold tracking-tight font-space-grotesk tabular-nums">
                        ${formatPrice(price)}
                      </span>
                      {period && (
                        <span className="text-muted-foreground text-base font-poppins">{period}</span>
                      )}
                    </div>
                    {billingCycle === "yearly" && plan.key !== "rookie" && (
                      <div className="text-sm text-green-600 mt-1 font-poppins">
                        {plan.yearlyEquivalent} billed annually
                      </div>
                    )}
                    {plan.savings && billingCycle === "yearly" && (
                      <div className="text-xs text-muted-foreground mt-1 font-poppins">{plan.savings}</div>
                    )}
                    <div className="text-sm text-muted-foreground mt-2 font-poppins">
                      {plan.credits} credits/month
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 font-poppins">
                    {plan.audience}
                  </p>
                </div>

                <div className="mb-6 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4 font-poppins">
                    Plan highlights
                  </p>
                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground/90 font-poppins leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className={`w-full ${cardStyle.button}`}
                  disabled={actionLoading}
                  onClick={() => void handleSubscribe(plan.key)}
                  variant="outline"
                >
                  {isCurrentPlan && user
                    ? "Manage Plan"
                    : plan.key === "rookie"
                      ? "Start Free"
                      : `Go ${plan.title}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
