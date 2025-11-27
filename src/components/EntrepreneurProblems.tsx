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
      solutionTitle: "Validate Before You Build",
      solutionText: "Use BizMap AI's structured 7-question validation framework to test demand in days, not months. Get real customer feedback before writing code. Complete market validation interviews, analyze problem-solution fit, and verify willingness to pay—all through guided workflows that save you weeks of guesswork.",
      problemText: "72% of founders fail by building before validating market demand, wasting months and resources.",
      stat: "72%",
      statLabel: "avoid this with validation",
      problemDetail: "Building an MVP without validating if anyone genuinely needs it leads to wasted time, shrinking savings, and constant self-doubt with each rejection.",
      solutionDetail: "Start with BizMap AI's validation wizard. Answer 7 key questions that test problem-solution fit: Is this a real pain? Will people pay? Who exactly needs this? Get customer interview templates, feedback frameworks, and demand validation tools. Complete validation in 1-2 weeks instead of spending months building something nobody wants. Our guided process helps you test assumptions systematically and pivot early if needed.",
    },
    {
      beforeIcon: Users,
      afterIcon: CheckCircle,
      solutionTitle: "Build Strong Co-Founder Partnerships",
      solutionText: "Connect with potential co-founders in our Community who've navigated equity splits and team agreements. Access proven equity distribution frameworks, co-founder agreement templates, and get advice from founders who've built successful teams.",
      problemText: "65% of founders struggle with equity splits and team building decisions, delaying progress.",
      stat: "65%",
      statLabel: "build better teams",
      problemDetail: "Uncertainty about fair equity splits and co-founder agreements paralyzes decision-making and stalls team building.",
      solutionDetail: "Join our Community to find potential co-founders and advisors who've been through these decisions. Access our equity split calculator and co-founder agreement templates based on industry standards. Get personalized advice on: technical vs. business co-founder splits, advisor equity, vesting schedules, and founder agreements. Learn from real founders who've navigated these conversations successfully and avoid common mistakes that create resentment later."
    },
    {
      beforeIcon: DollarSign,
      afterIcon: CheckCircle,
      solutionTitle: "Target the Right Investors Strategically",
      solutionText: "Use Insighta to research investors, understand their thesis, and identify perfect-fit opportunities. Get real-time data on active investors in your space, learn their investment criteria, and access pitch deck templates tailored to their preferences.",
      problemText: "80% fail to raise because they pitch the wrong investors without understanding their focus.",
      stat: "80%",
      statLabel: "raise smarter",
      problemDetail: "Wasting time pitching to investors who aren't a fit, facing rejection without understanding why, and getting stuck in the 'need money to get money' trap.",
      solutionDetail: "Open Insighta and search for investors in your industry and stage. Review their portfolio companies, recent investments, and stated thesis. Understand what traction they expect, what team size they prefer, and how they like to be approached. Use our investor matching tool to identify 10-15 perfect-fit investors. Access pitch deck templates customized for each investor type. Save hours of research and increase your conversion rate by targeting investors who actually invest in your space."
    },
    {
      beforeIcon: Map,
      afterIcon: CheckCircle,
      solutionTitle: "Define Your Go-to-Market Strategy",
      solutionText: "Build a comprehensive GTM strategy with BizMap AI. Define your ideal customer profile (ICP), choose the right channels, and create a step-by-step launch plan. Get frameworks for customer discovery, pricing strategy, and channel testing—all tailored to your business model.",
      problemText: "68% lack a clear GTM strategy, leading to wasted marketing spend and slow growth.",
      stat: "68%",
      statLabel: "launch with clarity",
      problemDetail: "No clear understanding of your ideal customer or which channels to focus on, leading to wasted time and money on ineffective marketing.",
      solutionDetail: "Use BizMap AI's GTM planning module to systematically define your strategy. First, identify your ideal customer profile through guided questions and market research tools. Then, choose the right channels—B2B vs. B2C, direct sales vs. inbound marketing—with decision frameworks based on your business model. Get customer discovery interview scripts, pricing strategy templates, and channel testing playbooks. Create a 90-day launch plan with clear milestones, metrics, and next steps. Stop guessing and start with a data-driven approach to market entry."
    },
    {
      beforeIcon: AlertCircle,
      afterIcon: CheckCircle,
      solutionTitle: "Stay Focused with Execution Systems",
      solutionText: "Your Dashboard keeps you focused with clear priorities, progress tracking, and weekly sprint planning. Set actionable goals, track daily wins, and maintain accountability with built-in partner check-ins. Build sustainable execution habits that help you ship consistently.",
      problemText: "75% lose focus by Wednesday, juggling too many priorities without a clear system.",
      stat: "75%",
      statLabel: "execute consistently",
      problemDetail: "Getting distracted by shiny new ideas, juggling too many priorities, and feeling busy without making real progress.",
      solutionDetail: "Use your Dashboard to create weekly sprints with 3-5 key priorities. Break big goals into daily actionable tasks. Track your progress with visual metrics and celebrate small wins. Set up accountability partnerships through the Community feature for daily check-ins. Use the focus mode to block distractions and time-box your work. Review weekly: what moved forward? What needs adjustment? Build execution systems that help you ship consistently instead of spinning in circles. Your Dashboard becomes your command center for turning plans into reality."
    },
    {
      beforeIcon: Flame,
      afterIcon: CheckCircle,
      solutionTitle: "Maintain Momentum with Founder Support",
      solutionText: "Connect with founders in our Community who understand the emotional rollercoaster. Share wins and challenges, get encouragement during tough moments, and learn energy management strategies. Build sustainable habits that prevent burnout and keep your startup fire burning.",
      problemText: "70% experience early burnout, losing momentum when initial excitement fades.",
      stat: "70%",
      statLabel: "stay energized",
      problemDetail: "Initial excitement fading, replaced by exhaustion from constant rejection and the relentless uncertainty of the startup journey.",
      solutionDetail: "Join our Community and find accountability partners who understand what you're going through. Share daily wins—even small ones—to maintain perspective. Participate in weekly founder circles where you can discuss challenges openly and get support. Access our burnout prevention resources: energy management frameworks, boundary-setting guides, and founder wellness practices. Learn from experienced founders about sustainable pacing, managing rejection, and maintaining long-term motivation. You're not alone in this journey, and the right community can make all the difference in sustaining momentum through the ups and downs."
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Solution-Focused Wallpaper - theme-aware */}
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
      
      {/* Background Pattern Elements */}
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
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            Proven Strategies for Success
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            How Successful Pre-Seed Founders <span className="text-green-500">Succeed</span>
          </h2>
          <p className="text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto px-4">
            Actionable strategies and proven tools to avoid common pitfalls. Learn how our platform helps founders validate, execute, and scale faster.
          </p>
        </div>

        {/* Solutions Grid - 3 Column Layout */}
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
                  {/* Solution Section - Green/Success (Shown First) */}
                  <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent p-4 sm:p-5 border-b-2 border-green-500/20 transition-all duration-300 group-hover:from-green-500/15 group-hover:via-green-500/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--green-primary))]/20 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[hsl(var(--green-primary))]/30">
                        <AfterIcon className="w-5 h-5 text-[hsl(var(--green-primary))] transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-[hsl(var(--green-primary))] flex-shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-[hsl(var(--green-primary))]">{item.solutionTitle}</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{item.solutionText}</p>
                      </div>
                    </div>
                    
                    {/* Success Indicator */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-green-500/10">
                      <div className="flex items-center gap-1.5 transition-transform duration-300 group-hover:scale-105">
                        <TrendingUp className="w-4 h-4 text-[hsl(var(--green-primary))] transition-transform duration-300 group-hover:animate-bounce" />
                        <span className="text-lg font-bold text-[hsl(var(--green-primary))] transition-colors duration-300 group-hover:text-[hsl(var(--green-dark))]">{item.stat}</span>
                      </div>
                      <span className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-foreground/80">{item.statLabel}</span>
                    </div>
                  </div>

                  {/* Arrow Divider (Reversed) */}
                  <div className="relative bg-gradient-to-r from-green-500/10 via-background to-red-500/10 py-2 transition-all duration-300 group-hover:from-green-500/15 group-hover:to-red-500/15">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-lg">
                        <ArrowRight className="w-4 h-4 text-primary transition-transform duration-300 group-hover:translate-x-1 rotate-180" />
                      </div>
                    </div>
                  </div>

                  {/* Problem Section - Red/Warning (Shown Second) */}
                  <div className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent p-4 sm:p-5 transition-all duration-300 group-hover:from-red-500/15 group-hover:via-red-500/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--red-primary))]/20 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[hsl(var(--red-primary))]/30">
                        <BeforeIcon className="w-5 h-5 text-[hsl(var(--red-primary))] transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <X className="w-4 h-4 text-[hsl(var(--red-primary))] flex-shrink-0" />
                          <h4 className="text-xs sm:text-sm font-semibold text-[hsl(var(--red-primary))]">What to Avoid</h4>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.problemText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Detail Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-muted/30 border-t border-border/50 animate-in slide-in-from-top-2">
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-xs font-semibold text-[hsl(var(--green-primary))] mb-2 flex items-center gap-2">
                            <CheckCircle className="w-3 h-3" />
                            How to Succeed:
                          </h5>
                          <p className="text-xs text-foreground/90 leading-relaxed">{item.solutionDetail}</p>
                        </div>
                        <div className="pt-2 border-t border-border/30">
                          <h5 className="text-xs font-semibold text-[hsl(var(--red-primary))] mb-2 flex items-center gap-2">
                            <X className="w-3 h-3" />
                            Why This Matters:
                          </h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.problemDetail}</p>
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
