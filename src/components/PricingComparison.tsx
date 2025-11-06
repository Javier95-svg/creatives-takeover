import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";

const PricingComparison = () => {
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

  const features = [
    {
      category: "BizMap AI Conversations",
      items: [
        { feature: "Monthly Credits", free: "5 Credits", creator: "50 Credits", professional: "150 Credits" }
      ]
    },
    {
      category: "Community Features",
      items: [
        { feature: "Community Access", free: true, creator: true, professional: true },
        { feature: "Create Posts", free: true, creator: true, professional: true },
        { feature: "Comment & Engage", free: true, creator: true, professional: true }
      ]
    },
    {
      category: "Sprint Planning",
      items: [
        { feature: "Sprint Planning Tools", free: "Basic", creator: "Full access", professional: "Full access" },
        { feature: "Task Management", free: "Basic", creator: "Advanced", professional: "Advanced" },
        { feature: "Daily Check-ins", free: false, creator: true, professional: true }
      ]
    },
    {
      category: "Business Tools",
      items: [
        { feature: "Market Intelligence Widget", free: false, creator: true, professional: true },
        { feature: "Business Report Generation", free: false, creator: false, professional: true },
        { feature: "PDF Export", free: false, creator: false, professional: true }
      ]
    },
    {
      category: "Support",
      items: [
        { feature: "Email Support", free: true, creator: true, professional: true },
        { feature: "Priority Support", free: false, creator: true, professional: true }
      ]
    }
  ];

  const plans = [
    { name: "Free", price: "$0", period: "/month", isPopular: false },
    { name: "Creator", price: "$19.99", period: "/month", isPopular: false },
    { name: "Professional", price: "$39.99", period: "/month", isPopular: false }
  ];
  const renderFeatureValue = (value: any, animated: boolean = false) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className={`w-5 h-5 text-primary mx-auto transition-all duration-300 ${
          animated ? 'animate-scale-in' : ''
        }`} />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
      );
    }
    return <span className="text-sm font-medium text-center block">{value}</span>;
  };

  const handleMobileNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentMobileIndex > 0) {
      setCurrentMobileIndex(currentMobileIndex - 1);
    } else if (direction === 'next' && currentMobileIndex < plans.length - 1) {
      setCurrentMobileIndex(currentMobileIndex + 1);
    }
  };
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-6">
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
                {plans[currentMobileIndex].isPopular && (
                  <Badge className="ml-2 bg-primary text-white">Most Popular</Badge>
                )}
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
          <Card className="glass border-border overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 bg-background text-center p-6 font-semibold min-w-[240px] border-r border-border">
                      Plans
                    </th>
                    {plans.map((plan, index) => (
                      <th
                        key={plan.name}
                        style={{ animationDelay: `${index * 0.1}s` }}
                        className={`text-center p-6 font-semibold text-lg min-w-[180px] relative animate-fade-in ${
                          plan.isPopular ? 'bg-primary/5' : ''
                        }`}
                      >
                        {plan.isPopular && (
                          <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs">
                            Most Popular
                          </Badge>
                        )}
                        {plan.name}
                        <div className="text-2xl font-bold mt-2">
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
                          className="p-4 bg-muted/50 sticky left-0 z-10 text-center"
                        >
                          <h4 className="font-semibold text-primary">{category.category}</h4>
                        </td>
                      </tr>
                      {category.items.map((item, index) => {
                        const isHighlighted = highlightedRow === item.feature;
                        return (
                          <tr 
                            key={item.feature}
                            style={{ animationDelay: `${(catIndex + 1) * 0.15 + (index + 1) * 0.05}s` }}
                            className={`animate-fade-in cursor-pointer transition-all duration-300 ${
                              index % 2 === 0 ? "bg-background" : "bg-muted/20"
                            } ${
                              isHighlighted ? 'bg-primary/10 shadow-lg scale-[1.02]' : 'hover:bg-muted/40'
                            }`}
                            onClick={() => setHighlightedRow(isHighlighted ? null : item.feature)}
                          >
                            <td className={`sticky left-0 z-10 bg-inherit p-4 font-medium border-r border-border ${
                              isHighlighted ? 'text-primary' : ''
                            }`}>
                              {item.feature}
                            </td>
                            <td className="p-4 text-center">{renderFeatureValue(item.free, isHighlighted)}</td>
                            <td className="p-4 text-center">{renderFeatureValue(item.creator, isHighlighted)}</td>
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