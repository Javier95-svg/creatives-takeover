import { Map, Users, Target, Rocket, Lightbulb, LayoutDashboard, Bot, Handshake, Code, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import FounderJourneyVideo from "./FounderJourneyVideo";
import { Home, FileSearch, Zap } from "lucide-react";
import { GraduationCap, Boxes } from "lucide-react";

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
      pathway: "Meet your Investor",
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

  const getPathwayAction = (step: (typeof journeySteps)[number], index: number) => {
    if (index === 0) {
      return {
        to: "/icp-builder",
        title: "Define your ICP",
        description: "ICP Builder guides you to define your ideal customer profile and niche market with actionable positioning strategies and pain point analysis.",
        icon: Target,
      };
    }

    if (index === 1) {
      return {
        to: "/pmf-lab",
        title: "Try PMF Lab",
        description: "PMF Lab assesses feedback from founders' landing page or waitlist shares, scoring 1-100 on market embrace probability.",
        icon: FlaskConical,
      };
    }

    if (index === 2) {
      return {
        to: "/community",
        title: "Find a Mentor",
        description: "Community gives you access to our global mentorship network, ideal for founders seeking expert advice to grow faster and avoid common mistakes.",
        icon: GraduationCap,
      };
    }

    if (index === 3) {
      return {
        to: "/dashboard",
        title: "Explore Dashboard",
        description: "Dashboard serves as your central task manager, helping you track progress and stay accountable with smart deadlines and reminders.",
        icon: LayoutDashboard,
      };
    }

    if (index === 4) {
      return {
        to: "/community/angels",
        title: step.pathway,
        description: "Meet your Investor gives founders access to our angel investor community so you can discover relevant backers, see who matches your niche, and move from searching for capital to starting real conversations.",
        icon: Users,
      };
    }

    if (index === 5) {
      return {
        to: "/tech-stack",
        title: "Tech Stack Builder",
        description: "Pick the best tools across 8 product categories, each with 4 options, while estimating your monthly and annual budget.",
        icon: Boxes,
      };
    }

    if (index === 6) {
      return {
        to: "/community/co-founders",
        title: step.pathway,
        description: "The Co-Founder tab lets you post when you’re seeking a co-founder, instantly notifying all platform users to spark quick matches.",
        icon: Handshake,
      };
    }

    return null;
  };

  const renderPathwayAction = (
    step: (typeof journeySteps)[number],
    index: number,
    className = "",
  ) => {
    const action = getPathwayAction(step, index);

    if (!action) {
      return null;
    }

    const ActionIcon = action.icon;

    return (
      <Link
        to={action.to}
        className={`journey-action-card group relative block w-full overflow-hidden rounded-lg border-4 border-border bg-background/95 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 ${className}`}
        style={{ aspectRatio: 256 / 135 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <ActionIcon className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="journey-action-card__title font-space-grotesk text-xl font-semibold leading-tight text-foreground">
              {action.title}
            </h4>
            <p className="journey-action-card__copy line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {action.description}
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="founder-journey-section py-20 lg:py-28 relative font-poppins" aria-labelledby="journey-heading">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20 max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground">
            Own Your Path 🚀
          </Badge>
          <h2 id="journey-heading" className="founder-journey-section__title font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 leading-tight tracking-tight text-primary">
            Every Founder's Journey is Unique
          </h2>
          <p className="founder-journey-section__copy font-poppins text-base sm:text-lg text-muted-foreground leading-relaxed">
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
                        <FounderJourneyVideo position={index} className="founder-journey-gif" />
                      ) : (
                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${accentClasses.icon} shadow-sm transition-colors`}>
                          <Icon className="w-7 h-7" />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-center">
                      {renderPathwayAction(step, index, "max-w-3xl")}
                    </div>
                  </div>

                  {/* Desktop Layout (Alternating) */}
                  <div className="hidden md:grid md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-6 md:gap-y-4 lg:gap-x-8">
                    {isEven ? (
                      <>
                        <div className="md:col-start-2 md:row-start-1 text-center">
                          <div className="mb-3 flex justify-center">
                            <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                              {step.phase}
                            </span>
                          </div>
                          <h3 className="font-space-grotesk text-2xl font-semibold text-foreground">
                            {step.challenge}
                          </h3>
                        </div>

                        <div className={`${index === 0 ? 'md:pr-8 lg:pr-16 xl:pr-20' : 'md:pr-6 lg:pr-10 xl:pr-12'} md:col-start-1 md:row-start-2 self-center flex justify-center`}>
                          {renderPathwayAction(step, index)}
                        </div>

                        <div className="relative z-10 md:col-start-2 md:row-start-2 self-center">
                          {index <= 6 ? (
                            <div className="w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl ml-2 lg:ml-4">
                              <FounderJourneyVideo position={index} className="founder-journey-gif" />
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
                        <div className="md:col-start-1 md:row-start-1 text-center">
                          <div className="mb-3 flex justify-center">
                            <span className="inline-flex items-center rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                              {step.phase}
                            </span>
                          </div>
                          <h3 className="font-space-grotesk text-2xl font-semibold text-foreground">
                            {step.challenge}
                          </h3>
                        </div>

                        <div className="relative z-10 md:col-start-1 md:row-start-2 self-center">
                          {index <= 6 ? (
                            <div className="w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mr-2 lg:mr-4">
                              <FounderJourneyVideo position={index} className="founder-journey-gif" />
                            </div>
                          ) : (
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${accentClasses.icon} shadow-sm bg-background transition-colors`}>
                              <Icon className="w-9 h-9" />
                            </div>
                          )}
                        </div>

                        <div className={`${index === 1 ? 'md:pl-8 lg:pl-16 xl:pl-20' : 'md:pl-6 lg:pl-10 xl:pl-12'} md:col-start-2 md:row-start-2 self-center flex justify-center`}>
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


