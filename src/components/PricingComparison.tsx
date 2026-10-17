import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { GTM_STRATEGIST_PRICING } from "@/config/gtmStrategist";
import { CREDIT_COSTS, getCreditCostForPlan } from "@/config/constants";
import { getFounderTool } from "@/config/founderToolCatalog";
import { MONTHLY_FREE_QUOTAS, PLAN_LABELS, PLAN_MONTHLY_CREDITS, PLAN_SEQUENCE } from "@/config/planPermissions";
import { PLAN_PRICING } from "@/config/pricing";
import PricingSectionHeader from "@/components/pricing/PricingSectionHeader";

type FeatureValue = string | boolean;

interface FeatureItem {
  feature: string;
  rookie: FeatureValue;
  starter: FeatureValue;
  rising: FeatureValue;
  pro: FeatureValue;
}

interface FeatureCategory {
  category: string;
  items: FeatureItem[];
}

const plans = PLAN_SEQUENCE.map((key) => ({
  key,
  name: PLAN_LABELS[key],
  price: `$${PLAN_PRICING[key].monthly}`,
  period: PLAN_PRICING[key].monthly === 0 ? "" : "/month",
  isRecommended: key === "starter",
}));

const toolName = {
  icp: getFounderTool("icp_builder").name,
  demo: getFounderTool("demo_studio").name,
  pmf: getFounderTool("pmf_lab").name,
  mvp: getFounderTool("mvp_builder").name,
  stack: getFounderTool("tech_stack").name,
  gtm: getFounderTool("gtm_strategist").name,
  directories: getFounderTool("directories").name,
  traction: getFounderTool("traction_engine").name,
  vc: getFounderTool("vc_search").name,
  accelerator: getFounderTool("accelerator_hunt").name,
  deck: getFounderTool("pitch_deck_analyzer").name,
  readiness: getFounderTool("insighta_test").name,
};

const quotaValue = (value: number, unit: string) => Number.isFinite(value) ? `${value} ${unit}/month` : `Unlimited ${unit}`;
const researchQuotaValue = (value: number) => value === 0 ? "Browse only" : quotaValue(value, "profiles");

