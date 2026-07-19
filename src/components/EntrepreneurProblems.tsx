import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  Boxes,
  FlaskConical,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  Map,
  Rocket,
  Target,
  Users,
  Code,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import FounderJourneyVideo from "./FounderJourneyVideo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

type AccentColor = "blue" | "green" | "red" | "amber";

type JourneyStep = {
  phase: string;
  challenge: string;
  pathway: string;
  icon: LucideIcon;
  accentColor: AccentColor;
};

type JourneyAction = {
  to: string;
  title: string;
  outcome: string;
  description: string;
  icon: LucideIcon;
  accentName: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentBorder: string;
  accentStrong: string;
  panelTint: string;
  meshTint: string;
  idleVariant: "spotlight" | "diagonal" | "halo" | "float" | "beam" | "glint" | "dual";
  shimmerAngle: string;
  floatDistance: string;
  hoverLift: string;
  hoverScale: string;
  sweepDuration: string;
  delay: string;
};

const journeySteps: JourneyStep[] = [
  {
    phase: "The Starting Point",
    challenge: "Scattered ideas without a clear direction",
    pathway: "BizMap AI guides you from scattered thoughts to a strategic plan—clarifying your market, competitors, and next steps in one conversation.",
    icon: Lightbulb,
    accentColor: "blue",
  },
  {
    phase: "Finding Direction",
    challenge: "Aligning your product with a genuine market need",
    pathway: "The Dashboard breaks down your vision into weekly sprints, tracks progress, and keeps you accountable—transforming busyness into real momentum.",
    icon: Target,
    accentColor: "green",
  },
  {
    phase: "Lack of Experience",
    challenge: "Navigating Uncertainty and Decision-Making",
    pathway: "Our Community connects you with mentors and fellow founders who've navigated these exact challenges—offering guidance, feedback, and genuine support.",
    icon: Users,
    accentColor: "red",
  },
  {
    phase: "Working Smartly",
    challenge: "Task prioritization and resource management",
    pathway: "BizMap AI helps define your ICP, select the right channels, and craft a go-to-market strategy based on proven frameworks—no more guessing.",
    icon: Map,
    accentColor: "blue",
  },
  {
    phase: "Seeking Resources",
    challenge: "Fundraising feels impossible without the right connections",
    pathway: "Meet your Investor",
    icon: Rocket,
    accentColor: "amber",
  },
  {
    phase: "Tech Stack Selection",
    challenge: "The Tech Stack Dilemma",
    pathway: "Build your Tech Stack",
    icon: Code,
    accentColor: "blue",
  },
  {
    phase: "Founder's Mental Tax",
    challenge: "High risk of burnout",
    pathway: "Find a Co-Founder",
    icon: LayoutDashboard,
    accentColor: "green",
  },
];

