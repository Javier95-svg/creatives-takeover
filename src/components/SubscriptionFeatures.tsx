import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Users,
  TrendingUp,
} from "lucide-react";
import { CREDIT_COSTS, getCreditCostForPlan } from "@/config/constants";
import { RevealGroup, ScrollReveal } from "@/components/animations/ScrollReveal";

type CreditBreakdownItem = {
  name: string;
  description: string;
  badge: string;
  badgeVariant?: "secondary" | "outline";
  badgeClassName?: string;
};

const creditBreakdown: {
  bizmap: CreditBreakdownItem[];
  insighta: CreditBreakdownItem[];
  community: CreditBreakdownItem[];
} = {
  bizmap: [
    {
      name: "ICP Builder",
      description: "Free on every plan, so you can define your ideal customer profile without spending credits.",
      badge: "FREE",
      badgeVariant: "outline",
      badgeClassName: "bg-green-50 dark:bg-green-950/30",
    },
    {
      name: "Waitlist Maker",
      description: `Unlocked on every plan. Publishing or generating a waitlist costs ${getCreditCostForPlan('WAITLIST_GENERATION', 'rookie')} credits on Rookie and ${CREDIT_COSTS.WAITLIST_GENERATION} credits on paid plans.`,
      badge: `${getCreditCostForPlan('WAITLIST_GENERATION', 'rookie')} / ${CREDIT_COSTS.WAITLIST_GENERATION} credits`,
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Product-Market Fit Lab",
      description: `Preview only on Rookie. Starter, Rising, and Pro unlock PMF analysis at ${CREDIT_COSTS.PMF_ANALYSIS} credits per full analysis and ${CREDIT_COSTS.PMF_SCORING} credits per evidence score.`,
      badge: "Unlocked on Starter+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "MVP Builder",
      description: `Preview only on Rookie and Starter. Rising and Pro unlock per-action billing: ${CREDIT_COSTS.APP_BUILDER_GENERATE} credits for the first build, ${CREDIT_COSTS.APP_BUILDER_REFINE} per AI edit, ${CREDIT_COSTS.APP_BUILDER_CHAT} per chat, and ${CREDIT_COSTS.APP_BUILDER_GITHUB_EDIT} per GitHub AI edit.`,
      badge: "Unlocked on Rising+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Tech Stack Builder",
      description: `Preview only on Rookie and Starter. Rising and Pro unlock it at ${CREDIT_COSTS.TECH_STACK_GENERATION} credits per generation.`,
      badge: "Unlocked on Rising+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "GTM Strategist",
      description: `Preview only on Rookie and Starter. Rising and Pro unlock it at ${CREDIT_COSTS.GTM_ANALYSIS} credits per strategy.`,
      badge: "Unlocked on Rising+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Directories",
      description: "Preview only on Rookie and Starter. Included on Rising and Pro.",
      badge: "Included on Rising+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
  ],
  insighta: [
    {
      name: "VC Search",
      description: "Rookie can browse only. Starter gets 2 profile views/monthly, Rising 10 profile views/monthly, and Pro unlimited profile views.",
      badge: "View limits",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Accelerator Hunt",
      description: "Rookie can browse only. Starter gets 2 profile views/monthly, Rising 10 profile views/monthly, and Pro unlimited profile views.",
      badge: "View limits",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Email Templates",
      description: "Starter, Rising, and Pro have full plan-gated access. Rookie does not include it.",
      badge: "Included on Starter+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Pitch Deck Analyzer",
      description: `Unlocked on Rising and Pro at ${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits per analysis. Rookie and Starter do not include it.`,
      badge: "Unlocked on Rising+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Insighta Test",
      description: "Included on every plan.",
      badge: "Included",
      badgeVariant: "outline",
      badgeClassName: "bg-green-50 dark:bg-green-950/30",
    },
  ],
  community: [
    {
      name: "Discovery Calls (Mentorship)",
      description: "Rookie gets 1 call/monthly, Starter 2, Rising 3, and Pro unlimited. Upgrade when you need a higher monthly limit.",
      badge: "Monthly quotas",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Find a Co-Founder Posting",
      description: "Rookie gets 1 post/monthly, Starter 2, and Rising plus Pro are unlimited.",
      badge: "Monthly quotas",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Find Your Angel",
      description: "Pro only. Rookie, Starter, and Rising do not include investor access here.",
      badge: "PRO ONLY",
      badgeVariant: "outline",
      badgeClassName: "bg-red-50 dark:bg-red-950/30",
    },
  ],
};

const SubscriptionFeatures = () => {
  const renderFeatureBadge = (feature: CreditBreakdownItem) => {
    const badgeClassName = feature.badgeClassName ? `shrink-0 ${feature.badgeClassName}` : "shrink-0";

    return (
      <Badge variant={feature.badgeVariant ?? "secondary"} className={badgeClassName}>
        {feature.badge}
      </Badge>
    );
  };

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden" id="features">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-16 animate-fade-in">
          <div className="mb-6">
            <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-primary/20 font-medium">
              Credits Explained
            </Badge>
          </div>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6 pb-2 gradient-text font-space-grotesk">
            How Our Credit System Works
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Every tool has a transparent access model, so you can see what is included on your plan and what still uses credits before spending anything.
          </p>
        </ScrollReveal>

        {/* Credit Breakdown Grid - wider cards for readability */}
        <RevealGroup className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start" variant="card">
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
                    {renderFeatureBadge(feature)}
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
                    {renderFeatureBadge(feature)}
                  </div>
                ))}
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
                    {renderFeatureBadge(feature)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </RevealGroup>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;
