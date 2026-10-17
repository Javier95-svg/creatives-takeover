import { Coins, Gift } from "lucide-react";
import { CREDIT_COSTS, getCreditCostForPlan } from "@/config/constants";
import { GTM_STRATEGIST_PRICING } from "@/config/gtmStrategist";
import { PLAN_LABELS, PLAN_MONTHLY_CREDITS, PLAN_SEQUENCE, type Plan } from "@/config/planPermissions";
import { TOP_UP_PACKS } from "@/config/pricing";
import { RevealGroup, ScrollReveal } from "@/components/animations/ScrollReveal";
import PricingSectionHeader from "@/components/pricing/PricingSectionHeader";

/**
 * "What your credits cover" (2026-10-17): what a month of credits buys on each
 * plan, then one plain list of what is free and what each action costs. Every
 * number comes from CREDIT_COSTS, PLAN_MONTHLY_CREDITS and TOP_UP_PACKS, so the
 * section cannot drift from what the product charges.
 */

const demandPageCost = (plan: Plan) => getCreditCostForPlan("WAITLIST_GENERATION", plan) ?? CREDIT_COSTS.WAITLIST_GENERATION;

// What the whole month's credits buy if spent on one kind of action.
const monthCovers = (plan: Plan) => {
  const credits = PLAN_MONTHLY_CREDITS[plan];
  return [
    { label: "demand pages", count: Math.floor(credits / demandPageCost(plan)) },
    { label: "PMF scores", count: Math.floor(credits / CREDIT_COSTS.PMF_SCORING) },
    { label: "MVP builds", count: Math.floor(credits / CREDIT_COSTS.APP_BUILDER_GENERATE) },
  ];
};

const FREE_ACTIONS = [
  "ICP Builder",
  "Your first PMF score",
  "Your first tech stack",
  "Your first pitch deck analysis",
  "Traction Engine weekly logs",
  "Co-founder posts and mentor discovery calls",
];

const CREDIT_ACTIONS: Array<{ label: string; cost: string }> = [
  {
    label: "Demand page in Demo Studio",
    cost: `${CREDIT_COSTS.WAITLIST_GENERATION} (${getCreditCostForPlan("WAITLIST_GENERATION", "rookie")} on Rookie)`,
  },
  { label: "PMF score", cost: String(CREDIT_COSTS.PMF_SCORING) },
  { label: "MVP Builder: new app", cost: String(CREDIT_COSTS.APP_BUILDER_GENERATE) },
  { label: "MVP Builder: edit, fix, publish", cost: `${CREDIT_COSTS.APP_BUILDER_REFINE}, ${CREDIT_COSTS.APP_BUILDER_DEBUG}, ${CREDIT_COSTS.APP_BUILDER_DEPLOY}` },
  { label: "Tech stack", cost: String(CREDIT_COSTS.TECH_STACK_GENERATION) },
  { label: "GTM Strategist research", cost: String(GTM_STRATEGIST_PRICING.creditsPerResearchGeneration) },
  { label: "Pitch deck analysis", cost: String(CREDIT_COSTS.PITCH_DECK_ANALYZER) },
];

const SubscriptionFeatures = () => (
  <section className="relative overflow-hidden py-section-mobile lg:py-section-desktop" id="features">
    <div className="container relative z-10 mx-auto px-4 sm:px-6">
      <ScrollReveal>
        <PricingSectionHeader
          title="What your credits cover"
          lede="Credits pay for the AI work. Many tools are free to start, and your credits renew each month."
        />
      </ScrollReveal>

      {/* A month of credits, translated into things a founder gets done. */}
      <RevealGroup className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4" variant="card">
        {PLAN_SEQUENCE.map((plan) => (
          <div key={plan} className="rounded-2xl border border-border/60 bg-card/70 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-space-grotesk text-lg font-semibold text-foreground">{PLAN_LABELS[plan]}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{PLAN_MONTHLY_CREDITS[plan]} credits</p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">A month covers about</p>
            <ul className="mt-2 space-y-1.5">
              {monthCovers(plan).map((item, index) => (
                <li key={item.label} className="flex items-baseline gap-2 text-sm text-foreground">
                  {index > 0 ? <span className="w-5 shrink-0 text-xs text-muted-foreground">or</span> : <span className="w-5 shrink-0" />}
                  <span className="font-semibold tabular-nums">{item.count}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </RevealGroup>

      <ScrollReveal>
        <div className="mx-auto mt-6 grid max-w-6xl overflow-hidden rounded-2xl border border-border/60 bg-card/70 md:grid-cols-2">
          <div className="p-6 sm:p-7">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Gift className="h-4 w-4 text-success" aria-hidden="true" />
              Free on every plan
            </p>
            <ul className="mt-4 space-y-2.5">
              {FREE_ACTIONS.map((action) => (
                <li key={action} className="text-sm text-foreground">{action}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-border/60 p-6 sm:p-7 md:border-l md:border-t-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
              Uses credits
            </p>
            <dl className="mt-4 space-y-2.5">
              {CREDIT_ACTIONS.map((action) => (
                <div key={action.label} className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-foreground">{action.label}</dt>
                  <dd className="shrink-0 tabular-nums text-muted-foreground">{action.cost}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </ScrollReveal>

      <p className="mx-auto mt-6 max-w-6xl text-center text-sm text-muted-foreground">
        Need more in a busy month? Top-up packs:{" "}
        {TOP_UP_PACKS.map((pack, index) => (
          <span key={pack.id}>
            {index > 0 ? " · " : null}
            <span className="font-medium text-foreground">{pack.credits} credits for ${pack.priceUsd}</span>
          </span>
        ))}
        . Monthly credits don't roll over.
      </p>
    </div>
  </section>
);

export default SubscriptionFeatures;
