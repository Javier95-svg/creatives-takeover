import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { GTM_STRATEGIST_PRICING } from "@/config/gtmStrategist";
import { CREDIT_COSTS, getCreditCostForPlan } from "@/config/constants";
import { getFounderTool } from "@/config/founderToolCatalog";
import { MONTHLY_FREE_QUOTAS, PLAN_LABELS, PLAN_MONTHLY_CREDITS, PLAN_SEQUENCE, type Plan } from "@/config/planPermissions";
import { PLAN_PRICING } from "@/config/pricing";

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
  email: getFounderTool("email_templates").name,
  deck: getFounderTool("pitch_deck_analyzer").name,
  readiness: getFounderTool("insighta_test").name,
};

const availableToAll: FeatureValue = "Available; credit-metered where noted";
const quotaValue = (value: number, unit: string) => Number.isFinite(value) ? `${value} ${unit}/month` : `Unlimited ${unit}`;
const researchQuotaValue = (value: number) => value === 0 ? "Browse; no profiles" : quotaValue(value, "profiles");

const features: FeatureCategory[] = [
  {
    category: "Credits & AI",
    items: [
      { feature: "Monthly credits", rookie: `${PLAN_MONTHLY_CREDITS.rookie} credits`, starter: `${PLAN_MONTHLY_CREDITS.starter} credits`, rising: `${PLAN_MONTHLY_CREDITS.rising} credits`, pro: `${PLAN_MONTHLY_CREDITS.pro} credits` },
      { feature: "MVP Builder model access", rookie: "Standard models", starter: "Standard models", rising: "Advanced models", pro: "Advanced models" },
      { feature: "Optional credit top-ups", rookie: true, starter: true, rising: true, pro: true },
    ],
  },
  {
    category: "Build & validation",
    items: [
      { feature: "Dashboard workspace", rookie: "Core workspace", starter: "PROVE workspace", rising: "SELL + GROW workspace", pro: "Full execution workspace" },
      { feature: toolName.icp, rookie: true, starter: true, rising: true, pro: true },
      { feature: toolName.demo, rookie: `${getCreditCostForPlan("WAITLIST_GENERATION", "rookie")} credits/use`, starter: `${CREDIT_COSTS.WAITLIST_GENERATION} credits/use`, rising: `${CREDIT_COSTS.WAITLIST_GENERATION} credits/use`, pro: `${CREDIT_COSTS.WAITLIST_GENERATION} credits/use` },
      { feature: toolName.pmf, rookie: "First score free; then credits", starter: "First score free; then credits", rising: "First score free; then credits", pro: "First score free; then credits" },
      { feature: toolName.mvp, rookie: availableToAll, starter: availableToAll, rising: availableToAll, pro: availableToAll },
      { feature: toolName.stack, rookie: "First build free; then credits", starter: "First build free; then credits", rising: "First build free; then credits", pro: "First build free; then credits" },
    ],
  },
  {
    category: "Sell & grow",
    items: [
      { feature: toolName.gtm, rookie: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation`, starter: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation`, rising: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation`, pro: `${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits/generation` },
      { feature: "First Customer Proof", rookie: "Preview", starter: "Preview after validation", rising: "Full workflow", pro: "Full workflow" },
      { feature: toolName.directories, rookie: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.rookie, "visits"), starter: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.starter, "visits"), rising: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.rising, "visits"), pro: quotaValue(MONTHLY_FREE_QUOTAS.directory_visits.pro, "visits") },
      { feature: toolName.email, rookie: false, starter: "Full access", rising: "Full access", pro: "Full access" },
      { feature: "Prompt Library", rookie: "Standard models", starter: "Standard models", rising: "Full library + export", pro: "Full library + export" },
      { feature: toolName.traction, rookie: `${CREDIT_COSTS.TRACTION_ENGINE_SCORECARD} credits/scorecard`, starter: `${CREDIT_COSTS.TRACTION_ENGINE_SCORECARD} credits/scorecard`, rising: `${CREDIT_COSTS.TRACTION_ENGINE_SCORECARD} credits/scorecard`, pro: `${CREDIT_COSTS.TRACTION_ENGINE_SCORECARD} credits/scorecard` },
    ],
  },
  {
    category: "Research & fundraising",
    items: [
      { feature: toolName.vc, rookie: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.rookie), starter: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.starter), rising: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.rising), pro: researchQuotaValue(MONTHLY_FREE_QUOTAS.vc_profiles.pro) },
      { feature: toolName.accelerator, rookie: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.rookie), starter: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.starter), rising: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.rising), pro: researchQuotaValue(MONTHLY_FREE_QUOTAS.accelerator_profiles.pro) },
      { feature: toolName.deck, rookie: "First score free; then 10 credits", starter: "First score free; then 10 credits", rising: "First score free; then 10 credits", pro: "First score free; then 10 credits" },
      { feature: toolName.readiness, rookie: true, starter: true, rising: true, pro: true },
      { feature: "Find Your Angel", rookie: false, starter: false, rising: false, pro: "Full access" },
    ],
  },
  {
    category: "Network & support",
    items: [
      { feature: "Mentor marketplace & Discovery Calls", rookie: "Access; mentor fees separate", starter: "Access; mentor fees separate", rising: "Access; mentor fees separate", pro: "Access; mentor fees separate" },
      { feature: "Find a Co-Founder posting", rookie: "Free", starter: "Free", rising: "Free", pro: "Free" },
      { feature: "Newspaper", rookie: true, starter: true, rising: true, pro: true },
    ],
  },
];

const renderFeatureValue = (value: FeatureValue) => {
  if (typeof value === "boolean") {
    return value
      ? <Check className="mx-auto h-5 w-5 text-primary" aria-label="Included" />
      : <X className="mx-auto h-5 w-5 text-muted-foreground/40" aria-label="Not included" />;
  }
  return <span className="block text-center text-sm font-medium text-foreground">{value}</span>;
};

const PricingComparison = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);

  const handleMobileNavigation = (direction: "prev" | "next") => {
    setCurrentMobileIndex((current) => direction === "prev" ? Math.max(0, current - 1) : Math.min(plans.length - 1, current + 1));
  };

  return (
    <section className="relative overflow-hidden py-8 lg:py-10">
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="group mx-auto flex w-full max-w-5xl items-center justify-between gap-5 rounded-2xl border border-border/60 bg-card/70 px-5 py-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-card sm:px-6">
            <span>
              <span className="block font-space-grotesk text-lg font-semibold text-foreground">Compare all features</span>
              <span className="mt-1 block text-sm text-muted-foreground">See model access, credit costs, research limits, and separately paid services.</span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-8">
            <div className="mb-6 text-center">
              <h2 className="font-space-grotesk text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Full plan comparison</h2>
              <p className="mx-auto mt-3 max-w-3xl text-muted-foreground">Shared access, usage costs, model levels, and monthly limits—without hiding the details in the plan cards.</p>
            </div>

            <div className="mb-8 space-y-6 lg:hidden">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => handleMobileNavigation("prev")} disabled={currentMobileIndex === 0} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background/70 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Previous plan"><ChevronLeft className="h-5 w-5" /></button>
                <div className="text-sm text-muted-foreground">{currentMobileIndex + 1} of {plans.length}</div>
                <button type="button" onClick={() => handleMobileNavigation("next")} disabled={currentMobileIndex === plans.length - 1} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background/70 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Next plan"><ChevronRight className="h-5 w-5" /></button>
              </div>

              <Card className={`rounded-2xl bg-card/80 shadow-lg backdrop-blur ${plans[currentMobileIndex].isRecommended ? "border-2 border-primary/80" : "border-border/60"}`}>
                <CardHeader>
                  <CardTitle className="text-center font-space-grotesk text-2xl font-semibold tracking-tight">{plans[currentMobileIndex].name}</CardTitle>
                  <div className="mt-2 text-center font-space-grotesk text-3xl font-semibold tabular-nums">{plans[currentMobileIndex].price}<span className="text-sm text-muted-foreground">{plans[currentMobileIndex].period}</span></div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {features.map((category) => (
                    <div key={category.category}>
                      <h3 className="mb-4 font-space-grotesk text-lg font-semibold text-primary">{category.category}</h3>
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

            <div className="hidden lg:block">
              <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-lg backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border/60 bg-muted/40">
                        <th className="sticky left-0 z-10 min-w-[240px] border-r border-border/60 bg-muted/40 p-5 text-center font-space-grotesk text-base font-semibold">Features</th>
                        {plans.map((plan) => (
                          <th key={plan.key} className={`relative min-w-[180px] border-r border-border/60 p-5 text-center font-space-grotesk text-base font-semibold last:border-r-0 ${plan.isRecommended ? "bg-primary/10 shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.45)]" : "bg-muted/40"}`}>
                            {plan.name}<div className="mt-2 font-space-grotesk text-2xl font-semibold tabular-nums">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((category) => (
                        <React.Fragment key={category.category}>
                          <tr><td colSpan={5} className="sticky left-0 z-10 border-b border-border/60 bg-muted/50 p-4 text-center"><h3 className="font-space-grotesk text-base font-semibold text-primary">{category.category}</h3></td></tr>
                          {category.items.map((item, index) => (
                            <tr key={item.feature} className={`border-b border-border/40 ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                              <td className="sticky left-0 z-10 border-r border-border/60 bg-inherit p-4 text-sm font-medium">{item.feature}</td>
                              <td className="border-r border-border/40 p-4 text-center">{renderFeatureValue(item.rookie)}</td>
                              <td className="border-r border-border/40 bg-primary/5 p-4 text-center shadow-[inset_2px_0_0_hsl(var(--primary)/0.3),inset_-2px_0_0_hsl(var(--primary)/0.3)]">{renderFeatureValue(item.starter)}</td>
                              <td className="border-r border-border/40 p-4 text-center">{renderFeatureValue(item.rising)}</td>
                              <td className="p-4 text-center">{renderFeatureValue(item.pro)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
};

export default PricingComparison;
