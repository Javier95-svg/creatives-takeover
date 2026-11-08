import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Fingerprint,
  DraftingCompass,
  CheckCircle,
  Hammer,
  Rocket,
  ChartNoAxesCombined,
  TrendingUp,
  Play,
  Pause
} from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import TitleFx from "@/components/home/TitleFx";
import StageCard from "@/components/home/StageCard";

type CycleStep = {
  shortLabel: string;
  /** The stage card's colour for this stage. */
  accent: string;
  /** What the stage is for. */
  objective: string;
  /** What the founder completes in it, from STAGE_TASKS (src/lib/bizmapStages.ts). */
  result: string;
  title: string;
  icon: React.ElementType;
  color: string;
};

const cycleSteps: CycleStep[] = [
  {
    shortLabel: "Identity",
    accent: "#f5a524",
    objective:
      "Every venture starts with a precise answer to who it serves. This stage turns a broad idea into a defined problem, a specific customer who feels it and a clear reason your solution is different.",
    result:
      "You complete an ideal customer profile, rank the top three customer pains by urgency, and select your target industries and buyer persona. You leave with one customer to focus on and a clear goal for what to prove next.",
    title: "Stage 1: Identity",
    icon: Fingerprint,
    color: "from-warning/20 to-warning/20"
  },
  {
    shortLabel: "Prototyping",
    accent: "#38bdf8",
    objective:
      "Before any code is written, the idea needs to be visible. This stage produces a page that explains what the product does, who it is for and the problem it solves, so real people can respond to it.",
    result:
      "You write a one-line value proposition, draft the headline and core benefits, and publish the page as a waitlist with a shareable link. The stage is complete once the waitlist is live and ready to collect sign-ups.",
    title: "Stage 2: Prototyping",
    icon: DraftingCompass,
    color: "from-info/20 to-info/20"
  },
  {
    shortLabel: "Validation",
    accent: "#34d399",
    objective:
      "This stage tests whether the demand is real before time and money go into building. The evidence comes from one-to-one conversations with potential customers, the alternatives they use today and waitlist sign-ups.",
    result:
      "You define your key hypotheses and risks, then record at least 25 interviews or surveys against them. The evidence leads to one clear decision: build, narrow the focus, pivot or stop.",
    title: "Stage 3: Validation",
    icon: CheckCircle,
    color: "from-success/20 to-success/20"
  },
  {
    shortLabel: "Building",
    accent: "#fb923c",
    objective:
      "With demand confirmed, the goal is a first version, not a finished product. It covers only the core features that deliver the main value, so customers can start using it and the product improves from real use.",
    result:
      "You save an MVP scope and product spec based on your validated evidence, choose a tech stack with an estimated budget, and publish one workflow a customer can pay for. Experts in specific fields can review the plan along the way.",
    title: "Stage 4: Building",
    icon: Hammer,
    color: "from-warning/20 to-warning/20"
  },
  {
    shortLabel: "Launch",
    accent: "#a78bfa",
    objective:
      "A product gains users only when it reaches the places its customers already spend time. This stage concentrates effort on one acquisition channel instead of spreading it across many.",
    result:
      "You design one measurable acquisition play, then run a first-customer cycle: 10 qualified prospects, 10 direct messages and a decision on whether the channel is worth repeating. Launch directories and outreach templates extend your reach.",
    title: "Stage 5: Launch",
    icon: Rocket,
    color: "from-purple-500/20 to-purple-600/20"
  },
  {
    shortLabel: "Traction",
    accent: "#f472b6",
    objective:
      "Early users prove interest; traction proves it can be repeated. This stage separates growth that compounds from growth that depends on constant effort, measured through acquisition, retention and revenue.",
    result:
      "You repeat the same acquisition motion in a second cycle, log results week by week and verify at least one qualified buyer signal. Three consecutive strong weeks mark the point where fundraising preparation can begin.",
    title: "Stage 6: Traction",
    icon: ChartNoAxesCombined,
    color: "from-pink-500/20 to-pink-600/20"
  },
  {
    shortLabel: "Fundraising",
    accent: "#818cf8",
    objective:
      "Fundraising is optional and only makes sense once traction is verified. Investors look for the same proof: a working product, evidence of demand, early paying customers and a clear use of funds.",
    result:
      "You measure your fundraising readiness, review your pitch deck narrative and build a target list of investors and accelerators that match your stage and sector. No platform can guarantee funding; stronger evidence leads to stronger conversations.",
    title: "Stage 7: Fundraising",
    icon: TrendingUp,
    color: "from-indigo-500/20 to-indigo-600/20"
  }
];

