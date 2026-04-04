import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Users,
  TrendingUp,
} from "lucide-react";
import { CREDIT_COSTS } from "@/config/constants";

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
      description: `Rookie and Starter use ${CREDIT_COSTS.WAITLIST_GENERATION} credits per launch. Rising and Pro include it.`,
      badge: `${CREDIT_COSTS.WAITLIST_GENERATION} credits`,
    },
    {
      name: "Product-Market Fit Lab",
      description: `Preview only on Rookie. Starter uses ${CREDIT_COSTS.PMF_ANALYSIS} credits per analysis. Rising and Pro include it.`,
      badge: `${CREDIT_COSTS.PMF_ANALYSIS} credits`,
    },
    {
      name: "MVP Builder",
      description: `Preview only on Rookie and Starter. Rising and Pro can run it for ${CREDIT_COSTS.APP_BUILDER_GENERATE} credits per use.`,
      badge: `${CREDIT_COSTS.APP_BUILDER_GENERATE} credits`,
    },
    {
      name: "Tech Stack Builder",
      description: "Preview only on Rookie and Starter. Included on Rising and Pro.",
      badge: "Included on Rising+",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "GTM Strategist",
      description: `Preview only on Rookie and Starter. Rising and Pro can run it for ${CREDIT_COSTS.GTM_ANALYSIS} credits per use.`,
      badge: `${CREDIT_COSTS.GTM_ANALYSIS} credits`,
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
      description: "Rookie can browse only. Starter gets 2 profile views/monthly, Rising 5 profile views/monthly, and Pro unlimited profile views.",
      badge: "View limits",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Accelerator Hunt",
      description: "Rookie can browse only. Starter gets 2 profile views/monthly, Rising 5 profile views/monthly, and Pro unlimited profile views.",
      badge: "View limits",
      badgeVariant: "outline",
      badgeClassName: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      name: "Email Templates",
      description: `Starter, Rising, and Pro have full access. Each generated template uses ${CREDIT_COSTS.EMAIL_TEMPLATE_GENERATION} credits. Rookie does not include it.`,
      badge: `${CREDIT_COSTS.EMAIL_TEMPLATE_GENERATION} credits`,
    },
    {
      name: "Pitch Deck Analyzer",
      description: `Included on Rising and Pro. Each analysis uses ${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits. Rookie and Starter do not include it.`,
      badge: `${CREDIT_COSTS.PITCH_DECK_ANALYZER} credits`,
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
      description: `Rookie gets 1 free call/monthly, Starter 2, Rising 3, and Pro unlimited. Extra calls on Rookie, Starter, and Rising use ${CREDIT_COSTS.DISCOVERY_CALL} credits.`,
      badge: `${CREDIT_COSTS.DISCOVERY_CALL} credits`,
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
        </div>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;
