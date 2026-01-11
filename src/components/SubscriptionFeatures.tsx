import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
  Bot,
  Users,
  TrendingUp,
  Check,
  LayoutDashboard,
  Lightbulb,
  ChevronRight
} from "lucide-react";
import PricingWallpaper from "@/components/wallpapers/PricingWallpaper";

const SubscriptionFeatures = () => {
  const [selectedTier, setSelectedTier] = useState<'free' | 'creator' | 'professional'>('creator');

  const creditBreakdown = {
    bizmap: [
      { name: "AI Chat Message", cost: 1, description: "Every message in Business Planning mode" },
      { name: "Product-Market Fit Lab", cost: 8, description: "Complete PMF analysis with recommendations" },
      { name: "Tech Stack Generator", cost: 3, description: "Custom tech stack for your startup" },
      { name: "Launch Report", cost: 5, description: "Comprehensive business launch roadmap" },
      { name: "Prompt Generation", cost: 2, description: "AI-generated custom prompts" },
    ],
    insighta: [
      { name: "Pitch Deck Analyzer", cost: 8, description: "AI analysis with actionable feedback" },
      { name: "Email Template Generation", cost: 3, description: "Personalized investor outreach emails" },
      { name: "Insighta Test", cost: 8, description: "Fundraising readiness assessment" },
      { name: "Investor Matching", cost: 5, description: "Find VCs aligned with your startup" },
      { name: "One-Pager Generation", cost: 3, description: "Professional one-page pitch document" },
    ],
    dashboard: [
      { name: "Sprint Task Generation", cost: 2, description: "AI-generated sprint tasks and priorities" },
      { name: "Roadmap Generation", cost: 5, description: "Strategic business roadmap" },
      { name: "Market Research", cost: 10, description: "In-depth market analysis and insights" },
      { name: "Financial Analysis", cost: 8, description: "Financial projections and modeling" },
      { name: "Business Insights", cost: 5, description: "Custom business intelligence reports" },
    ],
    community: [
      { name: "Find a Mentor", cost: 0, description: "Browse and connect with mentors", badge: "FREE" },
      { name: "Find a Co-Founder", cost: 0, description: "Discover potential co-founders", badge: "FREE" },
      { name: "Stories Content", cost: 0, description: "Read founder stories and insights", badge: "FREE" },
    ],
  };

  const usageExamples = {
    free: {
      credits: 10,
      example: "10 AI chat messages OR 1 PMF analysis + 2 chat messages",
      typical: "Perfect for exploring ideas and validating concepts",
    },
    creator: {
      credits: 50,
      example: "30 AI chat messages + 1 PMF analysis + 2 tech stacks + 1 pitch deck analyzer",
      typical: "Build your startup with comprehensive AI tools",
    },
    professional: {
      credits: 150,
      example: "100 AI messages + 3 PMF analyses + 5 pitch deck analyses + 5 email templates + market research",
      typical: "Scale your operations with unlimited VC access",
    },
  };

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden" id="features">
      <PricingWallpaper />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-6">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Credits Explained
            </Badge>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 pb-2 gradient-text">
            How Our Credit System Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose your plan based on what you need and how you work.
          </p>
        </div>

        {/* Tier Selector Tabs */}
        <Tabs value={selectedTier} onValueChange={(value) => setSelectedTier(value as 'free' | 'creator' | 'professional')} className="mb-12">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="free">Rookie (10)</TabsTrigger>
            <TabsTrigger value="creator">Rising (50)</TabsTrigger>
            <TabsTrigger value="professional">Pro (150)</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Usage Example Card */}
        <Card className="mb-12 max-w-4xl mx-auto border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {selectedTier === 'free' ? 'Rookie' : selectedTier === 'creator' ? 'Rising' : 'Pro'} Plan Example Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <Badge className="text-lg px-3 py-1">{usageExamples[selectedTier].credits} credits/month</Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Typical monthly usage:</p>
              <p className="text-muted-foreground">{usageExamples[selectedTier].example}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Perfect for:</p>
              <p className="text-muted-foreground">{usageExamples[selectedTier].typical}</p>
            </div>
          </CardContent>
        </Card>

        {/* Credit Breakdown Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* BizMap AI Card */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">BizMap AI</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creditBreakdown.bizmap.map((feature, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{feature.cost} {feature.cost === 1 ? 'credit' : 'credits'}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insighta Card */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Insighta</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creditBreakdown.insighta.map((feature, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{feature.cost} credits</Badge>
                  </div>
                ))}
                {/* VC Search - Non-credit feature */}
                <div className="flex justify-between items-start gap-3 pb-3 border-t-2 border-primary/20 pt-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">VC Search</p>
                    <p className="text-xs text-muted-foreground mt-1">View limits per tier, not credit-based</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 bg-blue-50 dark:bg-blue-950/30">View Limits</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard + Community Card */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {creditBreakdown.dashboard.map((feature, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{feature.cost} credits</Badge>
                  </div>
                ))}
              </div>

              {/* Community Section */}
              <div className="border-t-2 border-primary/20 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Community</h4>
                  <Badge className="ml-auto bg-green-500 text-white">FREE</Badge>
                </div>
                <div className="space-y-2">
                  {creditBreakdown.community.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{feature.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-6">
            Credits reset monthly. Unused credits don't roll over. Choose the plan that fits your pace.
          </p>
          <Button size="lg" asChild>
            <Link to="/pricing#pricing-plans">
              View Pricing Plans
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;