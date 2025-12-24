import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import PricingWallpaper from "@/components/wallpapers/PricingWallpaper";

const PricingComparison = () => {
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

  const features = [
    {
      category: "Credits & Access",
      items: [
        { feature: "Monthly Credits", free: "10 Credits", creator: "50 Credits", professional: "150 Credits" },
        { feature: "Dashboard Access", free: false, creator: true, professional: true }
      ]
    },
    {
      category: "BizMap AI",
      items: [
        { feature: "Business Planning", free: true, creator: true, professional: true },
        { feature: "Product–Market Fit Lab", free: false, creator: true, professional: true },
        { feature: "Tech Stack", free: false, creator: false, professional: true }
      ]
    },
    {
      category: "Content & Tools",
      items: [
        { feature: "Prompt Library", free: "Free Models Only", creator: "Full Access", professional: "Full Access" },
        { feature: "Insighta Test Assessment", free: true, creator: true, professional: true },
        { feature: "Investor Matchmaker (Insighta)", free: false, creator: false, professional: true }
      ]
    },
    {
      category: "Community & Opportunities",
      items: [
        { feature: "Funding Opportunities", free: true, creator: true, professional: true },
        { feature: "Discovery Calls with Mentors (Community)", free: false, creator: true, professional: true },
        { feature: "Stories (Content)", free: "Full access", creator: "Full access", professional: "Full access" }
      ]
    }
  ];

  const plans = [
    { name: "Free", price: "$0", period: "/month", isPopular: false },
    { name: "Creator", price: "$19.99", period: "/month", isPopular: true },
    { name: "Professional", price: "$39.99", period: "/month", isPopular: false }
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
      <PricingWallpaper />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-6">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Feature Comparison
            </Badge>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-8 pb-2 gradient-text">
            Compare Our Packages
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
              className="p-2 rounded-lg border border-border disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-muted-foreground">
              {currentMobileIndex + 1} of {plans.length}
            </div>
            <button
              onClick={() => handleMobileNavigation('next')}
              disabled={currentMobileIndex === plans.length - 1}
              className="p-2 rounded-lg border border-border disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="text-center text-2xl gradient-text">
                {plans[currentMobileIndex].name}
              </CardTitle>
              <div className="text-center text-3xl font-bold mt-2">
                {plans[currentMobileIndex].price}
                <span className="text-sm text-muted-foreground">{plans[currentMobileIndex].period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {features.map(category => (
                <div key={category.category}>
                  <h4 className="font-semibold text-lg mb-4 text-primary">{category.category}</h4>
                  <div className="space-y-3">
                    {category.items.map(item => {
                      const planKey = plans[currentMobileIndex].name.toLowerCase() as 'free' | 'creator' | 'professional';
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
          <Card className="border border-gray-200 dark:border-border bg-white dark:bg-card shadow-sm dark:shadow-none overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/50">
                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-background text-center p-5 font-bold text-base text-gray-900 dark:text-foreground min-w-[240px] border-r border-gray-200 dark:border-border">
                      Plans
                    </th>
                    {plans.map((plan, index) => (
                      <th
                        key={plan.name}
                        style={{ animationDelay: `${index * 0.1}s` }}
                        className={`text-center p-5 font-bold text-base text-gray-900 dark:text-foreground min-w-[180px] relative animate-fade-in border-r border-gray-200 dark:border-border last:border-r-0 ${
                          plan.isPopular ? 'bg-blue-50 dark:bg-primary/5' : 'bg-gray-50 dark:bg-muted/50'
                        }`}
                      >
                        {plan.name}
                        <div className="text-2xl font-bold mt-2 text-gray-900 dark:text-foreground">
                          {plan.price}
                          <span className="text-sm font-normal text-gray-600 dark:text-muted-foreground">{plan.period}</span>
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
                          className="p-4 bg-gray-100 dark:bg-muted/50 sticky left-0 z-10 text-center border-b border-gray-200 dark:border-border"
                        >
                          <h4 className="font-semibold text-base text-gray-900 dark:text-primary">{category.category}</h4>
                        </td>
                      </tr>
                      {category.items.map((item, index) => {
                        const isHighlighted = highlightedRow === item.feature;
                        return (
                          <tr 
                            key={item.feature}
                            style={{ animationDelay: `${(catIndex + 1) * 0.15 + (index + 1) * 0.05}s` }}
                            className={`animate-fade-in cursor-pointer transition-all duration-300 border-b border-gray-100 dark:border-border/50 ${
                              index % 2 === 0 ? "bg-white dark:bg-background" : "bg-gray-50/50 dark:bg-muted/20"
                            } ${
                              isHighlighted ? 'bg-blue-50 dark:bg-primary/10 shadow-md scale-[1.01]' : 'hover:bg-gray-100 dark:hover:bg-muted/40'
                            }`}
                            onClick={() => setHighlightedRow(isHighlighted ? null : item.feature)}
                          >
                            <td className={`sticky left-0 z-10 bg-inherit p-4 font-medium text-sm text-gray-900 dark:text-foreground border-r border-gray-200 dark:border-border ${
                              isHighlighted ? 'text-blue-600 dark:text-primary' : ''
                            }`}>
                              {item.feature}
                            </td>
                            <td className="p-4 text-center border-r border-gray-100 dark:border-border/50">{renderFeatureValue(item.free, isHighlighted)}</td>
                            <td className="p-4 text-center border-r border-gray-100 dark:border-border/50">{renderFeatureValue(item.creator, isHighlighted)}</td>
                            <td className="p-4 text-center bg-blue-50/50 dark:bg-primary/5">{renderFeatureValue(item.professional, isHighlighted)}</td>
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