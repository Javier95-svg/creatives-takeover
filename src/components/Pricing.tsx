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
import { PLAN_CATALOG } from "@/config/planCatalog";
import { appendCheckoutIntentParam } from "@/lib/checkoutRedirect";
import { RevealGroup } from "@/components/animations/ScrollReveal";

type BillingCycle = "monthly" | "yearly";
type PlanKey = "rookie" | "starter" | "rising" | "pro";

const PLAN_COPY: Record<PlanKey, { subtitle: string; audience: string; yearlyEquivalent: string; savings: string | null; highlight?: string }> = {
  rookie: { subtitle: "Take the first evidence action", audience: "Clarify who to serve, create an evidence plan, and take one action in the market.", yearlyEquivalent: "Free forever", savings: null },
  starter: { subtitle: "Earn a costly commitment", audience: "Turn a customer hypothesis into qualified conversations, evidence, and a real commitment.", yearlyEquivalent: "$6.58/mo", savings: "Save 27%", highlight: "Most Popular" },
  rising: { subtitle: "Win and retain customers", audience: "Use the customer pipeline, messaging, experiments, and metrics to reach repeatable revenue.", yearlyEquivalent: "$19.92/mo", savings: "Save 31%" },
  pro: { subtitle: "Add human accountability", audience: "Run every loop with deeper reviews, expert accountability, and optional fundraising workflows.", yearlyEquivalent: "$49.08/mo", savings: "Save 25%" },
};

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
}> = PLAN_CATALOG.map((plan) => ({ key: plan.id, title: plan.name, outcomeLabel: plan.outcome, subtitle: PLAN_COPY[plan.id].subtitle, audience: PLAN_COPY[plan.id].audience, monthlyPrice: plan.monthlyPrice, yearlyPrice: plan.yearlyPrice, yearlyEquivalent: PLAN_COPY[plan.id].yearlyEquivalent, savings: PLAN_COPY[plan.id].savings, credits: plan.monthlyCredits, highlight: PLAN_COPY[plan.id].highlight, features: plan.features }));

const PLAN_CARD_STYLES: Record<PlanKey, { border: string; ring: string; button: string; buttonVariant: "default" | "outline" }> = {
  // Per-tier border colour identity (token-based, theme-aware); the recommended
  // tier (starter) still carries the strongest emphasis via its glow + scale.
  rookie: {
    border: "border-success/55",
    ring: "ring-border",
    button: "",
    buttonVariant: "outline",
  },
  starter: {
    border: "border-2 border-primary/70",
    ring: "ring-primary/30",
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
    buttonVariant: "default",
  },
  rising: {
    border: "border-warning/55",
    ring: "ring-border",
    button: "",
    buttonVariant: "outline",
  },
  pro: {
    border: "border-destructive/50",
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
  const { loading, subscriptionData, createCheckout } = useSubscription();
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

    const checkoutUrl = await createCheckout(plan, undefined, billingCycle, 'pricing_page');
    if (!checkoutUrl) setPendingPlan(null);
  };

  // The plan cards are static marketing content (PLAN_CONFIG), so they render
  // immediately. Gating the whole section on useSubscription() used to swap a
  // short spinner for a full-height grid once the auth round-trip resolved,
  // which pushed everything below it down — measured CLS 0.81 desktop / 0.93
  // mobile. Only the "Your Plan" badge needs the subscription, and it is
  // absolutely positioned, so it can appear late without moving anything.
  return (
    <section className="relative overflow-hidden pt-28 pb-section-mobile md:pt-32 lg:pt-36 lg:pb-section-desktop" id="pricing-plans">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight mb-6 gradient-text font-space-grotesk">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Choose the outcome you need now. Every plan keeps your evidence and decisions connected as you progress.
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
            // Until the subscription resolves we do not know the tier, and
            // normalizeTierName() defaults to "rookie" — so without this guard
            // a Pro user would briefly see "Your Plan" on the Rookie card.
            const isCurrentPlan = !loading && currentTier === plan.key;
            const isPopular = plan.key === "starter";
            const isPro = plan.key === "pro";
            const isPlanPending = pendingPlan === plan.key;
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const period = billingCycle === "yearly" ? "/year" : plan.monthlyPrice === 0 ? "" : "/month";
            const cardStyle = PLAN_CARD_STYLES[plan.key];

            return (
              <div
                key={plan.key}
                className={`group relative w-full max-w-[516px] rounded-3xl border ${cardStyle.border} p-7 sm:p-8 flex flex-col backdrop-blur transition-all duration-300 hover:-translate-y-1.5 ${
                  isPopular
                    ? "bg-card shadow-[0_28px_64px_-28px_hsl(var(--primary)/0.45)] lg:scale-[1.035] z-10"
                    : "bg-card/70 shadow-[0_1px_2px_rgb(2_6_23/0.04),0_14px_32px_-20px_rgb(2_6_23/0.20)]"
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {isPopular && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}
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
                      <span className="text-5xl sm:text-6xl font-bold tracking-tight font-space-grotesk tabular-nums">
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

                <div className="mb-7 flex-1">
                  <div className="mb-6 border-t border-border/70" />
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-4">
                    Plan highlights
                  </p>
                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                        </span>
                        <span className="text-sm text-foreground/90 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  size="lg"
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