const journeyActions: JourneyAction[] = [
  {
    to: "/icp-builder",
    title: "Define Your ICP",
    outcome: "Target Correctly",
    description: "Identify who to serve, what they need, and how to position your offer.",
    icon: Target,
    accentName: "cobalt",
    accent: "218 89% 60%",
    accentSoft: "212 100% 97%",
    accentGlow: "216 95% 69%",
    accentBorder: "217 87% 75%",
    accentStrong: "220 90% 53%",
    panelTint: "214 78% 72%",
    meshTint: "210 75% 93%",
    idleVariant: "spotlight",
    shimmerAngle: "132deg",
    floatDistance: "4px",
    hoverLift: "-6px",
    hoverScale: "1.01",
    sweepDuration: "720ms",
    delay: "0s",
  },
  {
    to: "/pmf-lab",
    title: "Validate Demand",
    outcome: "Understand the Market",
    description: "Turn customer evidence into a clear Build, Narrow, Pivot, or Stop decision.",
    icon: FlaskConical,
    accentName: "teal",
    accent: "183 75% 42%",
    accentSoft: "182 61% 95%",
    accentGlow: "184 82% 52%",
    accentBorder: "183 68% 67%",
    accentStrong: "186 84% 34%",
    panelTint: "182 59% 69%",
    meshTint: "180 46% 92%",
    idleVariant: "diagonal",
    shimmerAngle: "144deg",
    floatDistance: "3px",
    hoverLift: "-6px",
    hoverScale: "1.012",
    sweepDuration: "640ms",
    delay: "0.18s",
  },
  {
    to: "/mentorship",
    title: "Find a Mentor",
    outcome: "Expert guidance",
    description: "Get focused feedback from experienced founders and leave with clear next steps.",
    icon: GraduationCap,
    accentName: "coral",
    accent: "13 84% 63%",
    accentSoft: "18 100% 96%",
    accentGlow: "12 90% 69%",
    accentBorder: "14 86% 78%",
    accentStrong: "10 84% 57%",
    panelTint: "15 66% 74%",
    meshTint: "20 74% 93%",
    idleVariant: "halo",
    shimmerAngle: "124deg",
    floatDistance: "3px",
    hoverLift: "-5px",
    hoverScale: "1.008",
    sweepDuration: "760ms",
    delay: "0.3s",
  },
  {
    to: "/dashboard",
    title: "Dashboard: Your Project Co-Pilot",
    outcome: "Daily Focus",
    description: "Prioritize tasks, track weekly progress, and stay accountable in one workspace.",
    icon: LayoutDashboard,
    accentName: "amber",
    accent: "42 92% 57%",
    accentSoft: "46 100% 95%",
    accentGlow: "41 96% 66%",
    accentBorder: "43 92% 75%",
    accentStrong: "38 90% 52%",
    panelTint: "43 76% 73%",
    meshTint: "46 78% 92%",
    idleVariant: "float",
    shimmerAngle: "136deg",
    floatDistance: "5px",
    hoverLift: "-8px",
    hoverScale: "1.014",
    sweepDuration: "620ms",
    delay: "0.12s",
  },
  {
    to: "/investors",
    title: "Find Investors",
    outcome: "Targeted fundraising",
    description: "Find relevant investors by stage and sector, then start targeted conversations.",
    icon: Users,
    accentName: "emerald",
    accent: "154 59% 43%",
    accentSoft: "152 54% 95%",
    accentGlow: "154 64% 52%",
    accentBorder: "154 57% 66%",
    accentStrong: "154 67% 37%",
    panelTint: "153 46% 69%",
    meshTint: "152 44% 92%",
    idleVariant: "beam",
    shimmerAngle: "154deg",
    floatDistance: "3px",
    hoverLift: "-6px",
    hoverScale: "1.01",
    sweepDuration: "700ms",
    delay: "0.22s",
  },
  {
    to: "/tech-stack",
    title: "Build Your Tech Stack",
    outcome: "Stack and budget",
    description: "Choose the right tools for your MVP and see the cost before you build.",
    icon: Boxes,
    accentName: "indigo-steel",
    accent: "226 31% 57%",
    accentSoft: "228 43% 96%",
    accentGlow: "225 45% 68%",
    accentBorder: "227 32% 74%",
    accentStrong: "228 36% 49%",
    panelTint: "226 29% 73%",
    meshTint: "228 26% 93%",
    idleVariant: "glint",
    shimmerAngle: "122deg",
    floatDistance: "2px",
    hoverLift: "-6px",
    hoverScale: "1.01",
    sweepDuration: "680ms",
    delay: "0.36s",
  },
  {
    to: "/co-founder",
    title: "Find a Co-Founder",
    outcome: "Shared execution",
    description: "Find a complementary founder to share responsibilities and move faster together.",
    icon: Handshake,
    accentName: "raspberry",
    accent: "338 72% 58%",
    accentSoft: "336 100% 96%",
    accentGlow: "337 84% 68%",
    accentBorder: "338 70% 77%",
    accentStrong: "339 74% 52%",
    panelTint: "337 60% 74%",
    meshTint: "335 72% 93%",
    idleVariant: "dual",
    shimmerAngle: "140deg",
    floatDistance: "4px",
    hoverLift: "-6px",
    hoverScale: "1.012",
    sweepDuration: "740ms",
    delay: "0.28s",
  },
];

