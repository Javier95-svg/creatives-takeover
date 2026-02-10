import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Users,
  TrendingUp,
  Check,
  LayoutDashboard,
  Lightbulb
} from "lucide-react";
import { CREDIT_COSTS } from "@/config/constants";

const SubscriptionFeatures = () => {
  const [selectedTier, setSelectedTier] = useState<'free' | 'creator' | 'professional'>('creator');

  const creditBreakdown = {
    dashboard: [
      { name: "Focus Funnel", cost: 0, description: "Goal tracking and prioritization", badge: "FREE" },
      { name: "Decision Sprint", cost: CREDIT_COSTS.SPRINT_TASK_GENERATION, description: "AI-generated sprint tasks and priorities" },
      { name: "Core Metrics", cost: 0, description: "Track your key performance indicators", badge: "FREE" },
      { name: "Weekly Mission", cost: 0, description: "Weekly goal setting and tracking", badge: "FREE" },
      { name: "Your Tasks", cost: 0, description: "Task management and organization", badge: "FREE" },
      { name: "Roadmap Generation", cost: CREDIT_COSTS.ROADMAP_GENERATION, description: "Strategic business roadmap" },
      { name: "Market Research", cost: CREDIT_COSTS.MARKET_RESEARCH, description: "In-depth market analysis and insights" },
      { name: "Financial Analysis", cost: CREDIT_COSTS.FINANCIAL_ANALYSIS, description: "Financial projections and modeling" },
      { name: "Business Insights", cost: CREDIT_COSTS.BUSINESS_INSIGHTS, description: "Custom business intelligence reports" },
    ],
    bizmap: [
      { name: "Business Planner (AI Chat)", cost: CREDIT_COSTS.AI_CHAT_MESSAGE, description: "Every message in Business Planning mode" },
      { name: "ICP Builder", cost: CREDIT_COSTS.ICP_ANALYSIS, description: "Define your ideal customer profile" },
      { name: "Product-Market Fit Lab", cost: CREDIT_COSTS.PMF_ANALYSIS, description: "Complete PMF analysis with recommendations" },
      { name: "MVP Builder", cost: CREDIT_COSTS.LAUNCH_REPORT, description: "14-day MVP building sprint" },
      { name: "Tech Stack Builder", cost: CREDIT_COSTS.TECH_STACK_GENERATION, description: "Custom tech stack for your startup" },
      { name: "GTM Strategist", cost: CREDIT_COSTS.ROADMAP_GENERATION, description: "End-to-end go-to-market planning" },
      { name: "Launch Report", cost: CREDIT_COSTS.LAUNCH_REPORT, description: "Comprehensive business launch roadmap" },
      { name: "Prompt Generation", cost: CREDIT_COSTS.PROMPT_GENERATION, description: "AI-generated custom prompts" },
    ],
    insighta: [
      { name: "VC Search", cost: 0, description: "Browse venture capital firms (view limits per tier)", badge: "VIEW LIMITS" },
      { name: "Accelerator Hunt", cost: 0, description: "Find accelerator programs (Pro only)", badge: "PRO ONLY" },
      { name: "Pitch Deck Analyzer", cost: CREDIT_COSTS.PITCH_DECK_ANALYZER, description: "AI analysis with actionable feedback" },
      { name: "Email Template Generation", cost: CREDIT_COSTS.EMAIL_TEMPLATE_GENERATION, description: "Personalized investor outreach emails" },
      { name: "Insights Test", cost: CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS, description: "Fundraising readiness assessment" },
      { name: "Investor Matching", cost: CREDIT_COSTS.INVESTOR_MATCHING, description: "Find VCs aligned with your startup" },
      { name: "One-Pager Generation", cost: CREDIT_COSTS.ONEPAGER_GENERATION, description: "Professional one-page pitch document" },
    ],
    community: [
      { name: "Find a Mentor", cost: 0, description: "Browse and connect with mentors", badge: "FREE" },
      { name: "Find a Co-Founder", cost: 0, description: "Discover potential co-founders", badge: "FREE" },
      { name: "Find your Angel", cost: 0, description: "Connect with angel investors (Pro only)", badge: "PRO ONLY" },
      { name: "Discovery Calls", cost: CREDIT_COSTS.DISCOVERY_CALL, description: "Book discovery calls with mentors" },
    ],
    resources: [
      { name: "Stories", cost: 0, description: "Read founder stories and insights", badge: "FREE" },
      { name: "Prompt Library", cost: CREDIT_COSTS.PROMPT_GENERATION, description: "Browse prompts (generation costs credits)", badge: "VIEW FREE" },
    ],
  };

  const usageExamples = {
    free: {
      credits: 25,
      example: "25 AI chat messages OR 1 Market Research + 1 Launch Report + 15 chat messages OR 5 Discovery Calls",
      typical: "Perfect for exploring ideas and validating concepts with Dashboard basics and mentor discovery calls",
    },
    creator: {
      credits: 50,
      example: "30 AI chat messages + 1 ICP Builder + 1 PMF analysis + 2 tech stacks + 1 pitch deck analyzer + 2 email templates OR 10 Discovery Calls",
      typical: "Build your startup with comprehensive AI tools across Learn and Build phases, plus mentor discovery calls",
    },
    professional: {
      credits: 150,
      example: "100 AI messages + 1 GTM Strategist + 3 PMF analyses + 5 pitch deck analyses + 5 email templates + market research + MVP Builder OR 30 Discovery Calls",
      typical: "Scale your operations with unlimited VC access, complete Measure phase tools, and extensive mentor discovery calls",
    },
  };

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden" id="features">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-6">
            <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-primary/20 font-medium">
              Credits Explained
            </Badge>
          </div>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6 pb-2 gradient-text font-space-grotesk">
            How Our Credit System Works
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-poppins">
            Choose your plan based on what you need and how you work.
          </p>
        </div>

        {/* Tier Selector Tabs */}
        <Tabs value={selectedTier} onValueChange={(value) => setSelectedTier(value as 'free' | 'creator' | 'professional')} className="mb-12">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto rounded-full border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur">
            <TabsTrigger className="rounded-full text-sm font-medium font-poppins data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="free">Rookie (25)</TabsTrigger>
            <TabsTrigger className="rounded-full text-sm font-medium font-poppins data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="creator">Rising (50)</TabsTrigger>
            <TabsTrigger className="rounded-full text-sm font-medium font-poppins data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="professional">Pro (150)</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Usage Example Card */}
        <Card className="mb-12 max-w-4xl mx-auto rounded-2xl border-primary/30 bg-primary/5 shadow-md backdrop-blur">
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

        {/* Credit Breakdown Grid - wider cards for readability */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {/* Dashboard Card */}
          <Card className="rounded-2xl border border-slate-300/60 dark:border-slate-500/40 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-space-grotesk">Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
            </CardContent>
          </Card>

          {/* BizMap AI Card */}
          <Card className="rounded-2xl border border-slate-300/60 dark:border-slate-500/40 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-space-grotesk">BizMap AI</CardTitle>
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
          <Card className="rounded-2xl border border-slate-300/60 dark:border-slate-500/40 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-space-grotesk">Insighta</CardTitle>
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

          {/* Community Card */}
          <Card className="rounded-2xl border border-slate-300/60 dark:border-slate-500/40 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-space-grotesk">Community</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creditBreakdown.community.map((feature, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    {feature.cost === 0 ? (
                      feature.badge ? (
                        <Badge variant="outline" className="shrink-0 bg-blue-50 dark:bg-blue-950/30">{feature.badge}</Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 bg-green-50 dark:bg-green-950/30">FREE</Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="shrink-0">{feature.cost} credits</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources Card */}
          <Card className="rounded-2xl border border-slate-300/60 dark:border-slate-500/40 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-space-grotesk">Resources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creditBreakdown.resources.map((feature, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    {feature.cost === 0 ? (
                      <Badge variant="outline" className="shrink-0 bg-green-50 dark:bg-green-950/30">{feature.badge || "FREE"}</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">{feature.cost} credits</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;
