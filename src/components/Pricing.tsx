import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

const Pricing = () => {

  const plans = [
    {
      name: "Starter",
      title: "Explore & Discover",
      description: "Perfect for getting started with AI-powered business planning",
      monthlyPrice: 0,
      annualPrice: 0,
      credits: 50,
      integrationCredits: 5,
      features: [
        "Access to BizMap AI chatbot",
        "Basic prompt library access",
        "Community forum participation",
        "Email support",
        "Getting started guides"
      ],
      cta: "Start Creating",
      popular: false
    },
    {
      name: "Elite",
      title: "Unlock Full Potential",
      description: "Best value for serious entrepreneurs who want comprehensive AI assistance",
      monthlyPrice: 19.99,
      annualPrice: 199.99,
      credits: 500,
      integrationCredits: 50,
      features: [
        "Unlimited BizMap AI conversations",
        "Full prompt library access",
        "Premium community features",
        "Priority support",
        "Advanced business templates",
        "Export capabilities",
        "Custom business analysis"
      ],
      cta: "Get Started",
      popular: true
    },
    {
      name: "Teams",
      title: "Scale Together",
      description: "Perfect for teams collaborating on business development",
      monthlyPrice: 39.99,
      annualPrice: 299.99,
      credits: 1500,
      integrationCredits: 150,
      features: [
        "Everything in Elite",
        "Up to 5 team members",
        "Shared workspace access",
        "Team collaboration tools",
        "Bulk prompt operations",
        "Team admin controls",
        "Dedicated account manager"
      ],
      cta: "Get Started",
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
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>


              {/* Features List */}
              <div className="mb-8 space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  if (plan.name === "Starter") {
                    window.open("https://creatives-takeover.com/dream2plan", "_blank");
                  } else if (plan.name === "Elite") {
                    window.open("https://pay.creatives-takeover.com/b/14A3cv65X5rG6U26i70ZW00", "_blank");
                  } else if (plan.name === "Teams") {
                    window.open("https://pay.creatives-takeover.com/b/7sY8wP3XP3jy3HQ8qf0ZW01", "_blank");
                  }
                }}
                className={`w-full py-3 font-medium btn-magnetic hover-scale transition-all duration-300 ${
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

      </div>
    </section>
    </>
  );
};

export default Pricing;