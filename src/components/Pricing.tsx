import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      title: "Explore & Discover",
      description: "Perfect for casual creators ready to explore new horizons",
      monthlyPrice: 9.99,
      annualPrice: 99.99,
      features: [
        "Access to 1000+ creative templates",
        "Basic editing tools",
        "Community forum access",
        "Mobile app included",
        "Email support"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Plus",
      title: "Unlock Endless Creativity",
      description: "Best value for serious creators who want full access and premium perks",
      monthlyPrice: 19.99,
      annualPrice: 199.99,
      features: [
        "Unlimited access to all content",
        "Premium AI-powered tools",
        "Exclusive weekly releases",
        "Personalized recommendations",
        "Priority support",
        "Export in 4K quality",
        "Collaboration features"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Family",
      title: "Create Together",
      description: "Share the creative journey with up to 6 family members",
      monthlyPrice: 29.99,
      annualPrice: 299.99,
      features: [
        "Everything in Plus",
        "Up to 6 user profiles",
        "Shared project workspace",
        "Family content filters",
        "Individual progress tracking",
        "Bulk export options",
        "Family admin controls"
      ],
      cta: "Start Free Trial",
      popular: false
    }
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
              Pricing
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Affordable pricing plans designed for every creative. Choose the perfect 
              membership tier and unlock unlimited design potential.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-b from-background to-background/50" id="pricing-plans">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            Choose Your Creative Journey
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Unlock your creative potential with flexible plans designed for every level of ambition
          </p>
          
          {/* Annual/Monthly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                isAnnual ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  isAnnual ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            {isAnnual && (
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-primary/20">
                Save 20%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto stagger-child">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative glass-card p-8 hover-lift transition-all duration-500 ${
                plan.popular 
                  ? 'border-2 border-primary/30 scale-105 shadow-[0_0_40px_hsl(var(--primary)/0.2)]' 
                  : 'border border-border/50'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-medium flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-lg font-semibold text-primary mb-2">{plan.title}</p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold">
                    ${isAnnual ? (plan.annualPrice / 12).toFixed(2) : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Billed annually (${plan.annualPrice})
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full py-3 font-medium btn-magnetic ${
                  plan.popular 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                    : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Reassurance */}
        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-muted-foreground">
            ✨ Cancel anytime. No hidden fees. 30-day money-back guarantee.
          </p>
        </div>
      </div>
    </section>
    </>
  );
};

export default Pricing;