const EntrepreneurProblems = () => {
  const getAccentClasses = (color: string) => {
    const classes = {
      blue: {
        icon: "bg-primary/10 border-primary/30 text-primary",
        timeline: "bg-primary/20",
        glow: "shadow-primary/20",
      },
      red: {
        icon: "bg-destructive-subtle border-destructive/30 text-destructive",
        timeline: "bg-destructive/20",
        glow: "shadow-destructive/20",
      },
      green: {
        icon: "bg-success-subtle border-success/30 text-success",
        timeline: "bg-success/20",
        glow: "shadow-success/20",
      },
      amber: {
        icon: "bg-warning-subtle border-warning/30 text-warning",
        timeline: "bg-warning/20",
        glow: "shadow-warning/20",
      },
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  const getPathwayAction = (index: number) => {
    return journeyActions[index] ?? null;
  };

  const renderPathwayAction = (
    _step: JourneyStep,
    index: number,
    className = "",
  ) => {
    const action = getPathwayAction(index);

    if (!action) {
      return null;
    }

    const ActionIcon = action.icon;
    const actionStyle = {
      "--journey-accent": action.accent,
      "--journey-accent-soft": action.accentSoft,
      "--journey-accent-strong": action.accentStrong,
    } as CSSProperties;

    return (
      <Link
        to={action.to}
        className={`journey-action-card group block w-full touch-manipulation ${className}`}
        data-accent={action.accentName}
        style={actionStyle}
      >
        <div className="journey-action-card__surface">
          <div className="journey-action-card__content">
            <div className="journey-action-card__meta">
              <span className="journey-action-card__outcome">{action.outcome}</span>
              <div className="journey-action-card__icon-shell">
                <ActionIcon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="journey-action-card__copy-wrap">
              <h4 className="journey-action-card__title font-space-grotesk font-semibold">
                {action.title}
              </h4>
              <p className="journey-action-card__copy">
                {action.description}
              </p>
            </div>
            <span className="journey-action-card__cta">
              Open tool
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="founder-journey-section section-shell relative" aria-labelledby="journey-heading">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-14 sm:mb-16 max-w-3xl mx-auto">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            Own Your Path
          </Badge>
          <h2 id="journey-heading" className="homepage-section-title founder-journey-section__title text-3xl sm:text-4xl lg:text-[2.9rem] mb-5">
            Every Founder's Journey is Unique
          </h2>
          <p className="homepage-section-copy founder-journey-section__copy mx-auto text-base sm:text-lg">
            But the challenges are universal. Here's how we clear the path from idea to launch, removing bottlenecks at every stage.
          </p>
        </ScrollReveal>

        {/* Vertical Timeline */}
        <div className="max-w-5xl mx-auto relative">
          {/* Timeline Line - Continuous vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border/80 hidden sm:block" />

          {/* Timeline Items */}
          <div className="space-y-10 md:space-y-14">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const accentClasses = getAccentClasses(step.accentColor);
              const isEven = index % 2 === 0;

              return (
                <ScrollReveal
                  key={index}
                  className="relative"
                  variant={isEven ? "slide-left" : "slide-right"}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-5">
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <span className="inline-flex items-center rounded-full border border-border/72 bg-background/88 px-3 py-1 text-label font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
                            <span className="inline-flex items-center rounded-full border border-border/72 bg-background/88 px-3 py-1 text-label font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
                            <span className="inline-flex items-center rounded-full border border-border/72 bg-background/88 px-3 py-1 text-label font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
                </ScrollReveal>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default EntrepreneurProblems;
