import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Sparkles, Star } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { normalizePlanId, trackUpgradeClicked } from "@/lib/analytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { useLocation } from "react-router-dom";
import { PLAN_HIGHLIGHTS, PLAN_MONTHLY_CREDITS } from "@/config/planPermissions";
import { appendCheckoutIntentParam, redirectToCheckoutUrl, resolveCheckoutIntentUrl } from "@/lib/checkoutRedirect";
import { RevealGroup } from "@/components/animations/ScrollReveal";

type BillingCycle = "monthly" | "yearly";
type PlanKey = "rookie" | "starter" | "rising" | "pro";

const PLAN_CONFIG: Array<{
  key: PlanKey;
  title: string;
  outcomeLabel: string;
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
    outcomeLabel: "Clarify",
    subtitle: "Just getting started",
    audience: "Explore the platform, define the problem, and get your first traction signal.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyEquivalent: "Free forever",
    savings: null,
    credits: PLAN_MONTHLY_CREDITS.rookie,
    features: PLAN_HIGHLIGHTS.rookie,
  },
  {
    key: "starter",
    title: "Starter",
    outcomeLabel: "Validate",
    subtitle: "Building momentum",
    audience: "Bridge the gap between free exploration and full startup-building momentum.",
    monthlyPrice: 9,
    yearlyPrice: 79,
    yearlyEquivalent: "$6.58/mo",
    savings: "Save 27%",
    credits: PLAN_MONTHLY_CREDITS.starter,
    highlight: "Most Popular",
    features: PLAN_HIGHLIGHTS.starter,
  },
  {
    key: "rising",
    title: "Rising",
    outcomeLabel: "Build & Launch",
    subtitle: "Actively building",
    audience: "The default plan for founders shipping, validating, and iterating every week.",
    monthlyPrice: 29,
    yearlyPrice: 239,
    yearlyEquivalent: "$19.92/mo",
    savings: "Save 31%",
    credits: PLAN_MONTHLY_CREDITS.rising,
    features: PLAN_HIGHLIGHTS.rising,
  },
  {
    key: "pro",
    title: "Pro",
    outcomeLabel: "Fundraise & Scale",
    subtitle: "Fundraising and scaling",
    audience: "For founders running faster, fundraising actively, and needing priority support.",
    monthlyPrice: 65,
    yearlyPrice: 589,
    yearlyEquivalent: "$49.08/mo",
    savings: "Save 25%",
    credits: PLAN_MONTHLY_CREDITS.pro,
    features: PLAN_HIGHLIGHTS.pro,
  },
];

