import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Users,
  DollarSign,
  Map,
  AlertCircle,
  Flame,
  CheckCircle,
  RotateCcw
} from "lucide-react";

const EntrepreneurProblems = () => {

  const problems = [
    {
      icon: Search,
      problem: "Building Without Validating",
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
      icon: Users,
      problem: "Team Building Nightmares",
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
      icon: DollarSign,
      problem: "Raising Capital Feels Impossible",
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
      icon: Map,
      problem: "Go-to-Market Confusion",
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
      icon: AlertCircle,
      problem: "Weak Execution Habits",
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
      icon: Flame,
      problem: "Early Burnout & Lost Momentum",
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
        .animate-card-entrance {
          animation: slideUpFadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .flip-card {
          perspective: 1000px;
          min-height: 500px;
          overflow: visible;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 500px;
          transform-style: preserve-3d;
          animation: autoFlip 8s ease-in-out infinite;
        }
        .flip-card:nth-child(1) .flip-card-inner {
          animation-delay: 0s;
        }
        .flip-card:nth-child(2) .flip-card-inner {
          animation-delay: 0.5s;
        }
        .flip-card:nth-child(3) .flip-card-inner {
          animation-delay: 1s;
        }
        .flip-card:nth-child(4) .flip-card-inner {
          animation-delay: 1.5s;
        }
        .flip-card:nth-child(5) .flip-card-inner {
          animation-delay: 2s;
        }
        .flip-card:nth-child(6) .flip-card-inner {
          animation-delay: 2.5s;
        }
        @keyframes autoFlip {
          0%, 45% {
            transform: rotateY(0deg);
          }
          50%, 95% {
            transform: rotateY(180deg);
          }
          100% {
            transform: rotateY(0deg);
          }
        }
        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          min-height: 500px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 0.75rem;
          overflow: visible;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
        .flip-card-inner:hover {
          animation-play-state: paused;
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
            <span className="gradient-unified">Common Roadblocks Pre-Seed Founders Face</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover how the right tools, frameworks, and community support help you navigate these obstacles and build with confidence.
          </p>
        </div>

        {/* Flip Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-visible">
          {problems.map((item, index) => {
            const Icon = item.icon;
            
            return (
              <article
                key={index}
                className="flip-card animate-card-entrance"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div
                  className="flip-card-inner"
                  aria-label={`${item.problem} - Automatically flipping between problem and solution`}
                >
                  {/* Front Side - Problem (Red) */}
                  <div className="flip-card-front bg-gradient-to-br from-card via-card/95 to-red-950/5 dark:from-card dark:via-card/95 dark:to-red-950/20 backdrop-blur-sm border-2 border-red-500/60 hover:border-red-500/90 rounded-xl p-6 flex flex-col h-full min-h-[500px] focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 transition-all duration-300 shadow-lg shadow-red-500/10 hover:shadow-xl hover:shadow-red-500/20 relative overflow-visible">
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-600/10 opacity-50 animate-pulse" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-600/5 rounded-full blur-3xl translate-y-20 -translate-x-20" />
                    
                    <div className="relative z-10">
                      <div className="bg-gradient-to-br from-red-500/15 to-red-600/10 rounded-xl p-3.5 mb-4 border border-red-500/30 shadow-md backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-0">
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-500/25 to-red-600/15 border-2 border-red-500/40 flex-shrink-0 shadow-lg shadow-red-500/20">
                            <Icon className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                          <h3 className="text-base font-bold text-red-600 dark:text-red-400 drop-shadow-sm leading-tight">
                            {item.problem}
                          </h3>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 bg-white/5 dark:bg-black/10 rounded-lg p-4 backdrop-blur-sm overflow-y-auto">
                          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                            {item.detail.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-3 group/item">
                                <span className="text-red-500 dark:text-red-400 mt-1.5 flex-shrink-0 text-lg font-bold group-hover/item:scale-110 transition-transform">•</span>
                                <span className="group-hover/item:text-foreground transition-colors">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-4 pt-3 border-t border-red-500/30 flex items-center justify-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/5 rounded-lg py-2 flex-shrink-0">
                          <span>Auto-flipping to solution...</span>
                          <RotateCcw className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back Side - Solution (Green) */}
                  <div className="flip-card-back bg-gradient-to-br from-card via-card/95 to-green-950/5 dark:from-card dark:via-card/95 dark:to-green-950/20 backdrop-blur-sm border-2 border-green-500/60 hover:border-green-500/90 rounded-xl p-6 flex flex-col h-full min-h-[500px] focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 transition-all duration-300 shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/20 relative overflow-visible">
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-green-600/10 opacity-50 animate-pulse" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-600/5 rounded-full blur-3xl translate-y-20 -translate-x-20" />
                    
                    <div className="relative z-10">
                      <div className="bg-gradient-to-br from-green-500/15 to-green-600/10 rounded-xl p-3.5 mb-4 border border-green-500/30 shadow-md backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-0">
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-500/25 to-green-600/15 border-2 border-green-500/40 flex-shrink-0 shadow-lg shadow-green-500/20">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="text-base font-bold text-green-600 dark:text-green-400 drop-shadow-sm leading-tight">
                            Our Solution
                          </h3>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 bg-white/5 dark:bg-black/10 rounded-lg p-4 backdrop-blur-sm overflow-y-auto">
                          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                            {item.solution.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-3 group/item">
                                <span className="text-green-500 dark:text-green-400 mt-1.5 flex-shrink-0 text-lg font-bold group-hover/item:scale-110 transition-transform">•</span>
                                <span className="group-hover/item:text-foreground transition-colors">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-4 pt-3 border-t border-green-500/30 flex items-center justify-center gap-2 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/5 rounded-lg py-2 flex-shrink-0">
                          <span>Auto-flipping to problem...</span>
                          <RotateCcw className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EntrepreneurProblems;
