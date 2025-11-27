import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Search,
  Users,
  DollarSign,
  Map,
  AlertCircle,
  Flame,
  ArrowRight,
  CheckCircle,
  X,
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
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            Don't Repeat the Same Mistakes
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            How Successful Pre-Seed Founders <span className="text-primary">Succeed</span>
          </h2>
          <p className="text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto px-4">
            Overwhelmed by complexity, not bad ideas. Here's what kills startups and how to avoid it.
          </p>
        </div>

        {/* Problems Grid - 3 Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16 px-4">
          {problems.map((item, index) => {
            const BeforeIcon = item.beforeIcon;
            const AfterIcon = item.afterIcon;
            const isExpanded = expandedCards.has(index);
            
            return (
              <Card 
                key={index} 
                className="glass border-border hover:shadow-xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 group overflow-hidden animate-fade-in-up" 
                style={{ 
                  animationDelay: `${0.1 + index * 0.1}s`,
                  animationFillMode: 'both'
                }}
              >
                <CardContent className="p-0">
                  {/* Before Section - Red/Warning */}
                  <div className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent p-4 sm:p-5 border-b-2 border-red-500/20 transition-all duration-300 group-hover:from-red-500/15 group-hover:via-red-500/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--red-primary))]/20 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[hsl(var(--red-primary))]/30">
                        <BeforeIcon className="w-5 h-5 text-[hsl(var(--red-primary))] transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <X className="w-4 h-4 text-[hsl(var(--red-primary))] flex-shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-[hsl(var(--red-primary))]">{item.problem}</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.beforeText}</p>
                      </div>
                    </div>
                    
                    {/* Stat Badge */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-red-500/10">
                      <div className="flex items-center gap-1.5 transition-transform duration-300 group-hover:scale-105">
                        <TrendingDown className="w-4 h-4 text-[hsl(var(--red-primary))] transition-transform duration-300 group-hover:animate-bounce" />
                        <span className="text-lg font-bold text-[hsl(var(--red-primary))] transition-colors duration-300 group-hover:text-[hsl(var(--red-dark))]">{item.stat}</span>
                      </div>
                      <span className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-foreground/80">{item.statLabel}</span>
                    </div>
                  </div>

                  {/* Arrow Divider */}
                  <div className="relative bg-gradient-to-r from-red-500/10 via-background to-green-500/10 py-2 transition-all duration-300 group-hover:from-red-500/15 group-hover:to-green-500/15">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-lg">
                        <ArrowRight className="w-4 h-4 text-primary transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>

                  {/* After Section - Green/Success */}
                  <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-4 sm:p-5 transition-all duration-300 group-hover:from-green-500/15 group-hover:via-green-500/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--green-primary))]/20 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[hsl(var(--green-primary))]/30">
                        <AfterIcon className="w-5 h-5 text-[hsl(var(--green-primary))] transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-[hsl(var(--green-primary))] flex-shrink-0" />
                          <h4 className="text-xs sm:text-sm font-semibold text-[hsl(var(--green-primary))]">Solution</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.afterText}</p>
                      </div>
                    </div>
                    
                    {/* Success Indicator */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-green-500/10">
                      <div className="flex items-center gap-1.5 transition-transform duration-300 group-hover:scale-105">
                        <TrendingUp className="w-4 h-4 text-[hsl(var(--green-primary))] transition-transform duration-300 group-hover:animate-bounce" />
                        <span className="text-xs font-semibold text-[hsl(var(--green-primary))] transition-colors duration-300 group-hover:text-[hsl(var(--green-dark))]">Avoid this failure</span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Detail Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-muted/30 border-t border-border/50 animate-in slide-in-from-top-2">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-xs font-semibold text-[hsl(var(--red-primary))] mb-1.5">The Problem:</h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-[hsl(var(--green-primary))] mb-1.5">The Solution:</h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.solution}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className="w-full p-3 bg-muted/50 hover:bg-muted/70 transition-colors border-t border-border/50 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <>
                        <span>Show Less</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Learn More</span>
                        <ChevronDown className="w-4 h-4" />
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
