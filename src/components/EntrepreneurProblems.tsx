import { Map, Users, Target, Rocket, Lightbulb, LayoutDashboard, Bot, Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const EntrepreneurProblems = () => {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  // Timeline items representing the founder's journey with bottlenecks and pathways
  const journeySteps = [
    {
      phase: "The Starting Point",
      challenge: "Scattered ideas without a clear direction",
      insight: "Founders often face a flood of ideas but struggle to prioritize or organize them into a clear plan. This lack of focus leads to confusion, indecision, and slow progress, as they bounce between concepts without a unified strategy, making it difficult to move the business forward. Without a clear roadmap, they risk losing momentum and missing key opportunities that are critical for growth.",
      pathway: "BizMap AI guides you from scattered thoughts to a strategic plan—clarifying your market, competitors, and next steps in one conversation.",
      icon: Lightbulb,
      accentColor: "blue", // Planning
    },
    {
      phase: "Finding Direction",
      challenge: "Aligning your product with a genuine market need",
      insight: "Founders frequently build products based on assumptions, only to face the harsh reality of limited market demand, which leads to wasted resources and a high risk of building something nobody is willing to buy. To avoid this, it's crucial to validate ideas early through market research and customer feedback, ensuring the product aligns with real needs and demands.",
      pathway: "The Dashboard breaks down your vision into weekly sprints, tracks progress, and keeps you accountable—transforming busyness into real momentum.",
      icon: Target,
      accentColor: "green", // Execution/Growth
    },
    {
      phase: "Building Alone",
      challenge: "Navigating Uncertainty and Decision-Making",
      insight: "Early-stage founders often find themselves in situations with limited information and high uncertainty. This makes decision-making difficult, as they must navigate unknowns while balancing short-term survival with long-term vision. A mentor can help provide perspective and guidance on key decisions, like product direction, market fit, or hiring, based on their own experience.",
      pathway: "Our Community connects you with mentors and fellow founders who've navigated these exact challenges—offering guidance, feedback, and genuine support.",
      icon: Users,
      accentColor: "red", // Action/Connection
    },
    {
      phase: "Working Smartly",
      challenge: "Task prioritization and resources management",
      insight: "80% of results come from 20% of effort. Many founders get lost in low-impact tasks that take them nowhere, struggling to prioritize effectively. Proper task prioritization and resource management help focus energy on what truly drives progress, ensuring time and resources are used wisely.",
      pathway: "BizMap AI helps define your ICP, select the right channels, and craft a go-to-market strategy based on proven frameworks—no more guessing.",
      icon: Map,
      accentColor: "blue", // Planning
    },
    {
      phase: "Seeking Resources",
      challenge: "Fundraising feels impossible without the right connections",
      insight: "Founders often struggle to get in front of the right investors, relying on cold outreach that leads to limited results. Building a strong network and leveraging referrals can make all the difference in securing the right funding. A well-connected founder not only gains access to capital but also valuable mentorship and strategic partnerships that can accelerate growth.",
      pathway: "Explore VC Search",
      icon: Rocket,
      accentColor: "amber", // Fundraising
    },
    {
      phase: "Founder's Mental Tax",
      challenge: "Risk of overwhelm and burnout",
      insight: "Founders often find themselves juggling multiple roles, neglecting self-care, and facing a never-ending to-do list, which can lead to physical and mental exhaustion. Without addressing this, their ability to lead effectively and make sound decisions is compromised, hindering the growth and success of their business.",
      pathway: "Find a Co-Founder",
      icon: LayoutDashboard,
      accentColor: "green", // Growth/Success
    },
  ];

  const toggleFlip = (index: number) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getAccentClasses = (color: string) => {
    const classes = {
      blue: {
        icon: "bg-primary/10 border-primary/30 text-primary",
        timeline: "bg-primary/20",
        glow: "shadow-primary/20",
      },
      red: {
        icon: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
        timeline: "bg-red-500/20",
        glow: "shadow-red-500/20",
      },
      green: {
        icon: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
        timeline: "bg-green-500/20",
        glow: "shadow-green-500/20",
      },
      amber: {
        icon: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
        timeline: "bg-amber-500/20",
        glow: "shadow-amber-500/20",
      },
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  return (
    <section className="py-20 lg:py-32 relative overflow-visible" aria-labelledby="journey-heading">
      {/* Subtle red accent aligned with infographic gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/[0.03] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20 max-w-4xl mx-auto">
          <h2 id="journey-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 leading-tight tracking-tight">
            <span className="gradient-unified">Every Founder's Journey is Unique</span>
          </h2>
          <p className="text-lg sm:text-xl text-foreground/75 leading-[1.7] font-light">
            But some challenges are universal. Here, we highlight some of the most common obstacles founders face and how we assist to overcome them.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="max-w-5xl mx-auto relative">
          {/* Timeline Line - Continuous vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-red-500/20 to-green-500/30 hidden sm:block" />

          {/* Timeline Items */}
          <div className="space-y-12 md:space-y-16">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const accentClasses = getAccentClasses(step.accentColor);
              // First row (index 0) = right, second (index 1) = left, third (index 2) = right, etc.
              const isRight = index % 2 === 0; // Even indices (0, 2, 4) go right, odd (1, 3, 5) go left

              return (
                <div
                  key={index}
                  className="relative animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Mobile Layout (Stacked) */}
                  <div className="md:hidden flex gap-6">
                    {/* Flip Card */}
                    <div className="flex-shrink-0">
                      <div
                        className={`flip-card w-48 h-48 cursor-pointer ${flippedCards.has(index) ? 'flipped' : ''}`}
                        onClick={() => toggleFlip(index)}
                        onMouseEnter={() => setFlippedCards((prev) => new Set(prev).add(index))}
                        onMouseLeave={() => setFlippedCards((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(index);
                          return newSet;
                        })}
                        role="button"
                        tabIndex={0}
                        aria-label={`Flip card for ${step.phase}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleFlip(index);
                          }
                        }}
                      >
                        <div className="flip-card-inner">
                          {/* Front Face */}
                          <div className={`flip-card-front w-full h-full rounded-xl border-2 flex flex-col items-center justify-center ${accentClasses.icon} shadow-lg ${accentClasses.glow} transition-all duration-300`}>
                            <Icon className="w-10 h-10 mb-3" />
                            <span className="text-xs font-semibold text-center px-2">{step.phase}</span>
                          </div>
                          {/* Back Face */}
                          <div className={`flip-card-back w-full h-full rounded-xl border-2 bg-card/95 backdrop-blur-sm border-border/50 shadow-lg ${accentClasses.glow} flex flex-col items-center justify-center p-4`}>
                            <h4 className="text-sm font-bold text-foreground mb-2 text-center">{step.challenge}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed text-center line-clamp-6">{step.insight}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content - Pathway Links */}
                    <div className="flex-1 pt-2">
                      {index === 0 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/bizmap-ai" 
                            className="inline-block p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                              Try BizMap AI <Bot className="h-4 w-4" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 1 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/bizmap-ai/pmf-lab" 
                            className="inline-block p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                              Try PMF Lab <Target className="h-4 w-4" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 2 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/community" 
                            className="inline-block p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                              Find a Mentor <Users className="h-4 w-4" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 3 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/dashboard" 
                            className="inline-block p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                              <LayoutDashboard className="h-4 w-4" /> Explore Dashboard
                            </span>
                          </Link>
                        </div>
                      ) : index === 4 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/insighta/vc-search" 
                            className="inline-block p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                              {step.pathway} <Rocket className="h-4 w-4" />
                            </span>
                          </Link>
                        </div>
                      ) : index === 5 ? (
                        <div className="flex justify-center">
                          <Link 
                            to="/community/co-founders" 
                            className="inline-block p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                              {step.pathway} <Handshake className="h-4 w-4" />
                            </span>
                          </Link>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {step.pathway}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Layout (Alternating) */}
                  <div className="hidden md:grid md:grid-cols-2 gap-8 items-center">
                    {/* Left Side Content (for odd indexes: 1, 3, 5) */}
                    {!isRight && (
                      <div className="pr-12 text-right">
                        {index === 0 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/bizmap-ai" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                Try BizMap AI <Bot className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 1 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/bizmap-ai/pmf-lab" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                Try PMF Lab <Target className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 2 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/community" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                Find a Mentor <Users className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 3 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/dashboard" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                <LayoutDashboard className="h-4 w-4" /> Explore Dashboard
                              </span>
                            </Link>
                          </div>
                        ) : index === 4 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/insighta/vc-search" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                {step.pathway} <Rocket className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 5 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/community/co-founders" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                {step.pathway} <Handshake className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : (
                          <div className="p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 text-left">
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              {step.pathway}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div /> // Empty div to maintain grid structure when content is on right
                    )}

                    {/* Center Flip Card */}
                    <div className="flex justify-center relative z-10">
                      <div
                        className={`flip-card w-56 h-56 cursor-pointer ${flippedCards.has(index) ? 'flipped' : ''}`}
                        onClick={() => toggleFlip(index)}
                        onMouseEnter={() => setFlippedCards((prev) => new Set(prev).add(index))}
                        onMouseLeave={() => setFlippedCards((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(index);
                          return newSet;
                        })}
                        role="button"
                        tabIndex={0}
                        aria-label={`Flip card for ${step.phase}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleFlip(index);
                          }
                        }}
                      >
                        <div className="flip-card-inner">
                          {/* Front Face */}
                          <div className={`flip-card-front w-full h-full rounded-xl border-2 flex flex-col items-center justify-center ${accentClasses.icon} shadow-lg ${accentClasses.glow} bg-background transition-all duration-300`}>
                            <Icon className="w-12 h-12 mb-4" />
                            <span className="text-sm font-semibold text-center px-3">{step.phase}</span>
                          </div>
                          {/* Back Face */}
                          <div className={`flip-card-back w-full h-full rounded-xl border-2 bg-card/95 backdrop-blur-sm border-border/50 shadow-lg ${accentClasses.glow} flex flex-col items-center justify-center p-6`}>
                            <h4 className="text-lg font-bold text-foreground mb-3 text-center">{step.challenge}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed text-center">{step.insight}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side Content (for even indexes: 0, 2, 4) */}
                    {isRight ? (
                      <div className="pl-12 text-left">
                        {index === 0 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/bizmap-ai" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                Try BizMap AI <Bot className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 1 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/bizmap-ai/pmf-lab" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                Try PMF Lab <Target className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 2 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/community" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                Find a Mentor <Users className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 3 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/dashboard" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                <LayoutDashboard className="h-4 w-4" /> Explore Dashboard
                              </span>
                            </Link>
                          </div>
                        ) : index === 4 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/insighta/vc-search" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                {step.pathway} <Rocket className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : index === 5 ? (
                          <div className="flex justify-center">
                            <Link 
                              to="/community/co-founders" 
                              className="inline-block p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                            >
                              <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                {step.pathway} <Handshake className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>
                        ) : (
                          <div className="p-5 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              {step.pathway}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div /> // Empty div to maintain grid structure
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default EntrepreneurProblems;
