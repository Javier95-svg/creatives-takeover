import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";

type PlanKey = "rookie" | "starter" | "rising" | "pro";
type FeatureValue = string | boolean;

interface PlanConfig {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  isPopular?: boolean;
}

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

const plans: PlanConfig[] = [
  { key: "rookie", name: "Rookie", price: "$0", period: "/month" },
  { key: "starter", name: "Starter", price: "$9", period: "/month" },
  { key: "rising", name: "Rising", price: "$29", period: "/month", isPopular: true },
  { key: "pro", name: "Pro", price: "$65", period: "/month" },
];

const features: FeatureCategory[] = [
  {
    category: "Credits",
    items: [
      { feature: "Monthly Credits", rookie: "25 credits", starter: "50 credits", rising: "100 credits", pro: "300 credits" },
    ],
  },
  {
    category: "Startup Journey",
    items: [
      { feature: "ICP Builder", rookie: "Free on every plan", starter: "Free on every plan", rising: "Free on every plan", pro: "Free on every plan" },
      { feature: "Waitlist Maker", rookie: "Uses credits", starter: "Uses credits", rising: "Included", pro: "Included" },
      { feature: "PMF Lab", rookie: "Preview only", starter: "Uses credits", rising: "Included", pro: "Included" },
      { feature: "MVP Builder", rookie: "Preview only", starter: "Preview only", rising: "Always uses credits", pro: "Always uses credits" },
      { feature: "Tech Stack Builder", rookie: "Preview only", starter: "Preview only", rising: "Included", pro: "Included" },
      { feature: "GTM Strategist", rookie: "Preview only", starter: "Preview only", rising: "Always uses credits", pro: "Always uses credits" },
      { feature: "Directories", rookie: "Preview only", starter: "Preview only", rising: "Included", pro: "Included" },
    ],
  },
  {
    category: "Insighta",
    items: [
      { feature: "VC Search", rookie: "Browse only", starter: "2 profiles/cycle", rising: "10 profiles/cycle", pro: "Unlimited" },
      { feature: "Accelerator Hunt", rookie: "Browse only", starter: "2 profiles/cycle", rising: "10 profiles/cycle", pro: "Unlimited" },
      { feature: "Email Templates", rookie: "Not included", starter: "Basic templates", rising: "Full access", pro: "Full access" },
      { feature: "Pitch Deck Analyzer", rookie: "Not included", starter: "Not included", rising: "Included", pro: "Included" },
      { feature: "Insighta Test", rookie: "Included", starter: "Included", rising: "Included", pro: "Included" },
    ],
  },
  {
    category: "Community",
    items: [
      { feature: "Discovery Calls (Mentorship)", rookie: "1 free call/monthly, then 10 credits", starter: "2 free calls/monthly, then 10 credits", rising: "3 free calls/monthly, then 10 credits", pro: "Unlimited" },
      { feature: "Find a Co-Founder Posting", rookie: "1/cycle", starter: "2/cycle", rising: "Unlimited", pro: "Unlimited" },
      { feature: "Find Your Angel", rookie: false, starter: false, rising: false, pro: "Included" },
    ],
  },
  {
    category: "Resources",
    items: [
      { feature: "Newspaper", rookie: "Included", starter: "Included", rising: "Included", pro: "Included" },
      { feature: "Prompt Library", rookie: "Free templates only", starter: "Free templates only", rising: "Full library", pro: "Full library" },
    ],
  },
];

const renderFeatureValue = (value: FeatureValue) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-5 h-5 text-primary mx-auto" />
    ) : (
      <X className="w-5 h-5 text-gray-300 dark:text-muted-foreground/40 mx-auto" />
    );
  }

  return <span className="text-sm font-medium text-center block text-gray-900 dark:text-foreground">{value}</span>;
};