const STEP_ANGLE = 360 / cycleSteps.length;

const UserReviews = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  // The wheel and the stage card share this index, so both always show the
  // same stage; picking one in either place stops the auto-play.
  const selectStep = (index: number) => {
    setActiveStepIndex(index);
    setIsAutoPlaying(false);
  };

  // Auto-play functionality
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsAutoPlaying(false);
      return;
    }

    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % cycleSteps.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, prefersReducedMotion]);

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
      <Badge variant="outline" className="homepage-section-badge mb-5 animate-in fade-in slide-in-from-top duration-700">
        A Proven Methodology
      </Badge>
      <h2 className="homepage-section-title startup-cycle-title text-3xl sm:text-4xl lg:text-[2.9rem] mb-5 break-words animate-in fade-in slide-in-from-bottom duration-700 delay-100">
        <TitleFx variant="evolve" text="Track Your Project Evolution" />
      </h2>
      <p className="homepage-section-copy startup-cycle-copy text-base sm:text-lg max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom duration-700 delay-200">
        Creatives Takeover functions as an Accelerator-as-a-Service (AaaS): every user has full access to our methodology, tools and experts from day one, without giving up equity.
      </p>
      <p className="homepage-section-copy startup-cycle-copy text-base sm:text-lg max-w-3xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
        Our development cycle has 7 stages, each with a clear result, and a dashboard that always shows what to focus on next.
      </p>
    </div>
  );
  const autoPlayControl = (
    <div className="mt-6 flex justify-center animate-in fade-in zoom-in duration-700 delay-300">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
        className="gap-2 border-border/80 bg-background/70 hover:bg-background hover:scale-105 transition-transform duration-200"
      >
        {isAutoPlaying ? (
          <>
            <Pause className="w-4 h-4" />
            Pause
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Play
          </>
        )}
      </Button>
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
                      style={prefersReducedMotion ? undefined : { animation: 'cycle-ring-pulse-mobile 3s ease-in-out infinite' }}
                    />

                    <path
                      d={generateConnectionPath()}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.4"
                      className="text-primary/30"
                      strokeDasharray="2 2"
                      style={prefersReducedMotion ? undefined : { animation: 'cycle-dash-spin 8s linear infinite' }}
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
                          style={isActiveSegment && !prefersReducedMotion ? { animation: 'cycle-stroke-pulse 2s ease-in-out infinite' } : undefined}
                        />
                      );
                    })}
                  </svg>

                  <div className="absolute inset-[8%] rounded-full border-2 border-primary/20 bg-gradient-to-b from-primary/[0.07] to-background shadow-[inset_0_2px_20px_rgba(0,0,0,0.08)]" />
                  <div className="absolute inset-[18%] rounded-full border border-primary/15 shadow-[0_0_15px_rgba(99,102,241,0.1)]" />

                  <div className={`absolute inset-[31%] rounded-full border-2 border-primary/20 bg-gradient-to-br ${activeStep.color} backdrop-blur-sm flex items-center justify-center px-4 text-center transition-all duration-700 shadow-lg`}>
                    <div key={`mobile-active-${activeStepIndex}`} className="animate-in fade-in zoom-in duration-500">
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
                          setIsAutoPlaying(false);
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
                {autoPlayControl}
              </CardContent>
            </Card>

            <StageCard steps={cycleSteps} active={activeStepIndex} onSelect={selectStep} />
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
            {/* Ambient background animation */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-primary/4" />
            <CardContent className="p-6 sm:p-8 relative">
              <div className="relative mx-auto w-full max-w-[560px] aspect-square" style={{ perspective: '1000px' }}>
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
                    style={prefersReducedMotion ? undefined : { animation: 'cycle-ring-pulse 3s ease-in-out infinite' }}
                  />

                  {/* Animated connection path */}
                  <path
                    d={generateConnectionPath()}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    className="text-primary/30"
                    strokeDasharray="2 2"
                    style={prefersReducedMotion ? undefined : { animation: 'cycle-dash-spin 8s linear infinite' }}
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
                        style={isActiveSegment && !prefersReducedMotion ? { animation: 'cycle-stroke-pulse 2s ease-in-out infinite' } : undefined}
                      />
                    );
                  })}
                </svg>

                {/* Background circles with 3D effect */}
                <div className="absolute inset-[8%] rounded-full border-2 border-primary/20 bg-gradient-to-b from-primary/[0.07] to-background shadow-[inset_0_2px_20px_rgba(0,0,0,0.1)]" style={{ transform: 'translateZ(0)' }} />
                <div className="absolute inset-[19%] rounded-full border border-primary/15 shadow-[0_0_15px_rgba(99,102,241,0.1)]" />

                {/* Center active indicator with icon */}
                <div className={`absolute inset-[33%] rounded-full border-2 border-primary/20 bg-gradient-to-br ${activeStep.color} backdrop-blur-sm flex items-center justify-center text-center px-6 transition-all duration-700 shadow-lg hover:scale-105`} style={{ transform: 'translateZ(20px)' }}>
                  <div className="animate-in fade-in zoom-in duration-500" key={activeStepIndex}>
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
                        setIsAutoPlaying(false);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[110px] sm:w-[122px] px-3 py-2.5 rounded-xl border-2 text-xs sm:text-sm text-center font-medium transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 group overflow-hidden ${
                        isActive
                          ? "bg-gradient-to-br from-primary via-primary to-primary/92 text-primary-foreground border-primary shadow-[0_22px_34px_-22px_rgba(37,99,235,0.7)] scale-110"
                          : isPast
                          ? "bg-background/95 border-primary/40 hover:border-primary/60 hover:bg-primary/10 hover:scale-105 hover:shadow-[0_8px_20px_rgba(99,102,241,0.2)] hover:-translate-y-1"
                          : "bg-background/95 border-border/70 hover:border-primary/60 hover:bg-primary/10 hover:scale-105 hover:shadow-[0_8px_20px_rgba(99,102,241,0.2)] hover:-translate-y-1"
                      }`}
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: isActive ? `translate(-50%, -50%) rotateX(5deg) rotateY(5deg) scale(1.1)` : 'translate(-50%, -50%)',
                        transformStyle: 'preserve-3d'
                      }}
                      aria-pressed={isActive}
                      aria-label={`Select ${step.title}`}
                    >
                      <div className="relative z-10">
                        <StepIcon className={`w-4 h-4 mx-auto mb-1 transition-all duration-300 ${isActive ? '' : 'group-hover:scale-125 group-hover:rotate-12'}`} />
                        <span className="block text-caption sm:text-label tracking-[0.1em] uppercase opacity-75">
                          {index + 1}
                        </span>
                        <span className="block mt-0.5 leading-tight font-semibold">{step.shortLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {autoPlayControl}
            </CardContent>
          </Card>

          <StageCard steps={cycleSteps} active={activeStepIndex} onSelect={selectStep} />
        </div>
      </div>
    </section>
  );
};

export default UserReviews;
