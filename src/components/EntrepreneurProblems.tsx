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
      briefProblem: "72% fail without validation",
      actionableSolution: "Validate before you build. Test problem-solution fit with real customers and get your validation score in minutes, not months.",
      platformIntegration: "BizMap AI's validation framework tests problem-solution fit and provides market scores before you commit to building.",
      keyActions: [
        "Get validation score in 15 minutes",
        "Interview 5 customers this week",
        "Test demand with a landing page"
      ],
      platformLink: "/bizmap-ai",
      stat: "72%",
      statLabel: "avoid failure"
    },
    {
      problemIcon: Users,
      solutionIcon: Users,
      problem: "Team Building Nightmares",
      briefProblem: "65% struggle with equity splits",
      actionableSolution: "Create clear equity agreements upfront. Connect with experienced founders who've navigated these decisions.",
      platformIntegration: "Our Community connects you with co-founders and provides equity split templates and advice.",
      keyActions: [
        "Connect with 3 potential co-founders",
        "Use our equity split calculator",
        "Join founder accountability groups"
      ],
      platformLink: "/community",
      stat: "65%",
      statLabel: "solve with clarity"
    },
    {
      problemIcon: DollarSign,
      solutionIcon: Target,
      problem: "Raising Capital Feels Impossible",
      briefProblem: "80% fail to raise",
      actionableSolution: "Research investors strategically. Find investors who fund your stage and tailor your pitch to their thesis.",
      platformIntegration: "Insighta provides investor research to find the right investors and understand their thesis.",
      keyActions: [
        "Find 5 investors in your space",
        "Research their thesis and portfolio",
        "Prepare tailored pitch deck"
      ],
      platformLink: "/insighta",
      stat: "80%",
      statLabel: "succeed strategically"
    },
    {
      problemIcon: Map,
      solutionIcon: Map,
      problem: "Go-to-Market Confusion",
      briefProblem: "68% lack GTM strategy",
      actionableSolution: "Define your ideal customer and test channels. Focus on one channel before expanding.",
      platformIntegration: "BizMap AI's GTM builder helps define your customer profile and select the best channels.",
      keyActions: [
        "Build GTM strategy framework",
        "Define ideal customer profile",
        "Test 2-3 channels, double down on what works"
      ],
      platformLink: "/bizmap-ai",
      stat: "68%",
      statLabel: "win with strategy"
    },
    {
      problemIcon: AlertCircle,
      solutionIcon: Zap,
      problem: "Weak Execution Habits",
      briefProblem: "75% lose focus mid-week",
      actionableSolution: "Set weekly sprints with clear priorities. Track progress daily and use accountability systems.",
      platformIntegration: "Your Dashboard provides sprint planning, daily priorities, and progress tracking to keep you focused.",
      keyActions: [
        "Set up weekly sprint today",
        "Define 3 daily priorities",
        "Find an accountability partner"
      ],
      platformLink: "/dashboard",
      stat: "75%",
      statLabel: "achieve focus"
    },
    {
      problemIcon: Flame,
      solutionIcon: Brain,
      problem: "Early Burnout & Lost Momentum",
      briefProblem: "70% experience burnout",
      actionableSolution: "Leverage community support. Connect with founders facing similar challenges and build sustainable habits.",
      platformIntegration: "Our Community connects you with founders for accountability partners and burnout prevention strategies.",
      keyActions: [
        "Find accountability partner",
        "Join founder support group",
        "Build sustainable daily routines"
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
            Practical solutions and actionable steps to help you succeed.
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
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 border-b border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/20 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary/30">
                        <SolutionIcon className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          <h4 className="text-sm font-bold text-primary">Solution</h4>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mb-3">{item.actionableSolution}</p>

                        {/* Stat Badge - Success Focused */}
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="text-base font-bold text-primary">{item.stat}</span>
                          <span className="text-xs text-muted-foreground">{item.statLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actionable Steps Section (20%) */}
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 p-4">
                    <ul className="space-y-1.5 mb-3">
                      {item.keyActions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <p className="text-xs text-foreground/80">{action}</p>
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
                    <div className="p-4 bg-muted/30 border-t border-border/50 animate-in slide-in-from-top-2">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-xs font-semibold text-foreground mb-2">How We Help</h5>
                          <p className="text-xs text-foreground/80">{item.platformIntegration}</p>
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
