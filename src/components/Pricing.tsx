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
      {/* Pricing Section */}
      <section className="relative py-24 overflow-hidden" id="pricing-plans">
        {/* Animated Background with Multiple Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
        
        {/* Enhanced Animated Floating Elements with Diverse Movement Patterns */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float opacity-80 hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-zigzag opacity-70" style={{ animationDelay: '2s' }} />
        <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full animate-diagonal-float" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full animate-figure-eight" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full animate-orbit opacity-50" style={{ animationDelay: '5s' }} />
        <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/40 to-primary/40 rounded-full animate-float-reverse opacity-40" style={{ animationDelay: '6s' }} />
        
        {/* Additional Dynamic Floating Elements with Varied Animations */}
        <div className="absolute top-32 left-1/4 w-3 h-3 bg-primary/60 rounded-full animate-drift opacity-80" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-80 right-1/4 w-7 h-7 bg-secondary/30 rounded-full animate-spiral opacity-60" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-accent/50 rounded-full animate-orbit opacity-70" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-96 left-16 w-5 h-5 bg-primary/40 rounded-full animate-figure-eight opacity-50" style={{ animationDelay: '3.5s' }} />
        <div className="absolute bottom-96 right-16 w-2 h-2 bg-secondary/60 rounded-full animate-zigzag opacity-80" style={{ animationDelay: '4.5s' }} />
        <div className="absolute top-44 left-3/4 w-6 h-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-diagonal-float opacity-40" style={{ animationDelay: '5.5s' }} />
        <div className="absolute bottom-44 right-3/4 w-3 h-3 bg-gradient-to-tl from-secondary/40 to-primary/40 rounded-full animate-float-reverse opacity-60" style={{ animationDelay: '6.5s' }} />
        
        {/* Moving Gradient Orbs with Complex Paths */}
        <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full animate-orbit opacity-30 blur-sm" style={{ animationDelay: '7s' }} />
        <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full animate-spiral opacity-25 blur-md" style={{ animationDelay: '8s' }} />
        <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full animate-figure-eight opacity-35 blur-sm" style={{ animationDelay: '9s' }} />
        <div className="absolute top-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full animate-diagonal-float opacity-30 blur-md" style={{ animationDelay: '10s' }} />
        
        {/* Additional Tiny Floating Particles */}
        <div className="absolute top-16 left-1/2 w-1 h-1 bg-primary/70 rounded-full animate-drift opacity-90" style={{ animationDelay: '11s' }} />
        <div className="absolute bottom-16 right-1/2 w-1 h-1 bg-secondary/80 rounded-full animate-zigzag opacity-85" style={{ animationDelay: '12s' }} />
        <div className="absolute top-72 left-12 w-2 h-2 bg-accent/60 rounded-full animate-orbit opacity-75" style={{ animationDelay: '13s' }} />
        <div className="absolute bottom-72 right-12 w-2 h-2 bg-primary/50 rounded-full animate-spiral opacity-70" style={{ animationDelay: '14s' }} />
      <div className="container mx-auto px-4 relative z-20">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            Choose Your Plan
          </h1>
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