const features: FeatureCategory[] = [
  {
    category: "Credits & AI",
    items: [
      { feature: "Monthly credits", rookie: `${PLAN_MONTHLY_CREDITS.rookie} credits`, starter: `${PLAN_MONTHLY_CREDITS.starter} credits`, rising: `${PLAN_MONTHLY_CREDITS.rising} credits`, pro: `${PLAN_MONTHLY_CREDITS.pro} credits` },
      { feature: "MVP Builder models", rookie: "Standard models", starter: "Standard models", rising: "Advanced models", pro: "Advanced models" },
      { feature: "Optional credit top-ups", rookie: true, starter: true, rising: true, pro: true },
    ],
  },
  {
    category: "Build & validation",
    items: [
      // The dashboard modes in DASHBOARD_MODE_CONFIG, named by what they focus on.
      { feature: "Dashboard focus", rookie: "Basics", starter: "Validation", rising: "Sales & growth", pro: "Full execution" },
      { feature: "MVP on your own domain", rookie: false, starter: true, rising: true, pro: true },
      { feature: toolName.icp, rookie: "Free on every plan", starter: "Free on every plan", rising: "Free on every plan", pro: "Free on every plan" },
      { feature: toolName.demo, rookie: `${getCreditCostForPlan("WAITLIST_GENERATION", "rookie")} credits/use`, starter: `${CREDIT_COSTS.WAITLIST_GENERATION} credits/use`, rising: `${CREDIT_COSTS.WAITLIST_GENERATION} credits/use`, pro: `${CREDIT_COSTS.WAITLIST_GENERATION} credits/use` },
      { feature: toolName.pmf, rookie: "First score free; then credits", starter: "First score free; then credits", rising: "First score free; then credits", pro: "First score free; then credits" },
      { feature: toolName.mvp, rookie: "Available; uses credits", starter: "Available; uses credits", rising: "Available; uses credits", pro: "Available; uses credits" },
      { feature: toolName.stack, rookie: "First build free; then credits", starter: "First build free; then credits", rising: "First build free; then credits", pro: "First build free; then credits" },
    ],
  },
  {
    category: "Sell & grow",
    items: [
      { feature: toolName.gtm, rookie: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation`, starter: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation`, rising: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation`, pro: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation` },
      { feature: "First Customer Proof", rookie: "Preview", starter: "Preview", rising: "Full workflow", pro: "Full workflow" },
      { feature: toolName.directories, rookie: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.rookie, "visits"), starter: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.starter, "visits"), rising: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.rising, "visits"), pro: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.pro, "visits") },
      { feature: "Prompt Library", rookie: "Standard models", starter: "Standard models", rising: "Full library + export", pro: "Full library + export" },
      { feature: toolName.traction, rookie: "Free weekly logs", starter: "Free weekly logs", rising: "Free weekly logs", pro: "Free weekly logs" },
    ],
  },
  {
    category: "Research & fundraising",
    items: [
      { feature: toolName.vc, rookie: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.rookie), starter: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.starter), rising: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.rising), pro: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.pro) },
      { feature: toolName.accelerator, rookie: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.rookie), starter: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.starter), rising: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.rising), pro: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.pro) },
      { feature: "Email templates", rookie: false, starter: true, rising: true, pro: true },
      { feature: toolName.deck, rookie: `First analysis free; then ${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits`, starter: `First analysis free; then ${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits`, rising: `First analysis free; then ${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits`, pro: `First analysis free; then ${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits` },
      { feature: toolName.readiness, rookie: "Included", starter: "Included", rising: "Included", pro: "Included" },
      { feature: "Find Your Angel", rookie: false, starter: false, rising: false, pro: "Full access" },
    ],
  },
  {
    category: "Network & support",
    items: [
      { feature: "Mentor marketplace & Discovery Calls", rookie: "Access; mentor fees separate", starter: "Access; mentor fees separate", rising: "Access; mentor fees separate", pro: "Access; mentor fees separate" },
      { feature: "Find a Co-Founder posting", rookie: "Free", starter: "Free", rising: "Free", pro: "Free" },
      { feature: "Newspaper", rookie: "Included", starter: "Included", rising: "Included", pro: "Included" },
    ],
  },
];

// The table shows only what changes between plans (2026-10-17); rows that are
// the same everywhere move to one "Included on every plan" list below it.
const isSameOnEveryPlan = (item: FeatureItem) => PLAN_SEQUENCE.every((key) => item[key] === item.rookie);
const differingCategories = features
  .map((category) => ({ ...category, items: category.items.filter((item) => !isSameOnEveryPlan(item)) }))
  .filter((category) => category.items.length > 0);
const everyPlanItems = features.flatMap((category) => category.items.filter(isSameOnEveryPlan));

/** The note shown beside an every-plan item; nothing when it just means "included". */
const everyPlanNote = (value: FeatureValue) => {
  if (value === true || value === "Included") return null;
  if (value === "Free on every plan") return "Free";
  // "Available; uses credits" and "Access; mentor fees separate" only need their second half here.
  return String(value).replace(/^(Available|Access); /, "");
};

const renderFeatureValue = (value: FeatureValue) => {
  if (typeof value === "boolean") {
    return value
      ? <Check className="mx-auto h-5 w-5 text-primary" aria-label="Included" />
      : <X className="mx-auto h-5 w-5 text-muted-foreground/40" aria-label="Not included" />;
  }
  return <span className="block text-center text-sm font-medium text-foreground">{value}</span>;
};

