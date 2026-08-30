import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Star } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { normalizePlanId, trackUpgradeClicked } from "@/lib/analytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { useLocation } from "react-router-dom";
import { PLAN_LABELS, PLAN_SEQUENCE, type Plan } from "@/config/planPermissions";
import { PLAN_PRICING } from "@/config/pricing";
import { PLAN_PACKAGE_PRESENTATION } from "@/config/planPackages";
import { appendCheckoutIntentParam } from "@/lib/checkoutRedirect";
import { RevealGroup } from "@/components/animations/ScrollReveal";

type BillingCycle = "monthly" | "yearly";
type PlanKey = Plan;

const PLAN_CONFIG: Array<{
  key: PlanKey;
  title: string;
  valueStatement: string;
  usageLabel: string;
  perksTitle: string;
  perks: readonly [string, string, string, string];
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyEquivalent: string;
  savings: string | null;
  recommended: boolean;
}> = PLAN_SEQUENCE.map((key) => ({
  key,
  title: PLAN_LABELS[key],
  valueStatement: PLAN_PACKAGE_PRESENTATION[key].valueStatement,
  usageLabel: PLAN_PACKAGE_PRESENTATION[key].usageLabel,
  perksTitle: PLAN_PACKAGE_PRESENTATION[key].perksTitle,
  perks: PLAN_PACKAGE_PRESENTATION[key].perks,
  monthlyPrice: PLAN_PRICING[key].monthly,
  yearlyPrice: PLAN_PRICING[key].yearly,
  yearlyEquivalent: key === "starter" ? "$6.58/mo" : key === "rising" ? "$19.92/mo" : key === "pro" ? "$49.08/mo" : "Free forever",
  savings: key === "starter" ? "Save 27%" : key === "rising" ? "Save 31%" : key === "pro" ? "Save 25%" : null,
  recommended: PLAN_PACKAGE_PRESENTATION[key].recommended === true,
}));

const PLAN_CARD_STYLES: Record<PlanKey, { border: string; ring: string; button: string; buttonVariant: "default" | "outline" }> = {
  // Per-tier border colour identity (token-based, theme-aware); the recommended
  // tier (starter) still carries the strongest emphasis via its glow + scale.
  rookie: {
    border: "border-success/55",
    ring: "ring-border",
    button: "bg-success text-success-foreground hover:bg-success/90",
    buttonVariant: "default",
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
    button: "bg-warning text-warning-foreground hover:bg-warning/90",
    buttonVariant: "default",
  },
  pro: {
    border: "border-destructive/50",
    ring: "ring-border",
    button: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    buttonVariant: "default",
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
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight mb-6 pb-2 gradient-text font-space-grotesk">
            Pricing
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Every plan keeps your project evidence and pivot decisions on track as you progress.
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

        <RevealGroup className="mx-auto grid max-w-[124rem] grid-cols-1 items-start justify-items-center gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-6" variant="card">
          {PLAN_CONFIG.map((plan, index) => {
            // Until the subscription resolves we do not know the tier, and
            // normalizeTierName() defaults to "rookie" — so without this guard
            // a Pro user would briefly see "Your Plan" on the Rookie card.
            const isCurrentPlan = !loading && currentTier === plan.key;
            const isPopular = plan.recommended;
            const isPlanPending = pendingPlan === plan.key;
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const period = billingCycle === "yearly" ? "/year" : plan.monthlyPrice === 0 ? "" : "/month";
            const cardStyle = PLAN_CARD_STYLES[plan.key];

            return (
              <div
                key={plan.key}
                aria-label={`${plan.title} plan${isPopular ? ", recommended" : ""}`}
                className={`group relative flex w-full max-w-[516px] flex-col rounded-3xl border ${cardStyle.border} p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 ${
                  isPopular
                    ? "z-10 bg-gradient-to-b from-primary/[0.09] to-card shadow-[0_28px_64px_-28px_hsl(var(--primary)/0.45)] xl:-translate-y-2"
                    : "bg-card/70 shadow-[0_1px_2px_rgb(2_6_23/0.04),0_14px_32px_-20px_rgb(2_6_23/0.20)]"
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {isPopular && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}
                {isCurrentPlan && user ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="border border-success/30 bg-success-subtle px-3 py-1 text-xs font-medium text-success">
                      <Crown className="mr-1 h-3 w-3" aria-hidden="true" />
                      Your Plan
                    </Badge>
                  </div>
                ) : isPopular ? (
                  <span
                    className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
                    role="img"
                    aria-label="Recommended plan"
                    title="Recommended plan"
                  >
                    <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                  </span>
                ) : null}

                <div>
                  <h3 className="font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                    {plan.title}
                  </h3>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
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
                  </div>
                  <p className="mt-4 min-h-[3.25rem] font-space-grotesk text-lg font-semibold leading-snug text-foreground">
                    {plan.valueStatement}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2" aria-label={`${plan.title} plan context`}>
                  <Badge variant="secondary" className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground">
                    {plan.usageLabel}
                  </Badge>
                </div>

                <div className="my-5 flex-1 border-t border-border/60 pt-5">
                  <p className="mb-4 text-sm font-medium text-foreground">{plan.perksTitle}</p>
                  <div className="space-y-4">
                    {plan.perks.map((perk) => (
                      <div key={perk} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                        <span className="text-sm leading-relaxed text-foreground/85">{perk}</span>
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
