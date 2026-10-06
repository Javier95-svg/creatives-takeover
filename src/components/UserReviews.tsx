import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Fingerprint,
  DraftingCompass,
  CheckCircle,
  Hammer,
  Rocket,
  ChartNoAxesCombined,
  TrendingUp
} from "lucide-react";

type CycleStep = {
  shortLabel: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
};

const cycleSteps: CycleStep[] = [
  {
    shortLabel: "Identity",
    title: "Stage 1: Identity",
    description:
      "In this stage, founders clarify the foundation of their startup by answering a few core questions:\n\nWhat specific problem are you solving?\nWho are you solving it for?\nWhat makes your solution different and more efficient?\nWhy are you the right person to build it?\n\nThe goal is to define your Ideal Customer Profile (ICP) and set clear, specific goals for what you want to achieve next.",
    icon: Fingerprint,
    color: "from-warning/20 to-warning/20"
  },
  {
    shortLabel: "Prototyping",
    title: "Stage 2: Prototyping",
    description:
      "After defining your identity, the next step is to create a simple landing page that works as your waitlist. This page should clearly explain what your product is, who it is for, and the core problem it solves so visitors quickly understand the value.\n\nIt should also describe the key features you plan to offer and give a simple overview of how the product will work, without building the MVP yet. The goal is to make the idea feel real enough to test interest, collect sign-ups, and confirm there is market demand before investing time and money into development.",
    icon: DraftingCompass,
    color: "from-info/20 to-info/20"
  },
  {
    shortLabel: "Validation",
    title: "Stage 3: Validation",
    description:
      "In this stage, founders actively reach out to potential customers and book one-on-one conversations to gather honest feedback on the concept. The goal is to confirm real demand by tracking signals like interview insights and how many people join the waitlist.\n\nThis step is crucial because it helps you avoid building something nobody wants. If validation is strong, you move forward to Step 4; if it’s weak, you iterate by asking your ideal customers what’s missing, what would make it valuable, or what alternatives they would choose instead.",
    icon: CheckCircle,
    color: "from-success/20 to-success/20"
  },
  {
    shortLabel: "Building",
    title: "Stage 4: Building",
    description:
      "Once validation is confirmed, founders can start building the MVP they’ve been promising. This is where the idea becomes a working product, supported by the tools and guidance available on Creatives Takeover, such as the MVP and Tech Stack Builder, plus access to mentors who have experience launching MVPs.\n\nThe focus at this stage is not to build the “perfect” final product. Instead, founders should develop only the core features that deliver the main value, so they can launch sooner, learn faster, and improve the product steadily as they grow.",
    icon: Hammer,
    color: "from-warning/20 to-warning/20"
  },
  {
    shortLabel: "Launch",
    title: "Stage 5: Launch",
    description:
      "In this stage, founders bring the product to the public and start actively promoting it wherever their audience already spends time. That includes direct outreach and consistent posting across channels like Product Hunt, LinkedIn, X, Reddit, Instagram, and other relevant sites.\n\nThey should also submit the startup to directories to increase visibility and begin building the brand through clear messaging, visuals, and a steady online presence. The goal is to generate early attention, attract first users, and start building momentum.",
    icon: Rocket,
    color: "from-purple-500/20 to-purple-600/20"
  },
  {
    shortLabel: "Traction",
    title: "Stage 6: Traction",
    description:
      "Launch got you users. Traction gets you a business. This stage is about finding the acquisition channel that fits your specific product, mapping what retention looks like in the first 30 days, and separating real growth from constant effort. Use the GTM Strategist to narrow the field and the Traction Engine to run the plays week by week.\n\nThree consecutive weeks above the score threshold is your milestone. It means your product retains users, your channel converts them, and you execute without burning out. That combination is what turns early traction into a fundable story.",
    icon: ChartNoAxesCombined,
    color: "from-pink-500/20 to-pink-600/20"
  },
  {
    shortLabel: "Fundraising",
    title: "Stage 7: Fundraising",
    description:
      "This is the final stage of the cycle, where founders raise capital to accelerate growth. It typically comes after proving the fundamentals, meaning you have a functional MVP, clear demand, early paying customers, and a solid plan for product and business development.\n\nFundraising provides the resources to scale faster, keep improving the product, and expand the team or operations. It also adds credibility, since investment often attracts more investment, and can help founders sustain themselves while they build and deliver on what they promised.",
    icon: TrendingUp,
    color: "from-indigo-500/20 to-indigo-600/20"
  }
];