const PricingComparison = () => {
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);

  const handleMobileNavigation = (direction: "prev" | "next") => {
    setCurrentMobileIndex((current) => direction === "prev" ? Math.max(0, current - 1) : Math.min(plans.length - 1, current + 1));
  };

  return (
    <section className="relative overflow-hidden py-section-mobile lg:py-section-desktop">
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <PricingSectionHeader
          eyebrow="Compare"
          title="Compare plans"
          lede="What changes as you move up. Everything below the table is included on every plan."
        />

        <div className="mb-10 space-y-6 lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => handleMobileNavigation("prev")} disabled={currentMobileIndex === 0} className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-border/60 bg-background/70 p-2 shadow-sm disabled:cursor-not-allowed disabled:opacity-30" aria-label="Previous plan"><ChevronLeft className="h-5 w-5" /></button>
            <div className="text-sm text-muted-foreground">{currentMobileIndex + 1} of {plans.length}</div>
            <button type="button" onClick={() => handleMobileNavigation("next")} disabled={currentMobileIndex === plans.length - 1} className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-border/60 bg-background/70 p-2 shadow-sm disabled:cursor-not-allowed disabled:opacity-30" aria-label="Next plan"><ChevronRight className="h-5 w-5" /></button>
          </div>

          <Card className={`rounded-2xl bg-card/80 shadow-sm backdrop-blur ${plans[currentMobileIndex].isRecommended ? "border-2 border-primary/60" : "border-border/60"}`}>
            <CardHeader>
              <CardTitle className="text-center font-space-grotesk text-2xl font-semibold tracking-tight">{plans[currentMobileIndex].name}</CardTitle>
              <div className="mt-2 text-center font-space-grotesk text-3xl font-semibold tabular-nums">{plans[currentMobileIndex].price}<span className="text-sm text-muted-foreground">{plans[currentMobileIndex].period}</span></div>
            </CardHeader>
            <CardContent className="space-y-6">
              {differingCategories.map((category) => (
                <div key={category.category}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{category.category}</h3>
                  <div className="space-y-3">
                    {category.items.map((item) => (
                      <div key={item.feature} className="flex items-center justify-between gap-4">
                        <span className="flex-1 text-sm">{item.feature}</span>
                        <div className="shrink-0 text-right">{renderFeatureValue(item[plans[currentMobileIndex].key])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-2">
            {plans.map((plan, index) => (
              <button key={plan.key} type="button" onClick={() => setCurrentMobileIndex(index)} className={`h-2 rounded-full transition-all ${index === currentMobileIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`} aria-label={`Show ${plan.name} plan`} />
            ))}
          </div>
        </div>

        <div className="mx-auto hidden max-w-6xl lg:block">
          <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="sticky left-0 z-10 min-w-[240px] bg-card p-5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Plan</th>
                    {plans.map((plan) => (
                      <th key={plan.key} className={`relative min-w-[170px] p-5 text-center font-space-grotesk text-base font-semibold text-foreground ${plan.isRecommended ? "bg-primary/[0.07]" : ""}`}>
                        {plan.name}
                        <div className="mt-1 font-space-grotesk text-xl font-semibold tabular-nums text-foreground">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {differingCategories.map((category) => (
                    <React.Fragment key={category.category}>
                      <tr><td colSpan={5} className="sticky left-0 z-10 border-b border-border/40 bg-muted/30 px-5 py-2.5 text-left"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{category.category}</h3></td></tr>
                      {category.items.map((item) => (
                        <tr key={item.feature} className="border-b border-border/40 last:border-b-0">
                          <td className="sticky left-0 z-10 bg-card px-5 py-3.5 text-sm font-medium text-foreground">{item.feature}</td>
                          <td className="px-5 py-3.5 text-center">{renderFeatureValue(item.rookie)}</td>
                          <td className="bg-primary/[0.07] px-5 py-3.5 text-center">{renderFeatureValue(item.starter)}</td>
                          <td className="px-5 py-3.5 text-center">{renderFeatureValue(item.rising)}</td>
                          <td className="px-5 py-3.5 text-center">{renderFeatureValue(item.pro)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-7">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Included on every plan</h3>
          <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {everyPlanItems.map((item) => {
              const note = everyPlanNote(item.rookie);
              return (
                <li key={item.feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">{item.feature}</span>
                    {note ? <span className="text-muted-foreground"> · {note}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