const PLAN_CARD_STYLES: Record<PlanKey, { border: string; ring: string; button: string; buttonVariant: "default" | "outline" }> = {
  // Single-accent system: cards stay neutral; only the recommended tier
  // (starter) carries the brand primary emphasis. Tier identity is conveyed
  // by name/price/badge, not by a per-tier color (see DESIGN_SYSTEM.md).
  rookie: {
    border: "border-border",
    ring: "ring-border",
    button: "",
    buttonVariant: "outline",
  },
  starter: {
    border: "border-2 border-primary/80",
    ring: "ring-primary/30",
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
    buttonVariant: "default",
  },
  rising: {
    border: "border-border",
    ring: "ring-border",
    button: "",
    buttonVariant: "outline",
  },
  pro: {
    border: "border-border",
    ring: "ring-border",
    button: "",
    buttonVariant: "outline",
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
  const { loading, subscriptionData } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { set: setAttribution } = useCTAAttribution();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [, startNavigation] = useTransition();

  const currentTier = normalizeTierName(subscriptionData?.subscription_tier);

  const handleSubscribe = async (plan: PlanKey) => {
    if (pendingPlan) return;
    setPendingPlan(plan);

    if (plan === "rookie") {
      if (user) {
        startNavigation(() => {
          navigate("/dashboard");
        });
      } else {
        setAttribution('pricing_rookie', location.pathname);
        startNavigation(() => {
          navigate("/signup?source=pricing_page&return=/dashboard");
        });
      }
      return;
    }

    trackUpgradeClicked({
      from_plan: normalizePlanId(currentTier),
      to_plan: normalizePlanId(plan),
      location: "pricing_page",
    });

    const checkoutIntent = `${plan}-${billingCycle}`;

    // Anonymous buyers must create an account first so the Stripe checkout
    // carries client_reference_id — otherwise the webhook can't attach the
    // subscription and the payment is orphaned. Signup consumes the stored
    // intent and forwards straight to Stripe.
    if (!user) {
      setAttribution(`pricing_${plan}`, location.pathname);
      startNavigation(() => {
        navigate(appendCheckoutIntentParam("/signup?source=pricing_page", checkoutIntent));
      });
      return;
    }

    const checkoutUrl = resolveCheckoutIntentUrl(checkoutIntent);

    if (checkoutUrl) {
      redirectToCheckoutUrl(checkoutUrl, user);
      return;
    }

    setPendingPlan(null);
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
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Four plans, clear credits, and a smoother path from first idea to fundraising momentum.
          </p>

          <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)} className="inline-block">
            <TabsList className="grid w-full grid-cols-2 rounded-full border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur">
              <TabsTrigger className="rounded-full text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="monthly">
                Monthly
              </TabsTrigger>
              <TabsTrigger className="rounded-full text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="yearly">
                Yearly
                <Badge variant="secondary" className="ml-2 rounded-full bg-success-subtle text-success border-success/30 text-xs px-2.5">
                  Save up to 31%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <RevealGroup className="grid grid-cols-1 justify-items-center sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-9 max-w-[124rem] mx-auto items-start" variant="card">
          {PLAN_CONFIG.map((plan, index) => {
            const isCurrentPlan = currentTier === plan.key;
            const isPopular = plan.key === "starter";
            const isPro = plan.key === "pro";
            const isPlanPending = pendingPlan === plan.key;
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const period = billingCycle === "yearly" ? "/year" : plan.monthlyPrice === 0 ? "" : "/month";
            const cardStyle = PLAN_CARD_STYLES[plan.key];

            return (
              <div
                key={plan.key}
                className={`relative w-full max-w-[480px] rounded-2xl border bg-card/80 p-6 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col backdrop-blur ${cardStyle.border} ${
                  isCurrentPlan || isPopular || isPro ? `ring-1 ${cardStyle.ring} shadow-md` : ""
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {((isCurrentPlan && user) || isPopular || plan.highlight) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`px-3 py-1 text-xs font-medium ${
                      isCurrentPlan
                        ? "bg-success-subtle text-success border border-success/30"
                        : isPopular
                          ? "bg-primary text-primary-foreground"
                          : "bg-foreground text-background"
                    }`}>
                      {isCurrentPlan ? <><Crown className="w-3 h-3 mr-1 inline" />Your Plan</> : isPopular ? <><Star className="w-3 h-3 mr-1 inline fill-current" />Most Popular</> : <><Sparkles className="w-3 h-3 mr-1 inline" />Premium</>}
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl sm:text-3xl font-semibold mb-1 tracking-tight font-space-grotesk">
                    {plan.title}
                  </h3>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    {plan.subtitle}
                  </p>
                  <Badge variant="outline" className="mb-4 rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-xs">
                    {plan.outcomeLabel}
                  </Badge>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-semibold tracking-tight font-space-grotesk tabular-nums">
                        ${formatPrice(price)}
                      </span>
                      {period && (
                        <span className="text-muted-foreground text-base">{period}</span>
                      )}
                    </div>
                    {billingCycle === "yearly" && plan.key !== "rookie" && (
                      <div className="text-sm text-success mt-1">
                        {plan.yearlyEquivalent} billed annually
                      </div>
                    )}
                    {plan.savings && billingCycle === "yearly" && (
                      <div className="text-xs text-muted-foreground mt-1">{plan.savings}</div>
                    )}
                    <div className="text-sm text-muted-foreground mt-2">
                      {plan.credits} credits/month
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.audience}
                  </p>
                </div>

                <div className="mb-6 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                    Plan highlights
                  </p>
                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground/90 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className={`w-full ${cardStyle.button}`}
                  disabled={Boolean(pendingPlan)}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleSubscribe(plan.key);
                  }}
                  variant={cardStyle.buttonVariant}
                >
                  {isPlanPending
                    ? "Opening..."
                    : plan.key === "rookie"
                      ? "Start Free"
                      : `Go ${plan.title}`}
                </Button>
              </div>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
