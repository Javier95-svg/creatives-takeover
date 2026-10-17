import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarX2, Check, CreditCard, Crown, DollarSign, Lock, type LucideIcon } from "lucide-react";
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

/** Yearly price as a share of twelve monthly payments, rounded down so it never overstates. */
const yearlySavingsPercent = (key: PlanKey) => {
  const { monthly, yearly } = PLAN_PRICING[key];
  return monthly > 0 ? Math.floor((1 - yearly / (monthly * 12)) * 100) : 0;
};

const PLAN_CONFIG = PLAN_SEQUENCE.map((key) => ({
  key,
  title: PLAN_LABELS[key],
  bestFor: PLAN_PACKAGE_PRESENTATION[key].bestFor,
  outcome: PLAN_PACKAGE_PRESENTATION[key].outcome,
  outcomeDetail: PLAN_PACKAGE_PRESENTATION[key].outcomeDetail,
  usageLabel: PLAN_PACKAGE_PRESENTATION[key].usageLabel,
  perksTitle: PLAN_PACKAGE_PRESENTATION[key].perksTitle,
  perks: PLAN_PACKAGE_PRESENTATION[key].perks,
  monthlyPrice: PLAN_PRICING[key].monthly,
  yearlyPrice: PLAN_PRICING[key].yearly,
  yearlyEquivalent: `$${(PLAN_PRICING[key].yearly / 12).toFixed(2)}/mo`,
  savings: yearlySavingsPercent(key) > 0 ? `Save ${yearlySavingsPercent(key)}%` : null,
  recommended: PLAN_PACKAGE_PRESENTATION[key].recommended === true,
}));

const MAX_YEARLY_SAVINGS = Math.max(...PLAN_SEQUENCE.map(yearlySavingsPercent));

// Neutral cards with one highlight (2026-10-17): the recommended plan carries
// the only filled button; the others share one calm outline style.
const PLAN_CARD_STYLES: Record<"recommended" | "standard", { buttonVariant: "default" | "outline" }> = {
  recommended: { buttonVariant: "default" },
  standard: { buttonVariant: "outline" },
};

// Facts shown under the cards. Each is verified: Rookie signup never reaches
// Stripe, cancellation is in the FAQ, and checkout runs on Stripe.
const TRUST_POINTS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: CreditCard, label: "Free plan, no card needed" },
  { icon: CalendarX2, label: "Cancel anytime" },
  { icon: Lock, label: "Secure checkout by Stripe" },
  { icon: DollarSign, label: "Prices in USD" },
];

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

/**
 * The four founder plans. showHeading=false drops the h1 and the top padding
 * for pages that render their own header (the /pricing audience switch).
 *
 * Each card leads with the outcome the plan gets a founder (2026-10-17), then
 * the credits and at most three unlocks, so the value reads at a glance.
 */
export default function Pricing({ showHeading = true }: { showHeading?: boolean }) {
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
    <section
      className={`relative overflow-hidden pb-section-mobile lg:pb-section-desktop ${showHeading ? "pt-28 md:pt-32 lg:pt-36" : "pt-2"}`}
      id="pricing-plans"
    >
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10 animate-fade-in">
          {showHeading ? (
            <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight mb-8 pb-2 gradient-text font-space-grotesk">
              Pricing
            </h1>
          ) : null}

          <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)} className="inline-block">
            <TabsList className="grid w-full grid-cols-2 rounded-full border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur">
              <TabsTrigger className="rounded-full text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="monthly">
                Monthly
              </TabsTrigger>
              <TabsTrigger className="rounded-full text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="yearly">
                Yearly
                <Badge variant="secondary" className="ml-2 rounded-full bg-success-subtle text-success border-success/30 text-xs px-2.5">
                  Save up to {MAX_YEARLY_SAVINGS}%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <RevealGroup className="mx-auto grid max-w-[80rem] grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4" variant="card">
          {PLAN_CONFIG.map((plan, index) => {
            // Until the subscription resolves we do not know the tier, and
            // normalizeTierName() defaults to "rookie" — so without this guard
            // a Pro user would briefly see "Your Plan" on the Rookie card.
            const isCurrentPlan = !loading && currentTier === plan.key;
            const isPopular = plan.recommended;
            const isPlanPending = pendingPlan === plan.key;
            const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
            const period = billingCycle === "yearly" ? "/year" : plan.monthlyPrice === 0 ? "" : "/month";
            const cardStyle = PLAN_CARD_STYLES[isPopular ? "recommended" : "standard"];

            return (
              <div
                key={plan.key}
                aria-label={`${plan.title} plan${isPopular ? ", recommended" : ""}`}
                className={`relative mx-auto flex h-full w-full max-w-[516px] flex-col rounded-3xl border p-6 sm:p-7 ${
                  isPopular
                    ? "border-primary/60 bg-card shadow-[0_28px_64px_-32px_hsl(var(--primary)/0.5)] ring-1 ring-primary/25"
                    : "border-border/70 bg-card/70 shadow-[0_1px_2px_rgb(2_6_23/0.04),0_14px_32px_-24px_rgb(2_6_23/0.2)]"
                }`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {isCurrentPlan && user ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="border border-success/30 bg-success-subtle px-3 py-1 text-xs font-medium text-success">
                      <Crown className="mr-1 h-3 w-3" aria-hidden="true" />
                      Your Plan
                    </Badge>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-space-grotesk text-2xl font-semibold tracking-tight">{plan.title}</h3>
                  {isPopular ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Best for {plan.bestFor.toLowerCase()}</p>

                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-space-grotesk text-5xl font-bold tracking-tight tabular-nums">
                      ${formatPrice(price)}
                    </span>
                    {period && <span className="text-base text-muted-foreground">{period}</span>}
                  </div>
                  <p className="mt-1 min-h-[1.25rem] text-sm text-muted-foreground">
                    {billingCycle === "yearly" && plan.savings
                      ? `${plan.yearlyEquivalent} billed annually · ${plan.savings}`
                      : plan.monthlyPrice === 0
                        ? "Free forever"
                        : billingCycle === "monthly"
                          ? "Billed monthly"
                          : null}
                  </p>
                </div>

                {/* Fixed heights for the longest outcome (2 lines) and detail
                    (3 lines), so chips, dividers and lists line up across cards. */}
                <div className="mt-6">
                  <p className="font-space-grotesk text-xl font-semibold leading-snug text-foreground md:min-h-[3.5rem]">{plan.outcome}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:min-h-[4.3rem]">{plan.outcomeDetail}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2" aria-label={`${plan.title} plan context`}>
                  <Badge variant="secondary" className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">
                    {plan.usageLabel}
                  </Badge>
                </div>

                <div className="my-6 flex-1 border-t border-border/60 pt-5">
                  <p className="mb-3 text-sm font-medium text-foreground">{plan.perksTitle}</p>
                  <ul className="space-y-2.5">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                        <span className="text-sm leading-snug text-foreground/90">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  size="lg"
                  className="w-full font-semibold"
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
                      ? "Start free"
                      : `Get ${plan.title}`}
                </Button>
              </div>
            );
          })}
        </RevealGroup>

        <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
          {TRUST_POINTS.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-2">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
