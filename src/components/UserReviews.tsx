import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Pencil,
  CheckCircle,
  Hammer,
  Rocket,
  Users,
  TrendingUp,
  Play,
  Pause
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
      "Define the exact problem, who it is for, what differentiates your solution, and why your team can deliver. The outcome is a clear ICP and measurable goals for the next stage.",
    icon: Lightbulb,
    color: "from-yellow-500/20 to-yellow-600/20"
  },
  {
    shortLabel: "Prototyping",
    title: "Stage 2: Prototyping",
    description:
      "Build a simple landing page and waitlist that clearly presents the future MVP features and user flow. This tests whether your value proposition is compelling before writing product code.",
    icon: Pencil,
    color: "from-blue-500/20 to-blue-600/20"
  },
  {
    shortLabel: "Validation",
    title: "Stage 3: Validation",
    description:
      "Run direct outreach and interviews, capture feedback, and measure waitlist conversion to confirm demand. If traction is weak, refine positioning and feature priorities with your ICP before moving on.",
    icon: CheckCircle,
    color: "from-green-500/20 to-green-600/20"
  },
  {
    shortLabel: "Building",
    title: "Stage 4: Building",
    description:
      "Once demand is validated, ship the MVP with only core features and tight scope. Use tools, mentors, and technical guidance to build reliably while preserving room to iterate.",
    icon: Hammer,
    color: "from-orange-500/20 to-orange-600/20"
  },
  {
    shortLabel: "Launch",
    title: "Stage 5: Launch",
    description:
      "Distribute aggressively across social channels, communities, and startup directories. Treat launch as an ongoing acquisition system, not a one-day event, and compound visibility with consistent branding.",
    icon: Rocket,
    color: "from-purple-500/20 to-purple-600/20"
  },
  {
    shortLabel: "Networking",
    title: "Stage 6: Networking",
    description:
      "Form strategic relationships through founder communities, partnerships, accelerators, and early investor conversations. Strong backing increases speed, distribution opportunities, and resilience.",
    icon: Users,
    color: "from-pink-500/20 to-pink-600/20"
  },
  {
    shortLabel: "Fundraising",
    title: "Stage 7: Fundraising",
    description:
      "After proving MVP execution, real demand, and early customers, raise capital to accelerate growth. It is optional, but the right funding can expand runway, talent, and execution capacity.",
    icon: TrendingUp,
    color: "from-indigo-500/20 to-indigo-600/20"
  }
];

const STEP_ANGLE = 360 / cycleSteps.length;

const UserReviews = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % cycleSteps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

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

  return (
    <section className="section-shell">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 sm:mb-20 px-6 sm:px-8 lg:px-12">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground">
            The 7 Stage Journey 🧭
          </Badge>
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 tracking-tight text-primary break-words">
            Startup Development Cycle
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The Startup Development Cycle is a step-by-step roadmap designed by Creatives Takeover to guide founders from shaping an idea to building, launching, and growing a startup.
          </p>
          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="gap-2"
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause Tour
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Auto Play
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:gap-10 lg:grid-cols-2 items-stretch">
          <Card className="surface-panel trust-outline overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="relative mx-auto w-full max-w-[560px] aspect-square">
                {/* SVG Layer for Connection Lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer decorative circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="39"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.15"
                    className="text-primary/20"
                  />

                  {/* Animated connection path */}
                  <path
                    d={generateConnectionPath()}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    className="text-primary/30"
                    strokeDasharray="2 2"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="4"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </path>

                  {/* Progress indicator - active segment glow */}
                  {stepPositions.map((_, index) => {
                    const isActiveSegment = index === activeStepIndex;
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
                        strokeWidth="0.6"
                        className={`transition-all duration-500 ${
                          isActiveSegment
                            ? "text-primary opacity-100"
                            : "text-primary/10 opacity-50"
                        }`}
                      />
                    );
                  })}
                </svg>

                {/* Background circles */}
                <div className="absolute inset-[8%] rounded-full border border-primary/20 bg-gradient-to-b from-primary/[0.07] to-background" />
                <div className="absolute inset-[19%] rounded-full border border-primary/15" />

                {/* Center active indicator with icon */}
                <div className={`absolute inset-[33%] rounded-full border border-primary/10 bg-gradient-to-br ${activeStep.color} backdrop-blur-sm flex items-center justify-center text-center px-6 transition-all duration-500`}>
                  <div className="animate-in fade-in zoom-in duration-300" key={activeStepIndex}>
                    <ActiveIcon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-primary" />
                    <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground mb-1">Active Stage</p>
                    <p className="font-space-grotesk text-lg sm:text-xl font-semibold">{activeStep.shortLabel}</p>
                  </div>
                </div>

                {/* Step buttons */}
                {stepPositions.map((position, index) => {
                  const step = cycleSteps[index];
                  const StepIcon = step.icon;
                  const isActive = index === activeStepIndex;

                  return (
                    <button
                      key={step.shortLabel}
                      type="button"
                      onClick={() => {
                        setActiveStepIndex(index);
                        setIsAutoPlaying(false);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[110px] sm:w-[122px] px-3 py-2.5 rounded-xl border text-xs sm:text-sm text-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 group ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110 animate-pulse"
                          : "bg-background/95 border-border/70 hover:border-primary/60 hover:bg-primary/10 hover:scale-105 hover:shadow-lg"
                      }`}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      aria-pressed={isActive}
                      aria-label={`Select ${step.title}`}
                    >
                      <StepIcon className={`w-4 h-4 mx-auto mb-1 transition-transform group-hover:scale-110 ${isActive ? 'animate-bounce' : ''}`} />
                      <span className="block text-[10px] sm:text-[11px] tracking-[0.1em] uppercase opacity-75">
                        {index + 1}
                      </span>
                      <span className="block mt-0.5 leading-tight font-semibold">{step.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel trust-outline overflow-hidden relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${activeStep.color} opacity-50 transition-all duration-500`} />
            <CardContent className="p-6 sm:p-8 lg:p-10 h-full flex flex-col justify-center relative z-10">
              <div className="animate-in fade-in slide-in-from-right duration-500" key={activeStepIndex}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${activeStep.color} border border-primary/20`}>
                    <ActiveIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <h3 className="font-space-grotesk text-2xl sm:text-3xl font-semibold flex-1">
                    {activeStep.title}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                  {activeStep.description}
                </p>

                {/* Progress indicator */}
                <div className="mt-6 flex gap-1.5">
                  {cycleSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveStepIndex(index);
                        setIsAutoPlaying(false);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeStepIndex
                          ? "bg-primary w-8"
                          : index < activeStepIndex
                          ? "bg-primary/40 w-6"
                          : "bg-primary/20 w-4"
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

