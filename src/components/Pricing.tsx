import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Crown, Check, Sparkles, Zap, Users, TrendingUp, Shield, ArrowRight, Info } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Pricing = () => {
  const { tiers, loading, createCheckout, subscriptionData } = useSubscription();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [comparisonOpen, setComparisonOpen] = useState(false);

  // Feature categories with icons
  const getFeatureCategories = (tierName: string) => {
    const categoryMap: Record<string, Array<{ category: string; icon: any; features: string[] }>> = {
      free: [
        {
          category: "AI Tools",
          icon: Sparkles,
          features: ["5 BizMap AI conversations/month", "Basic prompt library (view only)"]
        },
        {
          category: "Community",
          icon: Users,
          features: ["Forum access (read & post)", "Connect with entrepreneurs"]
        },
        {
          category: "Planning",
          icon: TrendingUp,
          features: ["Basic sprint planning (1 active)", "Task management basics"]
        }
      ],
      creator: [
        {
          category: "AI Tools",
          icon: Sparkles,
          features: ["50 AI conversations/month", "Full prompt library access", "Market intelligence widget"]
        },
        {
          category: "Community",
          icon: Users,
          features: ["Full community features", "Post, comment & vote", "Reputation system"]
        },
        {
          category: "Planning",
          icon: TrendingUp,
          features: ["Unlimited sprint planning", "Kanban boards", "Basic collaboration tools"]
        },
        {
          category: "Support",
          icon: Shield,
          features: ["Priority email support", "Response within 24h"]
        }
      ],
      professional: [
        {
          category: "AI Tools",
          icon: Sparkles,
          features: ["150 AI conversations/month", "AI-enhanced insights", "Custom report generation", "Advanced analytics"]
        },
        {
          category: "Collaboration",
          icon: Users,
          features: ["Whiteboarding & polls", "Video calls", "File sharing", "Real-time sync"]
        },
        {
          category: "Analytics",
          icon: TrendingUp,
          features: ["Success score tracking", "Trend analysis", "Export all reports", "Performance metrics"]
        },
        {
          category: "Support",
          icon: Shield,
          features: ["Priority support", "Community access", "12h response time"]
        }
      ],
      enterprise: [
        {
          category: "AI Tools",
          icon: Sparkles,
          features: ["500 AI conversations/month", "Custom AI analysis", "API access", "White-label options"]
        },
        {
          category: "Team Features",
          icon: Users,
          features: ["Unlimited participants", "Advanced permissions", "Team analytics", "Custom templates"]
        },
        {
          category: "Intelligence",
          icon: TrendingUp,
          features: ["Advanced market intel", "Competitive analysis", "Custom integrations", "Priority features"]
        },
        {
          category: "Support",
          icon: Shield,
          features: ["Dedicated account manager", "24/7 priority support", "Custom onboarding", "SLA guarantee"]
        }
      ]
    };
    return categoryMap[tierName] || [];
  };

  const getDescription = (tierName: string) => {
    const descriptions: Record<string, string> = {
      free: "Perfect for testing the waters and exploring AI-powered business tools",
      creator: "Everything you need to build and grow as a creative solopreneur",
      professional: "Advanced tools and collaboration for scaling your business",
      enterprise: "Enterprise-grade platform for teams that demand the best"
    };
    return descriptions[tierName] || "";
  };

  const getAnnualDiscount = (tierName: string) => {
    return tierName !== 'free' ? 0.2 : 0; // 20% off annual
  };

  const getTitleAndCTA = (tierName: string) => {
    const details: Record<string, { title: string; cta: string; highlight?: string }> = {
      free: { title: "Starter", cta: "Get Started Free", highlight: "No credit card required" },
      creator: { title: "Creator", cta: "Start Creating", highlight: "Most popular for solopreneurs" },
      professional: { title: "Professional", cta: "Go Pro", highlight: "Best value • Most popular" },
      enterprise: { title: "Enterprise", cta: "Contact Sales", highlight: "Custom solutions" }
    };
    return details[tierName] || { title: "Get Started", cta: "Subscribe" };
  };

  const calculatePrice = (priceCents: number, tierName: string) => {
    if (tierName === 'free') return 0;
    const monthlyPrice = priceCents / 100;
    if (billingPeriod === 'annual') {
      return monthlyPrice * (1 - getAnnualDiscount(tierName));
    }
    return monthlyPrice;
  };

  const handleSubscribe = async (tierName: string) => {
    if (!user) {
      // Redirect to auth page
      window.location.href = "/auth";
      return;
    }
    
    if (tierName === 'free') {
      // Free tier - no checkout needed
      return;
    }

    if (tierName === 'creator') {
      // Redirect to external payment URL for creator tier
      window.open("https://pay.creatives-takeover.com/b/14A3cv65X5rG6U26i70ZW00", "_blank");
      return;
    }

    if (tierName === 'professional') {
      // Redirect to external payment URL for professional tier
      window.open("https://pay.creatives-takeover.com/b/7sY8wP3XP3jy3HQ8qf0ZW01", "_blank");
      return;
    }

    if (tierName === 'enterprise') {
      // Redirect to external payment URL for enterprise tier
      window.open("https://pay.creatives-takeover.com/b/4gMdR91PH3jy0vE21R0ZW02", "_blank");
      return;
    }

    // Use internal checkout for other paid tiers
    await createCheckout(tierName);
  };

  if (loading) {
    return (
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading pricing plans...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Pricing Section */}
      <section className="relative py-24 overflow-hidden" id="pricing-plans">
        {/* Simplified Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10" />
        
        {/* Elegant Floating Elements - Reduced for Performance */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />
        
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Flexible Pricing for Every Stage
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text leading-tight">
            Choose Your Growth Path
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            From solo creators to growing teams — unlock AI-powered tools that scale with your ambition
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Label htmlFor="billing-toggle" className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingPeriod === 'annual'}
              onCheckedChange={(checked) => setBillingPeriod(checked ? 'annual' : 'monthly')}
            />
            <Label htmlFor="billing-toggle" className={billingPeriod === 'annual' ? 'font-semibold' : 'text-muted-foreground'}>
              Annual
            </Label>
            <Badge variant="default" className="bg-green-600 text-white ml-2">
              Save 20%
            </Badge>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Secure payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Join 10,000+ creators</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards - 3-Tier Emphasis Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12">
          {tiers.filter(t => ['creator', 'professional', 'enterprise'].includes(t.tier_name)).map((tier, index) => {
            const { title, cta, highlight } = getTitleAndCTA(tier.tier_name);
            const featureCategories = getFeatureCategories(tier.tier_name);
            const description = getDescription(tier.tier_name);
            const isCurrentPlan = subscriptionData.subscription_tier === tier.tier_name;
            const isPopular = tier.tier_name === 'professional';
            const displayPrice = calculatePrice(tier.price_cents, tier.tier_name);
            const annualSavings = billingPeriod === 'annual' && tier.tier_name !== 'free' 
              ? (tier.price_cents / 100) * 12 * getAnnualDiscount(tier.tier_name)
              : 0;

            return (
              <div
                key={tier.tier_name}
                className={`relative glass-card p-8 transition-all duration-500 animate-fade-in hover:-translate-y-2 flex flex-col ${
                  isCurrentPlan
                    ? 'border-2 border-green-500/50 shadow-2xl shadow-green-500/20'
                    : isPopular 
                    ? 'border-2 border-primary lg:scale-110 shadow-2xl shadow-primary/20 z-10' 
                    : 'border border-border/50 hover:border-primary/30 hover:shadow-xl'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Status Badge */}
                {(isCurrentPlan || isPopular) && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-20">
                    <Badge className={`px-6 py-1.5 text-sm font-semibold flex items-center gap-2 shadow-lg ${
                      isCurrentPlan
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground'
                    }`}>
                      {isCurrentPlan ? (
                        <>
                          <Crown className="w-4 h-4 fill-current" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 fill-current" />
                          Most Popular
                        </>
                      )}
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold mb-2 capitalize">{title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{description}</p>
                  
                  {/* Highlight Badge */}
                  {highlight && (
                    <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary text-xs">
                      {highlight}
                    </Badge>
                  )}
                </div>

                {/* Pricing */}
                <div className="text-center mb-8 pb-8 border-b border-border/50">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-2xl text-muted-foreground">$</span>
                    <span className="text-6xl font-bold tracking-tight">
                      {displayPrice.toFixed(0)}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm text-muted-foreground">.{(displayPrice % 1).toFixed(2).slice(2)}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  </div>
                  {annualSavings > 0 && (
                    <div className="text-sm text-green-600 font-medium">
                      Save ${annualSavings.toFixed(0)}/year
                    </div>
                  )}
                  {billingPeriod === 'annual' && tier.price_cents > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Billed ${(displayPrice * 12).toFixed(0)} annually
                    </div>
                  )}
                </div>

                {/* Features by Category */}
                <div className="mb-8 space-y-6 flex-grow">
                  {featureCategories.map((category, catIndex) => (
                    <div key={catIndex}>
                      <div className="flex items-center gap-2 mb-3">
                        <category.icon className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">{category.category}</h4>
                      </div>
                      <div className="space-y-2 pl-6">
                        {category.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSubscribe(tier.tier_name)}
                  disabled={isCurrentPlan}
                  size="lg"
                  className={`w-full group transition-all duration-300 ${
                    isCurrentPlan
                      ? 'bg-green-600 text-white cursor-default'
                      : isPopular 
                      ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl' 
                      : 'bg-secondary hover:bg-secondary/90 text-secondary-foreground'
                  }`}
                >
                  {isCurrentPlan ? (
                    <>
                      <Crown className="w-4 h-4" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      {cta}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Free Tier Callout */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="glass-card p-6 border border-border/50 hover:border-primary/30 transition-all">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">Start Free, Upgrade Anytime</h3>
                <p className="text-muted-foreground">
                  Get started with 5 AI conversations per month and access to our community — no credit card required
                </p>
              </div>
              <Button 
                onClick={() => handleSubscribe('free')} 
                variant="outline"
                size="lg"
                className="flex-shrink-0"
              >
                Try for Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Comparison Dialog Trigger */}
        <div className="text-center">
          <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="group">
                <Info className="w-4 h-4 mr-2" />
                Compare All Features
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Detailed Feature Comparison</DialogTitle>
                <DialogDescription>
                  Compare all features across our pricing tiers to find the perfect fit
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-4 font-semibold">Feature</th>
                        {['Free', 'Creator', 'Professional', 'Enterprise'].map(tier => (
                          <th key={tier} className="text-center py-4 font-semibold">{tier}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-4 font-medium">AI Conversations</td>
                        <td className="text-center py-4 text-muted-foreground">5/month</td>
                        <td className="text-center py-4 text-muted-foreground">50/month</td>
                        <td className="text-center py-4 text-muted-foreground">150/month</td>
                        <td className="text-center py-4 text-muted-foreground">500/month</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-4 font-medium">Community Access</td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-4 font-medium">Sprint Planning</td>
                        <td className="text-center py-4 text-muted-foreground">1 active</td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-4 font-medium">Market Intelligence</td>
                        <td className="text-center py-4">—</td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-4 font-medium">Collaboration Tools</td>
                        <td className="text-center py-4">—</td>
                        <td className="text-center py-4 text-muted-foreground">Basic</td>
                        <td className="text-center py-4 text-muted-foreground">Advanced</td>
                        <td className="text-center py-4 text-muted-foreground">Unlimited</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-4 font-medium">Custom Reports</td>
                        <td className="text-center py-4">—</td>
                        <td className="text-center py-4">—</td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-4 font-medium">API Access</td>
                        <td className="text-center py-4">—</td>
                        <td className="text-center py-4">—</td>
                        <td className="text-center py-4">—</td>
                        <td className="text-center py-4"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-4 font-medium">Support</td>
                        <td className="text-center py-4 text-muted-foreground">Email</td>
                        <td className="text-center py-4 text-muted-foreground">Priority</td>
                        <td className="text-center py-4 text-muted-foreground">Priority</td>
                        <td className="text-center py-4 text-muted-foreground">24/7 + Manager</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

      </div>
    </section>
    </>
  );
};

export default Pricing;