import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  FlaskConical,
  LayoutDashboard,
  Lightbulb,
  Map,
  Rocket,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import FounderJourneyVideo from "./FounderJourneyVideo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { useIsMobile } from "@/hooks/use-mobile";

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
  cta: string;
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
    phase: "Customer Clarity",
    challenge: "Know exactly who you're building for",
    pathway: "Turn a broad audience into one specific buyer, urgent problem, buying trigger, and clear reason to choose you.",
    icon: Target,
    accentColor: "blue",
  },
  {
    phase: "Prove Value",
    challenge: "See whether customers care before you build",
    pathway: "Transform your idea into an interactive proof page that explains the problem, demonstrates your solution, and captures real customer interest.",
    icon: Lightbulb,
    accentColor: "green",
  },
  {
    phase: "Demand Validation",
    challenge: "Replace opinions with customer evidence",
    pathway: "Bring customer conversations, objections, and behavioral signals together to make a grounded Build, Narrow, Pivot, or Stop decision.",
    icon: FlaskConical,
    accentColor: "red",
  },
  {
    phase: "Product Building",
    challenge: "Build the smallest product that proves the value",
    pathway: "Turn validated customer needs into a focused, working MVP without wasting time and budget on unnecessary features.",
    icon: Rocket,
    accentColor: "blue",
  },
  {
    phase: "Go to Market",
    challenge: "Turn your offer into a measurable customer experiment",
    pathway: "Choose one audience, offer, message, and acquisition channel, then learn from real buyer responses.",
    icon: Map,
    accentColor: "amber",
  },
  {
    phase: "Traction",
    challenge: "Learn what to repeat, improve, or stop",
    pathway: "Track acquisition and retention signals across consistent experiments so your next growth decision is backed by evidence.",
    icon: LayoutDashboard,
    accentColor: "blue",
  },
  {
    phase: "Fundraising — When Ready",
    challenge: "Know when your business is ready for investor conversations",
    pathway: "Assess your readiness, strengthen your pitch, and focus on investors and accelerators that fit your business.",
    icon: Users,
    accentColor: "green",
  },
];

const journeyActions: JourneyAction[] = [
  {
    to: "/icp-builder",
    title: "Define Your Ideal Customer",
    outcome: "A focused customer decision",
    description: "Choose one buyer, urgent pain, buying trigger, and reason to choose you. Start with a customer decision you can test—not another assumption.",
    cta: "Define my customer",
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
    to: "/demo-studio",
    title: "Make Your Idea Testable",
    outcome: "A live proof page",
    description: "Create an interactive page that explains the problem, demonstrates your solution, and captures customer interest before you build the full product.",
    cta: "Create my proof page",
    icon: Lightbulb,
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
    to: "/pmf-lab",
    title: "Decide What the Evidence Says",
    outcome: "A clear product decision",
    description: "Combine customer conversations, objections, and behavioral signals into a grounded Build, Narrow, Pivot, or Stop decision.",
    cta: "Validate my idea",
    icon: FlaskConical,
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
    to: "/mvp-builder",
    title: "Build What Customers Asked For",
    outcome: "A working MVP",
    description: "Turn validated needs into a focused product, define the essential workflow, and avoid spending time and budget on unnecessary features.",
    cta: "Build my MVP",
    icon: Rocket,
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
    to: "/go-to-market",
    title: "Reach Your First Customers",
    outcome: "A focused acquisition play",
    description: "Choose one audience, offer, message, and channel. Run a focused outreach cycle, record what happens, and learn from real buyer responses.",
    cta: "Plan my launch",
    icon: Map,
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
    to: "/traction-engine",
    title: "Turn Activity Into Traction",
    outcome: "Comparable growth evidence",
    description: "Track acquisition and retention signals across consistent experiments. See what creates genuine customer movement and decide what to do next.",
    cta: "Track my traction",
    icon: LayoutDashboard,
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
    to: "/insighta-test",
    title: "Raise With Better Evidence",
    outcome: "Investor-ready preparation",
    description: "Assess your readiness, strengthen your pitch, and identify investors and accelerators that fit your stage, sector, and goals.",
    cta: "Check my readiness",
    icon: Users,
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
  const isMobile = useIsMobile();

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
              {action.cta}
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
            One Connected Founder Workspace
          </Badge>
          <h2 id="journey-heading" className="homepage-section-title founder-journey-section__title text-3xl sm:text-4xl lg:text-[2.9rem] mb-5">
            From Idea to Evidence. From Evidence to Growth.
          </h2>
          <p className="homepage-section-copy founder-journey-section__copy mx-auto text-base sm:text-lg">
            Start wherever you are. Creatives Takeover helps you identify what matters now, take the next useful action, and carry everything you learn into the next stage.
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
                  {isMobile ? (
                  <div className="space-y-5">
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
                  ) : (
                  <div className="grid grid-cols-2 grid-rows-[auto_1fr] gap-x-6 gap-y-4 lg:gap-x-8">
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
                  )}
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
