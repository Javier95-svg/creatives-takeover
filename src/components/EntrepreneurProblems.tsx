import { Map, Users, Target, Rocket, Lightbulb, LayoutDashboard, Bot, Handshake, Code, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import FounderJourneyVideo from "./FounderJourneyVideo";

const EntrepreneurProblems = () => {
  // Timeline items representing the founder's journey with bottlenecks and pathways
  const journeySteps = [
    {
      phase: "The Starting Point",
      challenge: "Scattered ideas without a clear direction",
      pathway: "BizMap AI guides you from scattered thoughts to a strategic plan—clarifying your market, competitors, and next steps in one conversation.",
      icon: Lightbulb,
      accentColor: "blue", // Planning
    },
    {
      phase: "Finding Direction",
      challenge: "Aligning your product with a genuine market need",
      pathway: "The Dashboard breaks down your vision into weekly sprints, tracks progress, and keeps you accountable—transforming busyness into real momentum.",
      icon: Target,
      accentColor: "green", // Execution/Growth
    },
    {
      phase: "Lack of Experience",
      challenge: "Navigating Uncertainty and Decision-Making",
      pathway: "Our Community connects you with mentors and fellow founders who've navigated these exact challenges—offering guidance, feedback, and genuine support.",
      icon: Users,
      accentColor: "red", // Action/Connection
    },
    {
      phase: "Working Smartly",
      challenge: "Task prioritization and resources management",
      pathway: "BizMap AI helps define your ICP, select the right channels, and craft a go-to-market strategy based on proven frameworks—no more guessing.",
      icon: Map,
      accentColor: "blue", // Planning
    },
    {
      phase: "Seeking Resources",
      challenge: "Fundraising feels impossible without the right connections",
      pathway: "Explore VC Search",
      icon: Rocket,
      accentColor: "amber", // Fundraising
    },
    {
      phase: "Tech Stack Selection",
      challenge: "The Teck Stack Dilemma",
      pathway: "Build your Tech Stack",
      icon: Code,
      accentColor: "blue", // Planning/Technical
    },
    {
      phase: "Founder's Mental Tax",
      challenge: "High chance of burnout",
      pathway: "Find a Co-Founder",
      icon: LayoutDashboard,
      accentColor: "green", // Growth/Success
    },
  ];

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

  const renderPathwayAction = (step: (typeof journeySteps)[number], index: number) => {
    if (index === 0) {
      return (
        <Link
          to="/icp-builder"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="font-semibold text-foreground flex items-center gap-2 text-base">
            Define your Niche <Target className="h-5 w-5" />
          </span>
        </Link>
      );
    }

    if (index === 1) {
      return (
        <Link
          to="/pmf-lab"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="font-semibold text-foreground flex items-center gap-2 text-base">
            Try PMF Lab <FlaskConical className="h-5 w-5" />
          </span>
        </Link>
      );
    }

    if (index === 2) {
      return (
        <Link
          to="/community"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="font-semibold text-foreground flex items-center gap-2 text-base">
            Find a Mentor <Users className="h-5 w-5" />
          </span>
        </Link>
      );
    }

    if (index === 3) {
      return (
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="font-semibold text-foreground flex items-center gap-2 text-base">
            <LayoutDashboard className="h-5 w-5" /> Explore Dashboard
          </span>
        </Link>
      );
    }

    if (index === 4) {
      return (
        <Link
          to="/insighta/vc-search"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="font-semibold text-foreground flex items-center gap-2 text-base">
            {step.pathway} <Rocket className="h-5 w-5" />
          </span>
        </Link>
      );
    }

    if (index === 5) {
      return (
        <Link
          to="/tech-stack"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="font-semibold text-foreground flex items-center gap-2 text-base">
            {step.pathway} <Code className="h-5 w-5" />
          </span>
        </Link>
      );
    }

    if (index === 6) {
      return (
        <Link
          to="/community/co-founders"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-base font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <span className="font-semibold text-foreground flex items-center gap-2 text-base">
            {step.pathway} <Handshake className="h-5 w-5" />
          </span>
        </Link>
      );
    }

    return (
      <div className="rounded-md border border-border bg-background/80 p-4">
        <p className="text-sm text-foreground/90 leading-relaxed">
          {step.pathway}
        </p>
      </div>
    );
  };

  return (
    <section className="py-20 lg:py-28 relative font-poppins" aria-labelledby="journey-heading">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20 max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground">
            Own Your Path 🚀
          </Badge>
          <h2 id="journey-heading" className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 leading-tight tracking-tight text-primary">
            Every Founder's Journey is Unique
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground leading-relaxed">
            But some challenges are universal. Here, we highlight some of the most common obstacles founders face and how we assist to overcome them.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="max-w-5xl mx-auto relative">
          {/* Timeline Line - Continuous vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border hidden sm:block" />

          {/* Timeline Items */}
          <div className="space-y-12 md:space-y-16">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const accentClasses = getAccentClasses(step.accentColor);
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className="relative"
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-5">
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                          {step.phase}
                        </span>
                      </div>
                      <h3 className="font-space-grotesk text-xl font-semibold text-foreground">
                        {step.challenge}
                      </h3>
                    </div>

                    <div className="w-full">
                      {index <= 6 ? (
                        <FounderJourneyVideo position={index} />
                      ) : (
                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${accentClasses.icon} shadow-sm transition-colors`}>
                          <Icon className="w-7 h-7" />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-center">
                      {renderPathwayAction(step, index)}
                    </div>
                  </div>

                  {/* Desktop Layout (Alternating) */}
                  <div className="hidden md:grid md:grid-cols-2 md:gap-6 lg:gap-8 items-center">
                    {isEven ? (
                      <>
                        <div className={`${index === 0 ? 'md:pr-8 lg:pr-16 xl:pr-20' : 'md:pr-6 lg:pr-10 xl:pr-12'} flex justify-center`}>
                          {renderPathwayAction(step, index)}
                        </div>

                        <div className="relative z-10">
                          <div className="mb-4 text-center">
                            <div className="mb-3 flex justify-center">
                              <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                                {step.phase}
                              </span>
                            </div>
                            <h3 className="font-space-grotesk text-2xl font-semibold text-foreground">
                              {step.challenge}
                            </h3>
                          </div>

                          {index <= 6 ? (
                            <div className="w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl ml-2 lg:ml-4">
                              <FounderJourneyVideo position={index} />
                            </div>
                          ) : (
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${accentClasses.icon} shadow-sm bg-background transition-colors`}>
                              <Icon className="w-9 h-9" />
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative z-10">
                          <div className="mb-4 text-center">
                            <div className="mb-3 flex justify-center">
                              <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                                {step.phase}
                              </span>
                            </div>
                            <h3 className="font-space-grotesk text-2xl font-semibold text-foreground">
                              {step.challenge}
                            </h3>
                          </div>

                          {index <= 6 ? (
                            <div className="w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mr-2 lg:mr-4">
                              <FounderJourneyVideo position={index} />
                            </div>
                          ) : (
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${accentClasses.icon} shadow-sm bg-background transition-colors`}>
                              <Icon className="w-9 h-9" />
                            </div>
                          )}
                        </div>

                        <div className={`${index === 1 ? 'md:pl-8 lg:pl-16 xl:pl-20' : 'md:pl-6 lg:pl-10 xl:pl-12'} flex justify-center`}>
                          {renderPathwayAction(step, index)}
                        </div>
                      </>
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


