import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Users,
  DollarSign,
  Map,
  AlertCircle,
  Flame,
  ArrowRight,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const EntrepreneurProblems = () => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const problems = [
    {
      beforeIcon: Search,
      afterIcon: CheckCircle,
      problem: "Building Without Validating",
      beforeText: "Spending months building an MVP without validating demand, watching savings disappear with no clear direction.",
      afterText: "Validate your idea with BizMap AI's 7-question framework before committing months to a build.",
      stat: "72%",
      statLabel: "fail without validation",
      detail: "You've spent months building your MVP without validating if anyone genuinely needs it, constantly guessing whether people will ever pay for it while each rejection feels like a personal judgment on your skills and ideas. Your runway is shrinking and savings are disappearing with no clear direction, leaving you paralyzed by the pressure to choose the right next move.",
      solution: "Use BizMap AI to validate your idea with a structured 7-question framework that tests problem-solution fit before you burn months building. Get real feedback and validate demand before committing to a full build.",
    },
    {
      beforeIcon: Users,
      afterIcon: CheckCircle,
      problem: "Team Building Nightmares",
      beforeText: "Paralyzed by equity split uncertainty, unable to move forward with team building decisions.",
      afterText: "Connect with founders in our Community who've navigated equity splits and co-founder agreements.",
      stat: "65%",
      statLabel: "struggle with equity",
      detail: "You need co-founders or early team members but are paralyzed by uncertainty about fair equity splits. Should your technical co-founder get 50%? What about advisors helping with connections? The fear of making the wrong decision and creating resentment down the line keeps you stuck, unable to move forward with team building.",
      solution: "Connect with potential co-founders and advisors in our Community who've navigated these decisions. Get real advice on equity splits and co-founder agreements from founders who've been there."
    },
    {
      beforeIcon: DollarSign,
      afterIcon: CheckCircle,
      problem: "Raising Capital Feels Impossible",
      beforeText: "Stuck in the 'need money to get money' trap, wasting time pitching to the wrong investors.",
      afterText: "Use Insighta to research investors, understand their thesis, and identify the right fit for your startup.",
      stat: "80%",
      statLabel: "fail to raise",
      detail: "You're stuck in the 'need money to get money' trap. Friends and family are skeptical, angels want traction you don't have, and pre-seed funds want a team you're still building. Every rejection makes you question if your idea is even worth pursuing, creating a cycle of self-doubt that undermines your confidence and momentum.",
      solution: "Use Insighta to research investors, understand their thesis, and identify the right fit for your startup. Get real-time data on which investors are active in your space and how to position your pitch."
    },
    {
      beforeIcon: Map,
      afterIcon: CheckCircle,
      problem: "Go-to-Market Confusion",
      beforeText: "No clear understanding of your ideal customer or which channels to focus on, wasting time and money.",
      afterText: "Build a comprehensive go-to-market strategy with BizMap AI, defining your ICP and channel selection.",
      stat: "68%",
      statLabel: "lack GTM strategy",
      detail: "You know you need to 'go to market' but have no clear understanding of what that means or who your ideal customer actually is, leaving you unable to make strategic decisions. You're paralyzed by fundamental questions like should you focus on B2B or B2C, or direct sales versus inbound marketing, with no framework to guide your choices.",
      solution: "Use BizMap AI to build a comprehensive go-to-market strategy tailored to your startup. Define your ideal customer profile and get step-by-step frameworks for customer discovery and channel selection."
    },
    {
      beforeIcon: AlertCircle,
      afterIcon: CheckCircle,
      problem: "Weak Execution Habits",
      beforeText: "Getting distracted by Wednesday, juggling too many priorities with no clear execution system.",
      afterText: "Your Dashboard keeps you focused with clear priorities, progress tracking, and weekly sprint planning.",
      stat: "75%",
      statLabel: "lack focus",
      detail: "You start each week with big plans but get distracted by Wednesday, constantly pulled toward shiny new ideas instead of executing on your core priorities. You're juggling too many things at once including product development, customer calls, fundraising prep, and marketing, but nothing feels like it's moving forward despite being constantly busy.",
      solution: "Your Dashboard keeps you focused on what matters with clear priorities, progress tracking, and weekly sprint planning. Build execution systems that help you ship consistently instead of spinning in circles."
    },
    {
      beforeIcon: Flame,
      afterIcon: CheckCircle,
      problem: "Early Burnout & Lost Momentum",
      beforeText: "Initial excitement faded, replaced by exhaustion and uncertainty, questioning if you have what it takes.",
      afterText: "Connect with founders in our Community who understand the emotional rollercoaster and help maintain momentum.",
      stat: "70%",
      statLabel: "experience burnout",
      detail: "The initial excitement that drove you three months ago has faded, replaced by exhaustion from late nights, constant rejection, and the relentless uncertainty of the startup journey. You're questioning if you have what it takes, watching the initial fire fade as the emotional weight of the rollercoaster wears you down day by day.",
      solution: "Connect with founders in our Community who understand the emotional rollercoaster and can help you maintain momentum. Get strategies for managing energy and building sustainable founder habits that prevent burnout."
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Problem-Focused Wallpaper - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-red-950/30 dark:via-gray-900/20 dark:to-orange-950/20 from-red-50/40 via-background to-orange-50/30" />
      
      {/* Circuit Board Pattern - theme-aware */}
      <div className="absolute inset-0 dark:opacity-5 opacity-3">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--red-primary) / 0.1) 1px, transparent 1px),
            linear-gradient(hsl(var(--red-primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Scattered Problem Icons Background */}
      <div className="absolute inset-0 opacity-5">
        {/* Scattered X marks representing problems */}
        <div className="absolute top-20 left-20 text-[hsl(var(--red-primary))] text-4xl font-bold">✕</div>
        <div className="absolute top-40 right-32 text-[hsl(var(--red-primary))] text-3xl font-bold">✕</div>
        <div className="absolute bottom-32 left-40 text-[hsl(var(--red-primary))] text-5xl font-bold">✕</div>
        <div className="absolute bottom-48 right-20 text-[hsl(var(--red-primary))] text-2xl font-bold">✕</div>
        <div className="absolute top-1/2 left-1/3 text-[hsl(var(--red-primary))] text-6xl font-bold">✕</div>
        <div className="absolute top-1/3 right-1/4 text-[hsl(var(--red-primary))] text-3xl font-bold">✕</div>
      </div>
      
      {/* Warning Stripes - theme-aware */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent dark:via-red-500/20 via-red-400/15 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent dark:via-orange-500/20 via-orange-400/15 to-transparent" />
      
      {/* Glitch Effect Elements - theme-aware */}
      <div className="absolute top-1/4 left-1/5 w-32 h-1 dark:bg-[hsl(var(--red-primary))]/30 bg-[hsl(var(--red-primary))]/20 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/5 w-24 h-1 dark:bg-orange-500/30 bg-orange-400/20 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 mb-6 text-sm">
            Big Challenges, Bold Solutions
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            <span className="gradient-unified">Common Roadblocks Pre-Seed Founders Face</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover how the right tools, frameworks, and community support help you navigate these obstacles and build with confidence.
          </p>
        </div>

        {/* Problems Grid - 3 Column Layout with Better Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {problems.map((item, index) => {
            const BeforeIcon = item.beforeIcon;
            const AfterIcon = item.afterIcon;
            const isExpanded = expandedCards.has(index);
            
            return (
              <Card 
                key={index} 
                className="border-l-4 border-red-500/50 hover:border-red-500/80 border-border hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 flex flex-col h-full relative overflow-hidden group"
              >
                {/* Problem Section Background Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-br from-red-50/30 dark:from-red-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="pb-6 p-8 relative z-10">
                  {/* Problem Section */}
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/20 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                        <BeforeIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <CardTitle className="text-xl font-bold leading-tight text-red-600 dark:text-red-400">
                          {item.problem}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                          {item.beforeText}
                        </CardDescription>
                      </div>
                    </div>
                    
                    {/* Stat Badge - More Prominent */}
                    <div className="flex items-center gap-2 pt-4 border-t-2 border-red-200 dark:border-red-900/50">
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">{item.stat}</span>
                        <span className="text-xs font-medium text-muted-foreground">{item.statLabel}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Arrow Divider - More Prominent */}
                <div className="relative px-8 py-4">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-green-500/20 border-2 border-primary/30 flex items-center justify-center shadow-lg backdrop-blur-sm group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <ArrowRight className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="h-0.5 bg-gradient-to-r from-red-200 via-primary/30 to-green-200 dark:from-red-900/50 dark:via-primary/20 dark:to-green-900/50" />
                </div>

                {/* Solution Section Background Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-tl from-green-50/30 dark:from-green-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Solution Section */}
                <CardContent className="pt-6 pb-8 px-8 flex-1 flex flex-col relative z-10">
                  <div className="space-y-6 flex-1">
                    <div className="flex items-start gap-4">
                      <div className="p-4 rounded-xl bg-green-500/10 border-2 border-green-500/20 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                        <AfterIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <h4 className="text-base font-semibold text-green-600 dark:text-green-400">Solution</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.afterText}
                        </p>
                      </div>
                    </div>
                    
                    {/* Success Indicator - More Prominent */}
                    <div className="flex items-center gap-2 pt-4 border-t-2 border-green-200 dark:border-green-900/50">
                      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">Avoid this failure</span>
                    </div>
                  </div>

                  {/* Expandable Detail Section */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t-2 border-border space-y-6 animate-fade-in">
                      <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                        <h5 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          The Problem:
                        </h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                        <h5 className="text-sm font-bold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          The Solution:
                        </h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.solution}</p>
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Button - More Prominent */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className="mt-6 w-full py-3.5 bg-primary/10 hover:bg-primary/20 border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isExpanded ? (
                      <>
                        <span>Show Less</span>
                        <ChevronUp className="w-4 h-4 transition-transform duration-300" />
                      </>
                    ) : (
                      <>
                        <span>Learn More</span>
                        <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-1" />
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;
