import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TiltCard } from "@/components/ui/TiltCard";
import { useScrollSequence } from "@/hooks/useScrollSequence";
import {
  Search,
  Users,
  DollarSign,
  Map,
  AlertCircle,
  Flame,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const EntrepreneurProblems = () => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const { ref: gridRef, visibleItems } = useScrollSequence(6, 150); // 6 cards, 150ms stagger

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
      detail: [
        "Spending months building an MVP without validating if anyone needs it",
        "Watching savings disappear with no clear direction or market feedback",
        "Questioning every feature decision while avoiding hard customer conversations",
        "Building in isolation, hoping the next feature will finally make people care",
        "Facing validation paralysis that prevents you from making informed decisions"
      ],
      solution: [
        "Test problem-solution fit with BizMap AI's structured 7-question framework",
        "Get real customer discovery guidance before committing months to a build",
        "Receive actionable feedback that tells you exactly what resonates",
        "Connect with founders who've navigated validation challenges successfully",
        "Know whether your idea has legs before investing everything into it"
      ],
    },
    {
      beforeIcon: Users,
      afterIcon: CheckCircle,
      problem: "Team Building Nightmares",
      beforeText: "Paralyzed by equity split uncertainty, unable to move forward with team building decisions.",
      afterText: "Connect with founders in our Community who've navigated equity splits and co-founder agreements.",
      detail: [
        "Paralyzed by uncertainty about fair equity splits for co-founders",
        "Second-guessing whether you're being too generous or too stingy",
        "Fear of making wrong decisions that create resentment down the line",
        "Lack of clear frameworks and real-world examples for team building",
        "Unable to move forward with team building due to decision paralysis"
      ],
      solution: [
        "Access proven equity split calculators used by hundreds of successful startups",
        "Get real-world examples and battle-tested frameworks from experienced founders",
        "Learn what works and what creates problems from founders who've been there",
        "Discuss your specific situation in a safe space with honest feedback",
        "Build your team with clarity and fairness, avoiding common pitfalls"
      ],
    },
    {
      beforeIcon: DollarSign,
      afterIcon: CheckCircle,
      problem: "Raising Capital Feels Impossible",
      beforeText: "Stuck in the 'need money to get money' trap, wasting time pitching to the wrong investors.",
      afterText: "Use Insighta to research investors, understand their thesis, and identify the right fit for your startup.",
      detail: [
        "Stuck in the 'need money to get money' trap with no clear path forward",
        "Shooting in the dark, not knowing which investors invest in your space",
        "Wasting time on pitches that were never going to work",
        "Each rejection chips away at your belief that you can make this happen",
        "Fundraising process feels like a black box with constant guessing"
      ],
      solution: [
        "Understand each investor's thesis, track record, and active investment patterns",
        "Get real-time data on which investors are actively investing in your space",
        "Access successful pitch decks and fundraising strategies from pre-seed founders",
        "Identify the perfect fit for your startup before writing your first email",
        "Stop wasting time on wrong investors and start meaningful conversations"
      ],
    },
    {
      beforeIcon: Map,
      afterIcon: CheckCircle,
      problem: "Go-to-Market Confusion",
      beforeText: "No clear understanding of your ideal customer or which channels to focus on, wasting time and money.",
      afterText: "Build a comprehensive go-to-market strategy with BizMap AI, defining your ICP and channel selection.",
      detail: [
        "No clear understanding of what 'go to market' means for your startup",
        "Paralyzed by fundamental questions like B2B vs B2C or direct sales vs inbound",
        "Throwing money at tactics without understanding which ones will work",
        "Unable to commit fully to any channel because you're not confident it's right",
        "Constantly second-guessing your approach, resulting in mediocre results"
      ],
      solution: [
        "Define your ideal customer profile with precision using proven frameworks",
        "Get step-by-step guidance on customer discovery and channel selection",
        "Access go-to-market templates battle-tested by hundreds of founders",
        "Learn from real examples of startups that navigated similar challenges",
        "Focus your time and resources on channels that will drive real growth"
      ],
    },
    {
      beforeIcon: AlertCircle,
      afterIcon: CheckCircle,
      problem: "Weak Execution Habits",
      beforeText: "Getting distracted by Wednesday, juggling too many priorities with no clear execution system.",
      afterText: "Your Dashboard keeps you focused with clear priorities, progress tracking, and weekly sprint planning.",
      detail: [
        "Getting distracted by Wednesday, pulled toward shiny new ideas",
        "Juggling too many things but nothing feels like it's moving forward",
        "Constantly context-switching and losing momentum on important projects",
        "Never quite finishing anything completely despite being constantly busy",
        "Spinning in circles, making progress on everything but completing nothing"
      ],
      solution: [
        "Break down big goals into actionable weekly sprints with clear roadmaps",
        "Track progress across all key initiatives to see where you're stuck",
        "Build execution habits that help you ship consistently",
        "Get accountability systems that keep you honest about accomplishments",
        "Transform from constantly busy to consistently productive"
      ],
    },
    {
      beforeIcon: Flame,
      afterIcon: CheckCircle,
      problem: "Early Burnout & Lost Momentum",
      beforeText: "Initial excitement faded, replaced by exhaustion and uncertainty, questioning if you have what it takes.",
      afterText: "Connect with founders in our Community who understand the emotional rollercoaster and help maintain momentum.",
      detail: [
        "Initial excitement faded, replaced by exhaustion from late nights and rejection",
        "Questioning if you have what it takes as the emotional weight wears you down",
        "Carrying all the stress alone with no one who truly understands",
        "Every setback feels personal, draining your energy and enthusiasm",
        "Wondering if this is sustainable and whether the emotional toll is worth it"
      ],
      solution: [
        "Connect with founders who understand the emotional rollercoaster you're experiencing",
        "Get strategies for managing energy and building sustainable founder habits",
        "Access accountability partnerships and weekly check-ins for peer support",
        "Learn how to maintain your fire without burning out from experienced founders",
        "Transform the lonely startup journey into a shared experience with support"
      ],
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-visible" aria-labelledby="roadblocks-heading">
      <style>{`
        @keyframes flicker {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
          }
          25% {
            opacity: 0.8;
            box-shadow: 0 0 15px rgba(34, 197, 94, 0.5);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
          }
          75% {
            opacity: 0.9;
            box-shadow: 0 0 12px rgba(34, 197, 94, 0.45);
          }
        }
        .animate-flicker {
          animation: flicker 2s ease-in-out infinite;
        }
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-card-entrance {
          animation: slideUpFadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .card-hover-effect {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover-effect:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
        }
        .icon-hover-effect {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover-effect:hover .icon-hover-effect {
          transform: scale(1.1) rotate(5deg);
        }
        .arrow-hover-effect {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover-effect:hover .arrow-hover-effect {
          transform: scale(1.15) rotate(12deg);
        }
      `}</style>
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
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10 overflow-visible">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 mb-6 text-sm animate-flicker">
            Big Challenges, Bold Solutions
          </Badge>
          <h2 id="roadblocks-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            <span className="gradient-unified">Common Roadblocks Founders Face</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover how the right tools, frameworks, and community support help you navigate these obstacles and build with confidence.
          </p>
        </div>

        {/* Problems Grid - 3 Column Layout with Better Spacing */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-visible">
          {problems.map((item, index) => {
            const BeforeIcon = item.beforeIcon;
            const AfterIcon = item.afterIcon;
            const isExpanded = expandedCards.has(index);
            const isVisible = visibleItems.has(index);

            return (
              <div
                key={index}
                className="transform transition-all duration-700 ease-out"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
                  transitionDelay: isVisible ? `${index * 50}ms` : '0ms'
                }}
              >
                <TiltCard
                  tiltStrength={6}
                  glowColor="rgba(239, 68, 68, 0.3)"
                  className="border-l-4 border-red-500/50 hover:border-red-500/80 border-border flex flex-col h-full relative overflow-hidden group bg-card/50 backdrop-blur-sm"
                >
                {/* Problem Section Background Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-br from-red-50/20 dark:from-red-950/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardHeader className="pb-4 p-5 relative z-10">
                  {/* Problem Section */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="icon-hover-effect p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
                        <BeforeIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <CardTitle className="text-lg font-bold leading-tight text-red-600 dark:text-red-400">
                          {item.problem}
                        </CardTitle>
                        <CardDescription className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                          {item.beforeText}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Arrow Divider - More Compact */}
                <div className="relative px-5 py-3">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="arrow-hover-effect w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-green-500/20 border border-primary/30 flex items-center justify-center shadow-md backdrop-blur-sm">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-red-200 via-primary/20 to-green-200 dark:from-red-900/40 dark:via-primary/15 dark:to-green-900/40" />
                </div>

                {/* Solution Section Background Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-tl from-green-50/20 dark:from-green-950/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Solution Section */}
                <CardContent className="pt-4 pb-5 px-5 flex-1 flex flex-col relative z-10">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="icon-hover-effect p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex-shrink-0">
                        <AfterIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">Solution</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {item.afterText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Detail Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                      <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                        <h5 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          The Problem:
                        </h5>
                        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                          {item.detail.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-red-500 dark:text-red-400 mt-1 flex-shrink-0">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                        <h5 className="text-xs font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5" />
                          The Solution:
                        </h5>
                        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                          {item.solution.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-500 dark:text-green-400 mt-1 flex-shrink-0">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Button - More Compact */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className="mt-4 w-full py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all duration-300 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:text-primary/90 active:scale-[0.98]"
                  >
                    {isExpanded ? (
                      <>
                        <span>Show Less</span>
                        <ChevronUp className="w-3.5 h-3.5 transition-transform duration-300" />
                      </>
                    ) : (
                      <>
                        <span>Learn More</span>
                        <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                      </>
                    )}
                  </button>
                </CardContent>
                </TiltCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;
