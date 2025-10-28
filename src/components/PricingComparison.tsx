import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
const PricingComparison = () => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      category: "BizMap AI Conversations",
      items: [
        { feature: "Monthly AI Conversations", free: "5/month", creator: "50/month", professional: "150/month", enterprise: "500/month" }
      ]
    },
    {
      category: "Community Access",
      items: [
        { feature: "Community Features", free: "Basic (read & post)", creator: "Full features", professional: "AI-enhanced insights", enterprise: "All features + unlimited" },
        { feature: "Posting & Commenting", free: true, creator: true, professional: true, enterprise: true },
        { feature: "Voting & Trending", free: false, creator: true, professional: true, enterprise: true },
        { feature: "AI Post Insights", free: false, creator: false, professional: true, enterprise: true }
      ]
    },
    {
      category: "Prompt Library",
      items: [
        { feature: "Access Level", free: "View only", creator: "Copy/export", professional: "Copy/export", enterprise: "Copy/export" },
        { feature: "Custom Prompts", free: false, creator: true, professional: true, enterprise: true }
      ]
    },
    {
      category: "Sprint Planning & Kanban",
      items: [
        { feature: "Active Sprints", free: "1 sprint", creator: "Unlimited", professional: "Unlimited", enterprise: "Unlimited" },
        { feature: "Kanban Boards", free: false, creator: true, professional: true, enterprise: true },
        { feature: "Task Management", free: "Basic", creator: "Advanced", professional: "Advanced", enterprise: "Advanced" }
      ]
    },
    {
      category: "Market Intelligence",
      items: [
        { feature: "Market Widget", free: false, creator: true, professional: true, enterprise: true },
        { feature: "Trend Analysis", free: false, creator: false, professional: false, enterprise: true },
        { feature: "Advanced Analytics", free: false, creator: false, professional: false, enterprise: true }
      ]
    },
    {
      category: "Business Reports",
      items: [
        { feature: "Custom Reports", free: false, creator: false, professional: true, enterprise: true },
        { feature: "AI Analysis Reports", free: false, creator: false, professional: false, enterprise: true },
        { feature: "Export Capabilities", free: false, creator: false, professional: true, enterprise: true }
      ]
    },
    {
      category: "Collaboration Tools",
      items: [
        { feature: "Text Chat", free: false, creator: true, professional: true, enterprise: true },
        { feature: "File Sharing", free: false, creator: true, professional: true, enterprise: true },
        { feature: "Whiteboarding", free: false, creator: false, professional: true, enterprise: true },
        { feature: "Polls & Voting", free: false, creator: false, professional: true, enterprise: true },
        { feature: "Video Calls", free: false, creator: false, professional: true, enterprise: true },
        { feature: "Unlimited Participants", free: false, creator: false, professional: false, enterprise: true }
      ]
    },
    {
      category: "Analytics & Tracking",
      items: [
        { feature: "Success Score Analytics", free: false, creator: false, professional: true, enterprise: true },
        { feature: "Progress Tracking", free: "Basic", creator: "Advanced", professional: "Advanced", enterprise: "Advanced" }
      ]
    },
    {
      category: "Integrations & API",
      items: [
        { feature: "API Access", free: false, creator: false, professional: false, enterprise: true },
        { feature: "Custom Integrations", free: false, creator: false, professional: false, enterprise: true }
      ]
    },
    {
      category: "Support",
      items: [
        { feature: "Support Level", free: "Email", creator: "Priority email", professional: "Priority + community", enterprise: "Dedicated manager" },
        { feature: "Response Time", free: "48 hours", creator: "24 hours", professional: "12 hours", enterprise: "4 hours" }
      ]
    },
    {
      category: "Additional Features",
      items: [
        { feature: "Custom Templates", free: false, creator: false, professional: false, enterprise: true },
        { feature: "Priority Feature Requests", free: false, creator: false, professional: false, enterprise: true },
        { feature: "Onboarding & Training", free: false, creator: false, professional: false, enterprise: true }
      ]
    }
  ];

  const plans = [
    { name: "Free", price: "$0", period: "/month", isPopular: false },
    { name: "Creator", price: "$9.99", period: "/month", isPopular: false },
    { name: "Professional", price: "$19.99", period: "/month", isPopular: true },
    { name: "Enterprise", price: "$29.99", period: "/month", isPopular: false }
  ];

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    handleScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, []);
  const renderFeatureValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
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
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Feature Comparison
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Compare Our Packages
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
            See exactly what's included in each pricing plan. 
            Choose the perfect tier for your entrepreneurial platform needs.
          </p>
          <p className="text-sm text-muted-foreground hidden lg:block">
            Scroll horizontally to see all features →
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
                      const planKey = plans[currentMobileIndex].name.toLowerCase() as 'free' | 'creator' | 'professional' | 'enterprise';
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

        {/* Desktop comparison table with horizontal scroll */}
        <div className="hidden lg:block relative">
          {/* Scroll indicators */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-20" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-20" />
          )}

          <Card className="glass border-border overflow-hidden">
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto scroll-smooth"
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 z-10 bg-background text-left p-6 font-semibold min-w-[240px] border-r border-border">
                      Features
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.name}
                        className={`text-center p-6 font-semibold text-lg min-w-[180px] relative ${
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
                  {features.map(category => (
                    <React.Fragment key={category.category}>
                      <tr>
                        <td 
                          colSpan={5} 
                          className="p-4 bg-muted/50 sticky left-0 z-10"
                        >
                          <h4 className="font-semibold text-primary">{category.category}</h4>
                        </td>
                      </tr>
                      {category.items.map((item, index) => (
                        <tr 
                          key={item.feature} 
                          className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                        >
                          <td className="sticky left-0 z-10 bg-inherit p-4 font-medium border-r border-border">
                            {item.feature}
                          </td>
                          <td className="p-4 text-center">{renderFeatureValue(item.free)}</td>
                          <td className="p-4 text-center">{renderFeatureValue(item.creator)}</td>
                          <td className="p-4 text-center bg-primary/5">{renderFeatureValue(item.professional)}</td>
                          <td className="p-4 text-center">{renderFeatureValue(item.enterprise)}</td>
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