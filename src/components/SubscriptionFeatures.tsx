import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Coins, CreditCard, PhoneCall, Rocket } from "lucide-react";
import { CREDIT_COSTS } from "@/config/constants";

const planCredits = [
  { plan: "Rookie", credits: 25, summary: "Free plan for first traction signals and guided discovery." },
  { plan: "Starter", credits: 50, summary: "Credit-powered access to validation tools and light fundraising workflows." },
  { plan: "Rising", credits: 100, summary: "Most tools are included, but MVP Builder and GTM Strategist still use credits." },
  { plan: "Pro", credits: 300, summary: "Highest monthly credit pool for founders running heavier execution and fundraising." },
];

const rules = [
  {
    icon: Bot,
    title: "Rookie and Starter Are Credit-Led",
    body: "On Rookie and Starter, credits power the AI actions you can access. That includes BizMap AI work plus eligible validation and generation flows.",
  },
  {
    icon: Rocket,
    title: "MVP Builder and GTM Always Use Credits",
    body: "This is the platform-wide exception. Rising and Pro unlock those tools immediately, but both still deduct credits whenever founders use MVP Builder or GTM Strategist.",
  },
  {
    icon: PhoneCall,
    title: "Discovery Calls Follow Plan Quotas",
    body: "Rookie includes 1 free discovery call per billing cycle, Starter includes 2, Rising includes 3 and then charges 10 credits per extra call, and Pro keeps discovery calls unlimited.",
  },
  {
    icon: CreditCard,
    title: "Credit Packs Stay Available",
    body: "Extra credits remain useful for heavier execution cycles, especially for Rising users running MVP or GTM workflows and any discovery-call overage.",
  },
];

const costExamples = [
  { name: "BizMap AI message", cost: CREDIT_COSTS.AI_CHAT_MESSAGE, note: "The everyday planning action." },
  { name: "Waitlist Maker", cost: CREDIT_COSTS.WAITLIST_GENERATION, note: "Credit-based on Starter and below." },
  { name: "PMF analysis", cost: CREDIT_COSTS.PMF_ANALYSIS, note: "Credit-gated on Starter, included on Rising and Pro." },
  { name: "MVP Builder", cost: CREDIT_COSTS.LAUNCH_REPORT, note: "Always uses credits on every plan." },
  { name: "Discovery-call overage", cost: CREDIT_COSTS.DISCOVERY_CALL, note: "Applies after Rising's 3 free calls." },
];

const SubscriptionFeatures = () => {
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {planCredits.map((plan) => (
            <Card key={plan.plan} className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-space-grotesk">{plan.plan}</CardTitle>
                  <Badge variant="secondary" className="rounded-full">
                    {plan.credits}/mo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-poppins leading-relaxed">{plan.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {rules.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-space-grotesk">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-poppins leading-relaxed">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-space-grotesk">Common Credit Costs</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground font-poppins">
              ICP Builder stays free on all plans. These are the actions founders will see most often when they move from planning into execution.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {costExamples.map((feature) => (
                <div key={feature.name} className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="font-medium text-sm">{feature.name}</p>
                    <Badge variant="secondary" className="shrink-0">
                      {feature.cost} {feature.cost === 1 ? "credit" : "credits"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;
