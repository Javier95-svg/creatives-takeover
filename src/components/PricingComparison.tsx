import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";

const PricingComparison = () => {
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

  const features = [
    {
      category: "Credits & Dashboard",
      items: [
        { feature: "Monthly Credits", free: "10 Credits", creator: "50 Credits", professional: "150 Credits" },
        { feature: "Dashboard Access", free: "Preview only", creator: "Full access", professional: "Full access" }
      ]
    },
    {
      category: "BizMap AI",
      items: [
        { feature: "Business Planning (1 credit/msg)", free: "10 messages", creator: "50 messages", professional: "150 messages" },
        { feature: "Product–Market Fit Lab", free: "Read-only", creator: "Full access (8 credits)", professional: "Full + insights (8 credits)" },
        { feature: "Tech Stack Generator", free: "View only", creator: "Full access (3 credits)", professional: "Advanced (3 credits)" },
        { feature: "Prompt Library", free: "View only", creator: "Full access", professional: "Full + custom templates" }
      ]
    },
    {
      category: "Insighta",
      items: [
        { feature: "VC Search", free: "5 views/month", creator: "25 views/month", professional: "Unlimited" },
        { feature: "Email Templates", free: "View only", creator: "AI generation (3 credits)", professional: "AI + custom (3 credits)" },
        { feature: "Pitch Deck Analyzer", free: false, creator: "Full access (8 credits)", professional: "Advanced + benchmarks (8 credits)" },
        { feature: "Insighta Test", free: "Basic (8 credits)", creator: "Full access (8 credits)", professional: "Full + personalized (8 credits)" }
      ]
    },
    {
      category: "Community",
      items: [
        { feature: "Find a Mentor", free: "Browse only", creator: "Full access", professional: "Full + verified priority" },
        { feature: "Find a Co-Founder", free: "Browse only", creator: "Full access", professional: "Full + featured listings" },
        { feature: "Stories Content", free: "Full access", creator: "Full access", professional: "Full access" }
      ]
    },
    {
      category: "Support & Access",
      items: [
        { feature: "Support", free: "Community", creator: "Priority support", professional: "Priority (24h response)" },
        { feature: "Early Access to New Features", free: false, creator: false, professional: true }
      ]
    }
  ];

  const plans = [
    { name: "Rookie", price: "$0", period: "/month", isPopular: false },
    { name: "Rising", price: "$32.99", period: "/month", isPopular: true },
    { name: "Pro", price: "$74.99", period: "/month", isPopular: false }
  ];
  const renderFeatureValue = (value: any, animated: boolean = false) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className={`w-5 h-5 text-primary mx-auto transition-all duration-300 ${
          animated ? 'animate-scale-in' : ''
        }`} />
      ) : (
        <X className="w-5 h-5 text-gray-300 dark:text-muted-foreground/40 mx-auto" />
      );
    }
    return <span className="text-sm font-medium text-center block text-gray-900 dark:text-foreground">{value}</span>;
  };

  const handleMobileNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentMobileIndex > 0) {
      setCurrentMobileIndex(currentMobileIndex - 1);
    } else if (direction === 'next' && currentMobileIndex < plans.length - 1) {
      setCurrentMobileIndex(currentMobileIndex + 1);
    }
  };
  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
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
            See exactly what's included in each pricing plan. 
            Choose the perfect tier for your entrepreneurial needs.
          </p>
        </div>

        {/* Mobile-friendly comparison with navigation */}
        <div className="lg:hidden space-y-6 mb-16">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => handleMobileNavigation('prev')}
              disabled={currentMobileIndex === 0}
              className="p-2 rounded-full border border-border/60 bg-background/70 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-muted-foreground">
              {currentMobileIndex + 1} of {plans.length}
            </div>
            <button
              onClick={() => handleMobileNavigation('next')}
              disabled={currentMobileIndex === plans.length - 1}
              className="p-2 rounded-full border border-border/60 bg-background/70 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
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
              {features.map(category => (
                <div key={category.category}>
                  <h4 className="font-semibold text-lg mb-4 text-primary font-space-grotesk">{category.category}</h4>
                  <div className="space-y-3">
                    {category.items.map(item => {
                      // Map display names to data keys
                      const planNameMap: Record<string, 'free' | 'creator' | 'professional'> = {
                        'Rookie': 'free',
                        'Rising': 'creator',
                        'Pro': 'professional'
                      };
                      const planKey = planNameMap[plans[currentMobileIndex].name];
                      return (
                        <div key={item.feature} className="flex justify-between items-center gap-4">
                          <span className="text-sm flex-1">{item.feature}</span>
                          <div className="text-right flex-shrink-0">
                            {renderFeatureValue(item[planKey])}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mobile dots indicator */}
          <div className="flex justify-center gap-2">
            {plans.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentMobileIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentMobileIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                }`}
                aria-label={`Go to plan ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop comparison table with animations */}
        <div className="hidden lg:block">
          <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-lg backdrop-blur overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border/60 bg-muted/40">
                    <th className="sticky left-0 z-10 bg-muted/40 text-center p-5 font-semibold text-base text-foreground min-w-[240px] border-r border-border/60 font-space-grotesk">
                      Plans
                    </th>
                    {plans.map((plan, index) => (
                      <th
                        key={plan.name}
                        style={{ animationDelay: `${index * 0.1}s` }}
                        className={`text-center p-5 font-semibold text-base text-foreground min-w-[180px] relative animate-fade-in border-r border-border/60 last:border-r-0 font-space-grotesk ${
                          plan.isPopular ? 'bg-primary/5' : 'bg-muted/40'
                        }`}
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
                  {features.map((category, catIndex) => (
                    <React.Fragment key={category.category}>
                      <tr 
                        style={{ animationDelay: `${(catIndex + 1) * 0.15}s` }}
                        className="animate-fade-in"
                      >
                        <td
                          colSpan={4}
                          className="p-4 bg-muted/50 sticky left-0 z-10 text-center border-b border-border/60"
                        >
                          <h4 className="font-semibold text-base text-primary font-space-grotesk">{category.category}</h4>
                        </td>
                      </tr>
                      {category.items.map((item, index) => {
                        const isHighlighted = highlightedRow === item.feature;
                        return (
                          <tr 
                            key={item.feature}
                            style={{ animationDelay: `${(catIndex + 1) * 0.15 + (index + 1) * 0.05}s` }}
                            className={`animate-fade-in cursor-pointer transition-all duration-300 border-b border-border/40 ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/20"
                            } ${
                              isHighlighted ? 'bg-primary/10 shadow-md scale-[1.01]' : 'hover:bg-muted/40'
                            }`}
                            onClick={() => setHighlightedRow(isHighlighted ? null : item.feature)}
                          >
                            <td className={`sticky left-0 z-10 bg-inherit p-4 font-medium text-sm text-foreground border-r border-border/60 ${
                              isHighlighted ? 'text-primary' : ''
                            }`}>
                              {item.feature}
                            </td>
                            <td className="p-4 text-center border-r border-border/40">{renderFeatureValue(item.free, isHighlighted)}</td>
                            <td className="p-4 text-center border-r border-border/40">{renderFeatureValue(item.creator, isHighlighted)}</td>
                            <td className="p-4 text-center bg-primary/5">{renderFeatureValue(item.professional, isHighlighted)}</td>
                          </tr>
                        );
                      })}
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