const STEP_ANGLE = 360 / cycleSteps.length;

const UserReviews = () => {
  // Static by design: the visitor picks a stage. It used to auto-advance every
  // 5s, which moved the text before anyone could finish reading it.
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const isMobile = useIsMobile();

  const stepPositions = cycleSteps.map((_, index) => {
    const angleInRadians = ((-90 + STEP_ANGLE * index) * Math.PI) / 180;
    const radius = 39;
    return {
      x: 50 + Math.cos(angleInRadians) * radius,
      y: 50 + Math.sin(angleInRadians) * radius,
      angle: -90 + STEP_ANGLE * index
    };
  });

  const activeStep = cycleSteps[activeStepIndex];
  const ActiveIcon = activeStep.icon;
  const sectionHeader = (
    <div className="startup-cycle-header text-center mb-16 sm:mb-20 px-6 sm:px-8 lg:px-12">
      <Badge variant="outline" className="homepage-section-badge mb-5">
        The 7 Stage Journey
      </Badge>
      <h2 className="homepage-section-title startup-cycle-title text-3xl sm:text-4xl lg:text-[2.9rem] mb-5 break-words">
        Startup Development Cycle
      </h2>
      <p className="homepage-section-copy startup-cycle-copy text-base sm:text-lg max-w-3xl mx-auto">
        The Startup Development Cycle is a 7-stage roadmap built by Creatives Takeover to guide first-time founders from raw idea to funded startup.
        <br />
        <br />
        Phase A takes founders from ideation to launch, covering validation, MVP, and early distribution. Phase B focuses on traction and fundraising, building the repeatable acquisition systems that attract investors.
      </p>
    </div>
  );
  // Generate SVG path for connecting arc
  const generateConnectionPath = () => {
    const radius = 39;
    const centerX = 50;
    const centerY = 50;

    let path = "";
    stepPositions.forEach((_, index) => {
      const nextIndex = (index + 1) % stepPositions.length;
      const startAngle = ((-90 + STEP_ANGLE * index) * Math.PI) / 180;
      const endAngle = ((-90 + STEP_ANGLE * nextIndex) * Math.PI) / 180;

      const x1 = centerX + Math.cos(startAngle) * radius;
      const y1 = centerY + Math.sin(startAngle) * radius;
      const x2 = centerX + Math.cos(endAngle) * radius;
      const y2 = centerY + Math.sin(endAngle) * radius;

      if (index === 0) {
        path += `M ${x1} ${y1} `;
      }
      path += `A ${radius} ${radius} 0 0 1 ${x2} ${y2} `;
    });

    return path;
  };

  if (isMobile) {
    return (
      <section id="startup-development-cycle" className="startup-cycle-section section-shell overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          {sectionHeader}

          <div className="grid gap-4">
            <Card className="surface-panel trust-outline overflow-hidden">
              <CardContent className="p-2 xs:p-4">
                <div className="startup-cycle-mobile-wheel relative mx-auto w-full max-w-[min(100%,300px)] xs:max-w-[330px] aspect-square">
                  <svg
                    className="absolute inset-0 h-full w-full pointer-events-none"
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <radialGradient id="mobileRingGradient">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
                      </radialGradient>
                    </defs>

                    <circle
                      cx="50"
                      cy="50"
                      r="39"
                      fill="none"
                      stroke="url(#mobileRingGradient)"
                      strokeWidth="0.25"
                      className="text-primary"
                    />

                    <path
                      d={generateConnectionPath()}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.4"
                      className="text-primary/30"
                      strokeDasharray="2 2"
                    />

                    {stepPositions.map((_, index) => {
                      const isActiveSegment = index === activeStepIndex;
                      const isPastSegment = index < activeStepIndex;
                      const nextIndex = (index + 1) % stepPositions.length;
                      const startAngle = ((-90 + STEP_ANGLE * index) * Math.PI) / 180;
                      const endAngle = ((-90 + STEP_ANGLE * nextIndex) * Math.PI) / 180;
                      const radius = 39;

                      const x1 = 50 + Math.cos(startAngle) * radius;
                      const y1 = 50 + Math.sin(startAngle) * radius;
                      const x2 = 50 + Math.cos(endAngle) * radius;
                      const y2 = 50 + Math.sin(endAngle) * radius;

                      return (
                        <path
                          key={`mobile-segment-${index}`}
                          d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={isActiveSegment ? "0.8" : "0.6"}
                          className={`transition-all duration-700 ${
                            isActiveSegment
                              ? "text-primary opacity-100"
                              : isPastSegment
                              ? "text-primary/50 opacity-70"
                              : "text-primary/10 opacity-50"
                          }`}
                        />
                      );
                    })}
                  </svg>

                  <div className="absolute inset-[8%] rounded-full border-2 border-primary/20 bg-gradient-to-b from-primary/[0.07] to-background shadow-[inset_0_2px_20px_rgba(0,0,0,0.08)]" />
                  <div className="absolute inset-[18%] rounded-full border border-primary/15 shadow-[0_0_15px_rgba(99,102,241,0.1)]" />

                  <div className={`absolute inset-[31%] rounded-full border-2 border-primary/20 bg-gradient-to-br ${activeStep.color} backdrop-blur-sm flex items-center justify-center px-4 text-center transition-all duration-700 shadow-lg`}>
                    <div key={`mobile-active-${activeStepIndex}`}>
                      <ActiveIcon className="mx-auto mb-2 h-7 w-7 text-primary" />
                      <p className="text-caption tracking-[0.22em] uppercase text-muted-foreground">Active</p>
                      <p className="mt-1 font-space-grotesk text-sm font-semibold text-foreground leading-tight">
                        {activeStep.shortLabel}
                      </p>
                    </div>
                  </div>

                  {stepPositions.map((position, index) => {
                    const step = cycleSteps[index];
                    const StepIcon = step.icon;
                    const isActive = index === activeStepIndex;
                    const isPast = index < activeStepIndex;

                    return (
                      <button
                        key={`mobile-${step.shortLabel}`}
                        type="button"
                        onClick={() => {
                          setActiveStepIndex(index);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-[78px] rounded-xl border px-2 py-2 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_16px_32px_-18px_rgba(37,99,235,0.55)] scale-105"
                            : isPast
                            ? "bg-background/95 border-primary/35 text-foreground"
                            : "bg-background/95 border-border/70 text-foreground"
                        }`}
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                        }}
                        aria-pressed={isActive}
                        aria-label={`Select ${step.title}`}
                      >
                        <StepIcon className="mx-auto h-3.5 w-3.5" />
                        <span className="mt-1 block text-caption uppercase tracking-[0.16em] opacity-80">
                          {index + 1}
                        </span>
                        <span className="mt-0.5 block text-caption font-semibold leading-tight">
                          {step.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-panel trust-outline overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${activeStep.color} opacity-20 transition-all duration-700`} />
              <CardContent className="relative z-10 p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className={`rounded-2xl border border-primary/20 bg-gradient-to-br ${activeStep.color} p-3`}>
                    <ActiveIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-space-grotesk text-xl font-semibold text-foreground">
                    {activeStep.title}
                  </h3>
                </div>
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
                  {activeStep.description}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="startup-development-cycle" className="startup-cycle-section section-shell overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        {sectionHeader}

        <div className="grid gap-8 lg:gap-10 lg:grid-cols-2 items-stretch">
          <Card className="surface-panel trust-outline overflow-hidden relative group">
            {/* Ambient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-primary/4" />
            <CardContent className="p-6 sm:p-8 relative">
              <div className="relative mx-auto w-full max-w-[560px] aspect-square">
                {/* SVG Layer for Connection Lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Glowing outer ring */}
                  <defs>
                    <radialGradient id="ringGradient">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
                    </radialGradient>
                  </defs>

                  {/* Outer decorative circle with glow */}
                  <circle
                    cx="50"
                    cy="50"
                    r="39"
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth="0.25"
                    className="text-primary"
                  />

                  {/* Animated connection path */}
                  <path
                    d={generateConnectionPath()}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    className="text-primary/30"
                    strokeDasharray="2 2"
                  />

                  {/* Progress indicator - active segment glow */}
                  {stepPositions.map((_, index) => {
                    const isActiveSegment = index === activeStepIndex;
                    const isPastSegment = index < activeStepIndex;
                    const nextIndex = (index + 1) % stepPositions.length;
                    const startAngle = ((-90 + STEP_ANGLE * index) * Math.PI) / 180;
                    const endAngle = ((-90 + STEP_ANGLE * nextIndex) * Math.PI) / 180;
                    const radius = 39;

                    const x1 = 50 + Math.cos(startAngle) * radius;
                    const y1 = 50 + Math.sin(startAngle) * radius;
                    const x2 = 50 + Math.cos(endAngle) * radius;
                    const y2 = 50 + Math.sin(endAngle) * radius;

                    return (
                      <path
                        key={`segment-${index}`}
                        d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={isActiveSegment ? "0.8" : "0.6"}
                        className={`transition-all duration-700 ${
                          isActiveSegment
                            ? "text-primary opacity-100"
                            : isPastSegment
                            ? "text-primary/50 opacity-70"
                            : "text-primary/10 opacity-50"
                        }`}
                      />
                    );
                  })}
                </svg>

                {/* Background circles with 3D effect */}
                <div className="absolute inset-[8%] rounded-full border-2 border-primary/20 bg-gradient-to-b from-primary/[0.07] to-background shadow-[inset_0_2px_20px_rgba(0,0,0,0.1)]" />
                <div className="absolute inset-[19%] rounded-full border border-primary/15 shadow-[0_0_15px_rgba(99,102,241,0.1)]" />

                {/* Center active indicator with icon */}
                <div className={`absolute inset-[33%] rounded-full border-2 border-primary/20 bg-gradient-to-br ${activeStep.color} backdrop-blur-sm flex items-center justify-center text-center px-6 shadow-lg`}>
                  <div key={activeStepIndex}>
                    <ActiveIcon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-primary" />
                    <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground mb-1">Active Stage</p>
                    <p className="font-space-grotesk text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text">{activeStep.shortLabel}</p>
                  </div>
                </div>

                {/* Step buttons */}
                {stepPositions.map((position, index) => {
                  const step = cycleSteps[index];
                  const StepIcon = step.icon;
                  const isActive = index === activeStepIndex;
                  const isPast = index < activeStepIndex;

                  return (
                    <button
                      key={step.shortLabel}
                      type="button"
                      onClick={() => {
                        setActiveStepIndex(index);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[110px] sm:w-[122px] px-3 py-2.5 rounded-xl border-2 text-xs sm:text-sm text-center font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 overflow-hidden ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : isPast
                          ? "bg-background/95 border-primary/40 hover:border-primary/60 hover:bg-primary/10"
                          : "bg-background/95 border-border/70 hover:border-primary/60 hover:bg-primary/10"
                      }`}
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                      }}
                      aria-pressed={isActive}
                      aria-label={`Select ${step.title}`}
                    >
                      <div className="relative z-10">
                        <StepIcon className="w-4 h-4 mx-auto mb-1" />
                        <span className="block text-caption sm:text-label tracking-[0.1em] uppercase opacity-75">
                          {index + 1}
                        </span>
                        <span className="block mt-0.5 leading-tight font-semibold">{step.shortLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel trust-outline overflow-hidden relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${activeStep.color} opacity-28`} />

            <CardContent className="p-6 sm:p-8 lg:p-10 h-full flex flex-col justify-center relative z-10">
              <div key={activeStepIndex}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${activeStep.color} border border-primary/18`}>
                    <ActiveIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <h3 className="font-space-grotesk text-2xl sm:text-3xl font-semibold flex-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {activeStep.title}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-base sm:text-lg whitespace-pre-line">
                  {activeStep.description}
                </p>

                {/* Enhanced progress indicator */}
                <div className="mt-6 flex gap-1.5">
                  {cycleSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveStepIndex(index);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-500 hover:h-2 ${
                        index === activeStepIndex
                          ? "bg-gradient-to-r from-primary via-primary/90 to-primary w-8"
                          : index < activeStepIndex
                          ? "bg-primary/40 w-6 hover:w-7 hover:bg-primary/60"
                          : "bg-primary/20 w-4 hover:w-5 hover:bg-primary/30"
                      }`}
                      aria-label={`Go to ${cycleSteps[index].shortLabel}`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default UserReviews;
