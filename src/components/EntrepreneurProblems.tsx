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
  ChevronUp,
  Rocket,
  Target,
  Brain,
  Zap
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
      problemIcon: Search,
      solutionIcon: Rocket,
      problem: "Building Without Validating",
      briefProblem: "72% of founders fail because they spend months building without validating demand first.",
      actionableSolution: "Validate before you build. Start by testing your problem-solution fit with real customers, conduct 5-10 interviews to understand pain points, and use a structured framework to assess market demand. Get your validation score in minutes, not months.",
      platformIntegration: "BizMap AI's 7-question validation framework helps you test problem-solution fit before committing to a full build. Get real-time market validation scores, competitor gap analysis, and demand strength metrics to make data-driven decisions.",
      keyActions: [
        "Start BizMap AI validation - get your score in 15 minutes",
        "Conduct 5 customer interviews this week using our interview guide",
        "Test demand with a landing page before building your MVP"
      ],
      platformLink: "/bizmap-ai",
      stat: "72%",
      statLabel: "avoid failure with validation"
    },
    {
      problemIcon: Users,
      solutionIcon: Users,
      problem: "Team Building Nightmares",
      briefProblem: "65% of founders struggle with equity splits and co-founder agreements, delaying team building.",
      actionableSolution: "Build your team with confidence. Create clear equity split agreements based on contribution and risk, establish co-founder agreements upfront, and leverage a network of experienced founders for guidance. Don't let uncertainty paralyze your growth.",
      platformIntegration: "Connect with potential co-founders and advisors in our Community. Get real advice on equity splits from founders who've been there, access co-founder matching tools, and join accountability partnerships to build your team.",
      keyActions: [
        "Connect with 3 potential co-founders in our Community this week",
        "Use our equity split calculator and co-founder agreement templates",
        "Join founder accountability groups to find your perfect team match"
      ],
      platformLink: "/community",
      stat: "65%",
      statLabel: "solve with clear agreements"
    },
    {
      problemIcon: DollarSign,
      solutionIcon: Target,
      problem: "Raising Capital Feels Impossible",
      briefProblem: "80% of startups fail to raise because they pitch to the wrong investors without understanding their thesis.",
      actionableSolution: "Research investors strategically. Identify investors who fund your stage and industry, understand their investment thesis and portfolio, and tailor your pitch to their specific interests. Focus your time on the right investors, not every investor.",
      platformIntegration: "Insighta provides real-time investor research and market intelligence. Find investors who fund your stage and industry, understand their thesis, track their recent investments, and discover the best way to position your pitch for success.",
      keyActions: [
        "Use Insighta to find 5 investors who fund your stage and industry",
        "Research each investor's thesis and recent portfolio companies",
        "Prepare a tailored pitch deck for your top 3 investor targets"
      ],
      platformLink: "/insighta",
      stat: "80%",
      statLabel: "succeed with the right investors"
    },
    {
      problemIcon: Map,
      solutionIcon: Map,
      problem: "Go-to-Market Confusion",
      briefProblem: "68% of founders lack a clear go-to-market strategy, wasting time and money on the wrong channels.",
      actionableSolution: "Build a clear GTM strategy from day one. Define your ideal customer profile (ICP) with specific demographics and pain points, test multiple channels to find what works, and focus on one primary channel before expanding. Know exactly who you're targeting and how to reach them.",
      platformIntegration: "BizMap AI's GTM strategy builder helps you define your ideal customer profile, select the best distribution channels, and create a step-by-step go-to-market plan tailored to your startup stage. Get frameworks for customer discovery, channel testing, and market entry strategies.",
      keyActions: [
        "Build your GTM strategy with BizMap AI's step-by-step framework",
        "Define your ideal customer profile with our ICP builder",
        "Test 2-3 channels in parallel, then double down on what works"
      ],
      platformLink: "/bizmap-ai",
      stat: "68%",
      statLabel: "win with clear strategy"
    },
    {
      problemIcon: AlertCircle,
      solutionIcon: Zap,
      problem: "Weak Execution Habits",
      briefProblem: "75% of founders lose focus by mid-week, juggling too many priorities without a clear execution system.",
      actionableSolution: "Build execution systems that keep you focused. Set weekly sprints with 3-5 key priorities, track your progress daily, and use accountability systems to maintain momentum. Ship consistently instead of spinning in circles.",
      platformIntegration: "Your Dashboard provides sprint planning tools, daily priority tracking, and progress visualization. Set weekly goals, track completion rates, and use our accountability partnerships to stay on track. Build execution habits that actually work.",
      keyActions: [
        "Set up your first weekly sprint in your Dashboard today",
        "Define 3 daily priorities and track them each morning",
        "Find an accountability partner to maintain consistent execution"
      ],
      platformLink: "/dashboard",
      stat: "75%",
      statLabel: "achieve with clear focus"
    },
    {
      problemIcon: Flame,
      solutionIcon: Brain,
      problem: "Early Burnout & Lost Momentum",
      briefProblem: "70% of founders experience burnout in the first 90 days due to isolation and lack of support.",
      actionableSolution: "Build sustainable founder habits and leverage community support. Connect with other founders facing similar challenges, establish daily routines that protect your energy, and create accountability systems that help you maintain momentum during tough times.",
      platformIntegration: "Our Community connects you with founders who understand the emotional rollercoaster. Find accountability partners, join founder support groups, access burnout prevention strategies, and build sustainable habits with others who've been there.",
      keyActions: [
        "Find an accountability partner in our Community this week",
        "Join a founder support group to share challenges and wins",
        "Build sustainable daily routines using our habit framework"
      ],
      platformLink: "/community",
      stat: "70%",
      statLabel: "thrive with support"
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Solution-Focused Wallpaper - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-primary/10 dark:via-background dark:to-primary/5 from-primary/5 via-background to-primary/10" />
      
      {/* Circuit Board Pattern - theme-aware (positive/growth focused) */}
      <div className="absolute inset-0 dark:opacity-5 opacity-3">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Scattered Success Icons Background */}
      <div className="absolute inset-0 opacity-5">
        {/* Scattered checkmarks representing solutions */}
        <div className="absolute top-20 left-20 text-primary text-4xl font-bold">✓</div>
        <div className="absolute top-40 right-32 text-primary text-3xl font-bold">✓</div>
        <div className="absolute bottom-32 left-40 text-primary text-5xl font-bold">✓</div>
        <div className="absolute bottom-48 right-20 text-primary text-2xl font-bold">✓</div>
        <div className="absolute top-1/2 left-1/3 text-primary text-6xl font-bold">✓</div>
        <div className="absolute top-1/3 right-1/4 text-primary text-3xl font-bold">✓</div>
      </div>
      
      {/* Accent Stripes - theme-aware (positive) */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent dark:via-primary/20 via-primary/15 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent dark:via-primary/20 via-primary/15 to-transparent" />
      
      {/* Pulse Effect Elements - theme-aware (growth focused) */}
      <div className="absolute top-1/4 left-1/5 w-32 h-1 dark:bg-primary/30 bg-primary/20 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/5 w-24 h-1 dark:bg-primary/30 bg-primary/20 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            Build Your Success Path
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            How Smart Founders Avoid <span className="text-primary">Common Failures</span>
          </h2>
          <p className="text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto px-4">
            Learn from the mistakes others make. Get practical solutions, actionable advice, and the right tools to navigate your startup journey successfully.
          </p>
        </div>

        {/* Solutions Grid - 3 Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16 px-4">
          {problems.map((item, index) => {
            const ProblemIcon = item.problemIcon;
            const SolutionIcon = item.solutionIcon;
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
                  {/* Brief Problem Context - Minimal (20%) */}
                  <div className="bg-gradient-to-br from-red-500/5 via-red-500/3 to-transparent p-3 sm:p-4 border-b border-red-500/10">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-red-500/10 flex-shrink-0">
                        <ProblemIcon className="w-4 h-4 text-red-500/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-foreground/70 mb-1">{item.problem}</h3>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed">{item.briefProblem}</p>
                      </div>
                    </div>
                  </div>

                  {/* Main Solution Section - Prominent (60%) */}
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 border-b border-primary/20">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2.5 rounded-lg bg-primary/20 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary/30">
                        <SolutionIcon className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          <h4 className="text-sm sm:text-base font-bold text-primary">The Solution</h4>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mb-4">{item.actionableSolution}</p>
                        
                        {/* Platform Integration */}
                        <div className="bg-background/50 rounded-lg p-3 border border-primary/10 mb-3">
                          <p className="text-xs text-foreground/80 leading-relaxed">
                            <span className="font-semibold text-primary">How We Help:</span> {item.platformIntegration}
                          </p>
                        </div>

                        {/* Stat Badge - Success Focused */}
                        <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-primary transition-transform duration-300 group-hover:animate-bounce" />
                            <span className="text-lg font-bold text-primary">{item.stat}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{item.statLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actionable Steps Section (20%) */}
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-primary" />
                      <h5 className="text-xs font-semibold text-foreground">Take Action Today</h5>
                    </div>
                    <ul className="space-y-2 mb-3">
                      {item.keyActions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <p className="text-xs text-foreground/80 leading-relaxed">{action}</p>
                        </li>
                      ))}
                    </ul>
                    <Link to={item.platformLink}>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full group/btn"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                  </div>

                  {/* Expandable Detail Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-muted/30 border-t border-border/50 animate-in slide-in-from-top-2">
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-primary" />
                            Platform Features
                          </h5>
                          <div className="bg-background/50 rounded-lg p-3 border border-primary/10">
                            <p className="text-xs text-foreground/80 leading-relaxed">{item.platformIntegration}</p>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Action Plan
                          </h5>
                          <div className="space-y-2">
                            {item.keyActions.map((action, actionIndex) => (
                              <div key={actionIndex} className="flex items-start gap-2 bg-background/50 rounded p-2">
                                <span className="text-xs font-semibold text-primary w-5 flex-shrink-0">{actionIndex + 1}.</span>
                                <p className="text-xs text-foreground/80 leading-relaxed flex-1">{action}</p>
                              </div>
                            ))}
                          </div>
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
                        <span>See Platform Features & Action Plan</span>
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