const PricingComparison = () => {
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);

  const handleMobileNavigation = (direction: "prev" | "next") => {
    if (direction === "prev" && currentMobileIndex > 0) {
      setCurrentMobileIndex(currentMobileIndex - 1);
    } else if (direction === "next" && currentMobileIndex < plans.length - 1) {
      setCurrentMobileIndex(currentMobileIndex + 1);
    }
  };

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-6">
            <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-primary/20 font-medium">
              Feature Comparison
            </Badge>
          </div>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-8 pb-2 gradient-text font-space-grotesk">
            Compare Our Plans
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-poppins">
            Compare credits, fundraising limits, community access, and the MVP or GTM credit rules side by side.
          </p>
        </div>

        <div className="lg:hidden space-y-6 mb-16">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => handleMobileNavigation("prev")}
              disabled={currentMobileIndex === 0}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-border/60 bg-background/70 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-muted-foreground">
              {currentMobileIndex + 1} of {plans.length}
            </div>
            <button
              onClick={() => handleMobileNavigation("next")}
              disabled={currentMobileIndex === plans.length - 1}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-border/60 bg-background/70 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <Card className="glass rounded-2xl border-border/60 bg-card/80 backdrop-blur shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-semibold tracking-tight gradient-text font-space-grotesk">
                {plans[currentMobileIndex].name}
              </CardTitle>
              <div className="text-center text-3xl font-semibold mt-2 font-space-grotesk tabular-nums">
                {plans[currentMobileIndex].price}
                <span className="text-sm text-muted-foreground">{plans[currentMobileIndex].period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {features.map((category) => (
                <div key={category.category}>
                  <h4 className="font-semibold text-lg mb-4 text-primary font-space-grotesk">{category.category}</h4>
                  <div className="space-y-3">
                    {category.items.map((item) => (
                      <div key={item.feature} className="flex justify-between items-center gap-4">
                        <span className="text-sm flex-1">{item.feature}</span>
                        <div className="text-right flex-shrink-0">
                          {renderFeatureValue(item[plans[currentMobileIndex].key])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-2">
            {plans.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentMobileIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${index === currentMobileIndex ? "bg-primary w-6" : "bg-muted-foreground/30"}`}
                aria-label={`Go to plan ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="hidden lg:block">
          <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-lg backdrop-blur overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border/60 bg-muted/40">
                    <th className="sticky left-0 z-10 bg-muted/40 text-center p-5 font-semibold text-base text-foreground min-w-[240px] border-r border-border/60 font-space-grotesk">
                      Plans
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.name}
                        className={`text-center p-5 font-semibold text-base text-foreground min-w-[180px] relative border-r border-border/60 last:border-r-0 font-space-grotesk ${plan.isPopular ? "bg-primary/5" : "bg-muted/40"}`}
                      >
                        {plan.name}
                        <div className="text-2xl font-semibold mt-2 text-foreground font-space-grotesk tabular-nums">
                          {plan.price}
                          <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((category) => (
                    <React.Fragment key={category.category}>
                      <tr>
                        <td colSpan={5} className="p-4 bg-muted/50 sticky left-0 z-10 text-center border-b border-border/60">
                          <h4 className="font-semibold text-base text-primary font-space-grotesk">{category.category}</h4>
                        </td>
                      </tr>
                      {category.items.map((item, index) => (
                        <tr
                          key={item.feature}
                          className={`border-b border-border/40 ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                        >
                          <td className="sticky left-0 z-10 bg-inherit p-4 font-medium text-sm text-foreground border-r border-border/60">
                            {item.feature}
                          </td>
                          <td className="p-4 text-center border-r border-border/40">{renderFeatureValue(item.rookie)}</td>
                          <td className="p-4 text-center border-r border-border/40">{renderFeatureValue(item.starter)}</td>
                          <td className="p-4 text-center border-r border-border/40 bg-primary/5">{renderFeatureValue(item.rising)}</td>
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
      </div>
    </section>
  );
};

export default PricingComparison;
