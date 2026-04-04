import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Coins,
  LayoutDashboard,
  PhoneCall,
  TrendingUp,
  Users,
} from "lucide-react";
import { CREDIT_COSTS } from "@/config/constants";

const SubscriptionFeatures = () => {
  const planCredits = [
    { plan: "Rookie", credits: 25 },
    { plan: "Starter", credits: 50 },
    { plan: "Rising", credits: 100 },
    { plan: "Pro", credits: 300 },
  ];

  const creditBreakdown = {
    dashboard: [
      { name: "Focus Funnel", cost: 0, description: "Goal tracking and prioritization", badge: "FREE" },
      { name: "Decision Sprint", cost: CREDIT_COSTS.SPRINT_TASK_GENERATION, description: "AI-generated sprint tasks and priorities" },
      { name: "Core Metrics", cost: 0, description: "Track your key performance indicators", badge: "FREE" },
      { name: "Weekly Mission", cost: 0, description: "Weekly goal setting and tracking", badge: "FREE" },
      { name: "Your Tasks", cost: 0, description: "Task management and organization", badge: "FREE" },
      { name: "Roadmap Generation", cost: CREDIT_COSTS.ROADMAP_GENERATION, description: "Strategic business roadmap and GTM planning" },
    ],
    bizmap: [
      { name: "Business Planner (AI Chat)", cost: CREDIT_COSTS.AI_CHAT_MESSAGE, description: "Every message in Business Planning mode" },
      { name: "ICP Builder", cost: 0, description: "Define your ideal customer profile", badge: "FREE ON ALL PLANS" },
      { name: "Waitlist Maker", cost: CREDIT_COSTS.WAITLIST_GENERATION, description: "Publish your waitlist page and capture early signups" },
      { name: "Product-Market Fit Lab", cost: CREDIT_COSTS.PMF_ANALYSIS, description: "Complete PMF analysis with recommendations" },
      { name: "MVP Builder", cost: CREDIT_COSTS.LAUNCH_REPORT, description: "Always consumes credits on every plan" },
      { name: "Tech Stack Builder", cost: CREDIT_COSTS.TECH_STACK_GENERATION, description: "Custom tech stack for your startup" },
      { name: "GTM Strategist", cost: CREDIT_COSTS.ROADMAP_GENERATION, description: "Always consumes credits on every plan" },
      { name: "Launch Report", cost: CREDIT_COSTS.LAUNCH_REPORT, description: "Comprehensive business launch roadmap" },
      { name: "Asset Generation", cost: CREDIT_COSTS.ASSET_GENERATION, description: "Generate outreach, social posts, and landing page assets" },
      { name: "Prompt Generation", cost: CREDIT_COSTS.PROMPT_GENERATION, description: "AI-generated custom prompts" },
    ],
    insighta: [
      { name: "VC Search", cost: 0, description: "Browse investors. Profile views follow plan limits, not credit costs", badge: "VIEW LIMITS" },
      { name: "Accelerator Hunt", cost: 0, description: "Browse accelerators. Profile views follow plan limits, not credit costs", badge: "VIEW LIMITS" },
      { name: "Pitch Deck Analyzer", cost: CREDIT_COSTS.PITCH_DECK_ANALYZER, description: "AI analysis with actionable feedback" },
      { name: "Email Template Generation", cost: CREDIT_COSTS.EMAIL_TEMPLATE_GENERATION, description: "Personalized investor outreach emails" },
      { name: "Insighta Test", cost: 0, description: "Included on all plans", badge: "INCLUDED" },
      { name: "Investor Matching", cost: CREDIT_COSTS.INVESTOR_MATCHING, description: "Find VCs aligned with your startup" },
      { name: "One-Pager Generation", cost: CREDIT_COSTS.ONEPAGER_GENERATION, description: "Professional one-page pitch document" },
    ],
    community: [
      { name: "Find a Mentor", cost: 0, description: "Browse and connect with mentors", badge: "FREE" },
      { name: "Find a Co-Founder", cost: 0, description: "Browse and connect with co-founders", badge: "FREE" },
      { name: "Angels Community", cost: 0, description: "Pro-only community access", badge: "PRO ONLY" },
      { name: "Discovery Calls", cost: CREDIT_COSTS.DISCOVERY_CALL, description: "Rising gets 3 free per billing cycle, then 10 credits each; Pro is unlimited" },
      { name: "Co-Founder Posting", cost: 0, description: "Quota-limited by plan, not credit-based", badge: "PLAN QUOTAS" },
    ],
  };

  const renderBadge = (feature: { cost: number; badge?: string }) => {
    if (feature.cost === 0) {
      return (
        <Badge variant="outline" className="shrink-0 bg-blue-50 dark:bg-blue-950/30">
          {feature.badge || "FREE"}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="shrink-0">
        {feature.cost} {feature.cost === 1 ? "credit" : "credits"}
      </Badge>
    );
  };

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden" id="features">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
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
            Every feature has a transparent cost before you spend a single credit. Rookie, Starter, Rising, and Pro include 25, 50, 100, and 300 monthly credits respectively.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {planCredits.map((plan) => (
            <Card key={plan.plan} className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardContent className="p-5 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2 font-poppins">{plan.plan}</p>
                <p className="text-3xl font-semibold font-space-grotesk">{plan.credits}</p>
                <p className="text-sm text-muted-foreground font-poppins">credits / month</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-8 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Coins className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground font-poppins leading-relaxed">
              <p>Rookie and Starter broadly use credits for the AI-powered actions available on those plans.</p>
              <p>Rising and Pro include most BizMap workflows without per-use charges, but MVP Builder and GTM Strategist always consume credits on every plan.</p>
              <p>Discovery calls follow plan quotas. Rising includes 3 free per billing cycle, then each extra call costs 10 credits. Pro keeps discovery calls unlimited.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
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
                {creditBreakdown.dashboard.map((feature) => (
                  <div key={feature.name} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    {renderBadge(feature)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                {creditBreakdown.bizmap.map((feature) => (
                  <div key={feature.name} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    {renderBadge(feature)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                {creditBreakdown.insighta.map((feature) => (
                  <div key={feature.name} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    {renderBadge(feature)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                {creditBreakdown.community.map((feature) => (
                  <div key={feature.name} className="flex justify-between items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    {feature.name === "Discovery Calls" ? (
                      <div className="shrink-0 flex items-center gap-2">
                        <PhoneCall className="h-4 w-4 text-primary" />
                        {renderBadge(feature)}
                      </div>
                    ) : (
                      renderBadge(feature)
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
