import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Users,
  TrendingUp,
  LayoutDashboard,
  Lightbulb
} from "lucide-react";
import { CREDIT_COSTS } from "@/config/constants";

const SubscriptionFeatures = () => {
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
            Every tool has a transparent credit cost, so you can see exactly what each action uses before spending a single credit.
          </p>
        </div>

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
