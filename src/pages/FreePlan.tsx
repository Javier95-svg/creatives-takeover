import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import ChatbotWidget from "@/components/ChatbotWidget";
import SEO from "@/components/SEO";
import { Check, Sparkles, Zap, Users, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FreePlan = () => {
  const freeFeatures = [
    { icon: Sparkles, text: "3 BizMap AI business plans per month", highlight: true },
    { icon: Users, text: "Full community access (unlimited)", highlight: true },
    { icon: TrendingUp, text: "Prompt library (100+ prompts)", highlight: false },
    { icon: TrendingUp, text: "Market intelligence feed", highlight: false },
    { icon: Sparkles, text: "10 AI chat messages per month", highlight: false },
    { icon: Users, text: "Basic accountability partner matching", highlight: false },
  ];

  const plans = [
    {
      name: "Free Forever",
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "3 BizMap AI plans/month",
        "Unlimited community access",
        "100+ prompt library",
        "Market intelligence",
        "10 AI chats/month",
        "Basic partner matching"
      ],
      badge: "Popular",
      cta: "Start Free Now",
      link: "/signup"
    },
    {
      name: "Pro",
      price: "$29",
      description: "For serious builders",
      features: [
        "Everything in Free",
        "Unlimited BizMap AI plans",
        "Unlimited AI chat",
        "Priority support",
        "Advanced analytics",
        "Premium partner matching",
        "Weekly demo days",
        "Custom templates"
      ],
      badge: "Best Value",
      cta: "Upgrade to Pro",
      link: "/pricing"
    },
    {
      name: "Team",
      price: "$99",
      description: "For growing teams",
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Collaboration tools",
        "White-label options",
        "Dedicated support",
        "Custom integrations",
        "Priority features",
        "Team analytics"
      ],
      badge: null,
      cta: "Contact Sales",
      link: "/pricing"
    }
  ];

  return (
    <>
      <SEO
        title="Free Forever Plan - Everything You Need to Launch | Creatives Takeover"
        description="Start building your creative business for free. Get 3 AI business plans, unlimited community access, and 100+ prompts. No credit card required."
        keywords="free business planning, free AI tools, creative business free, startup free tools, entrepreneur free resources"
        url="/free-plan"
      />
      
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          
          {/* Hero Section */}
          <section className="pt-32 pb-16 px-4">
            <div className="container mx-auto max-w-6xl text-center">
              <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
                Free Forever
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 animated-gradient">
                Everything You Need to Launch
                <br />
                <span className="text-3xl md:text-5xl">Free Forever</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                No credit card required. No hidden fees. Start building your creative business today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                  <Link to="/signup">
                    <Sparkles className="mr-2 w-5 h-5" />
                    Start Free Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/demo">
                    Try Demo First
                  </Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                ✨ No credit card required • Get started in 60 seconds • Join 15,000+ creatives
              </p>
            </div>
          </section>

          {/* What's Included Section */}
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-5xl">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                What's Included in Free Forever
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                Everything you need to validate your idea and launch your first product
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeFeatures.map((feature, index) => (
                  <Card key={index} className={`glass-card ${feature.highlight ? 'border-primary/50' : ''}`}>
                    <CardHeader>
                      <feature.icon className={`w-10 h-10 mb-2 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                      <CardTitle className="text-lg">{feature.text}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Plan Comparison */}
          <section className="py-16 px-4 bg-muted/20">
            <div className="container mx-auto max-w-7xl">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Choose Your Path
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                Start free and upgrade when you're ready to scale
              </p>

              <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan, index) => (
                  <Card 
                    key={index} 
                    className={`glass-card relative ${index === 0 ? 'border-primary/50 shadow-lg' : ''}`}
                  >
                    {plan.badge && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        {plan.badge}
                      </Badge>
                    )}
                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                      <div className="mb-2">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        {plan.price !== "$0" && <span className="text-muted-foreground">/month</span>}
                      </div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full" 
                        variant={index === 0 ? "default" : "outline"}
                        asChild
                      >
                        <Link to={plan.link}>
                          {plan.cta}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Why Start Free Section */}
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Why Start with Our Free Plan?
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="glass-card">
                  <CardHeader>
                    <Zap className="w-10 h-10 text-primary mb-2" />
                    <CardTitle>Test Before You Invest</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Create 3 complete business plans to validate your ideas before committing to a paid plan.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <Users className="w-10 h-10 text-primary mb-2" />
                    <CardTitle>Join the Community</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Get unlimited access to our community of 15,000+ creative entrepreneurs for feedback and support.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <TrendingUp className="w-10 h-10 text-primary mb-2" />
                    <CardTitle>Learn the Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Master our tools and processes with hands-on experience before scaling up your operations.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <Sparkles className="w-10 h-10 text-primary mb-2" />
                    <CardTitle>Upgrade Anytime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      When you're ready for unlimited plans and advanced features, upgrade with one click.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 px-4 bg-muted/20">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold text-center mb-12">
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Do I really get this for free forever?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Yes! Our free plan includes 3 business plans per month, unlimited community access, and essential tools forever. No credit card required, ever.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Can I upgrade or downgrade anytime?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Absolutely! Upgrade to Pro or Team when you need more features, or downgrade back to Free at any time. No questions asked.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">What happens when I hit my free plan limits?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Your limits reset monthly. If you need more before then, you can upgrade to Pro for unlimited access or wait until next month.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Is there a trial period for paid plans?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      The free plan is your trial! Test all core features for free, then upgrade when you're ready to scale.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Ready to Start Building?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join 15,000+ creative entrepreneurs who started with our free plan
              </p>
              
              <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                <Link to="/signup">
                  <Sparkles className="mr-2 w-5 h-5" />
                  Start Free Now - No Credit Card
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              <p className="text-sm text-muted-foreground mt-6">
                Takes less than 60 seconds to set up
              </p>
            </div>
          </section>

          <ChatbotWidget />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default FreePlan;