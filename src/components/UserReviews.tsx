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
  Megaphone,
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
      "In this stage, founders clarify the foundation of their startup by answering a few core questions:\n\nWhat specific problem are you solving?\nWho are you solving it for?\nWhat makes your solution different and more efficient?\nWhy are you the right person to build it?\n\nThe goal is to define your Ideal Customer Profile (ICP) and set clear, specific goals for what you want to achieve next.",
    icon: Lightbulb,
    color: "from-yellow-500/20 to-yellow-600/20"
  },
  {
    shortLabel: "Prototyping",
    title: "Stage 2: Prototyping",
    description:
      "After defining your identity, the next step is to create a simple landing page that works as your waitlist. This page should clearly explain what your product is, who it is for, and the core problem it solves so visitors quickly understand the value.\n\nIt should also describe the key features you plan to offer and give a simple overview of how the product will work, without building the MVP yet. The goal is to make the idea feel real enough to test interest, collect sign-ups, and confirm there is market demand before investing time and money into development.",
    icon: Pencil,
    color: "from-blue-500/20 to-blue-600/20"
  },
  {
    shortLabel: "Validation",
    title: "Stage 3: Validation",
    description:
      "In this stage, founders actively reach out to potential customers and book one-on-one conversations to gather honest feedback on the concept. The goal is to confirm real demand by tracking signals like interview insights and how many people join the waitlist.\n\nThis step is crucial because it helps you avoid building something nobody wants. If validation is strong, you move forward to Step 4; if it’s weak, you iterate by asking your ideal customers what’s missing, what would make it valuable, or what alternatives they would choose instead.",
    icon: CheckCircle,
    color: "from-green-500/20 to-green-600/20"
  },
  {
    shortLabel: "Building",
    title: "Stage 4: Building",
    description:
      "Once validation is confirmed, founders can start building the MVP they’ve been promising. This is where the idea becomes a working product, supported by the tools and guidance available on Creatives Takeover, such as the MVP and Tech Stack Builder, plus access to mentors who have experience launching MVPs.\n\nThe focus at this stage is not to build the “perfect” final product. Instead, founders should develop only the core features that deliver the main value, so they can launch sooner, learn faster, and improve the product steadily as they grow.",
    icon: Hammer,
    color: "from-orange-500/20 to-orange-600/20"
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
    shortLabel: "Branding",
    title: "Stage 6: Branding",
    description:
      "In this stage, founders focus on building visibility and trust that can accelerate growth. That means shaping a clear brand story, showing up consistently where their audience gathers, and building credibility through partnerships, communities, and the right industry spaces where awareness turns into opportunity.\n\nThey should also start exploring bigger support systems by positioning their brand for scale through accelerators and early investor conversations that test market belief. Because recognition can significantly improve a startup's chances of earning attention, users, and backing, Creatives Takeover supports users with networking focused tools across Insighta and Community.",
    icon: Megaphone,
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
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % cycleSteps.length);
    }, 5000);

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
    <section className="section-shell overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 sm:mb-20 px-6 sm:px-8 lg:px-12">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground animate-in fade-in slide-in-from-top duration-700">
            The 7 Stage Journey 🧭
          </Badge>
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 tracking-tight text-primary break-words animate-in fade-in slide-in-from-bottom duration-700 delay-100">
            Startup Development Cycle
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-700 delay-200">
            The Startup Development Cycle is a step-by-step roadmap designed by Creatives Takeover to guide founders from shaping an idea to building, launching, and growing a startup.
          </p>
          <div className="mt-6 animate-in fade-in zoom-in duration-700 delay-300">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="gap-2 hover:scale-105 transition-transform duration-200"
            >
                {isAutoPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
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
          <Card className="surface-panel trust-outline overflow-hidden relative group">
            {/* Ambient background animation */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-pulse" style={{ animationDuration: '4s' }} />
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
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
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
                    filter="url(#glow)"
                  >
                    <animate
                      attributeName="r"
                      values="39;39.5;39"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Animated connection path */}
                  <path
                    d={generateConnectionPath()}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    className="text-primary/30"
                    strokeDasharray="2 2"
                    filter="url(#glow)"
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
                            ? "text-primary opacity-100 drop-shadow-[0_0_8px_currentColor]"
                            : isPastSegment
                            ? "text-primary/50 opacity-70"
                            : "text-primary/10 opacity-50"
                        }`}
                        filter={isActiveSegment ? "url(#glow)" : undefined}
                      >
                        {isActiveSegment && (
                          <animate
                            attributeName="stroke-width"
                            values="0.8;1;0.8"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        )}
                      </path>
                    );
                  })}
                </svg>

                {/* Background circles with 3D effect */}
                <div className="absolute inset-[8%] rounded-full border-2 border-primary/20 bg-gradient-to-b from-primary/[0.07] to-background shadow-[inset_0_2px_20px_rgba(0,0,0,0.1)] animate-pulse" style={{ animationDuration: '6s', transform: 'translateZ(0)' }} />
                <div className="absolute inset-[19%] rounded-full border border-primary/15 shadow-[0_0_15px_rgba(99,102,241,0.1)] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

                {/* Center active indicator with icon */}
                <div className={`absolute inset-[33%] rounded-full border-2 border-primary/20 bg-gradient-to-br ${activeStep.color} backdrop-blur-sm flex items-center justify-center text-center px-6 transition-all duration-700 shadow-[0_0_30px_rgba(99,102,241,0.3),inset_0_2px_15px_rgba(255,255,255,0.1)] hover:scale-105`} style={{ transform: 'translateZ(20px)' }}>
                  <div className="animate-in fade-in zoom-in duration-500" key={activeStepIndex}>
                    <ActiveIcon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-primary drop-shadow-[0_0_8px_currentColor] animate-pulse" style={{ animationDuration: '3s' }} />
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
                          ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground border-primary shadow-[0_0_25px_rgba(99,102,241,0.6),0_0_40px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] scale-110 animate-pulse"
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
                      {/* Ripple effect on active */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                      )}
                      <div className="relative z-10">
                        <StepIcon className={`w-4 h-4 mx-auto mb-1 transition-all duration-300 ${isActive ? 'animate-bounce drop-shadow-[0_0_8px_currentColor]' : 'group-hover:scale-125 group-hover:rotate-12'}`} style={{ animationDuration: isActive ? '1.5s' : undefined }} />
                        <span className="block text-[10px] sm:text-[11px] tracking-[0.1em] uppercase opacity-75">
                          {index + 1}
                        </span>
                        <span className="block mt-0.5 leading-tight font-semibold">{step.shortLabel}</span>
                      </div>
                      {/* Shine effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel trust-outline overflow-hidden relative group">
            {/* Animated gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${activeStep.color} opacity-50 transition-all duration-700`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Floating particles effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full blur-sm animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-primary/15 rounded-full blur-sm animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
              <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-primary/25 rounded-full blur-sm animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            </div>

            <CardContent className="p-6 sm:p-8 lg:p-10 h-full flex flex-col justify-center relative z-10">
              <div className="animate-in fade-in slide-in-from-right duration-700" key={activeStepIndex}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${activeStep.color} border-2 border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-sm hover:scale-110 transition-transform duration-300`}>
                    <ActiveIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary drop-shadow-[0_0_6px_currentColor]" />
                  </div>
                  <h3 className="font-space-grotesk text-2xl sm:text-3xl font-semibold flex-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {activeStep.title}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-base sm:text-lg whitespace-pre-line animate-in fade-in duration-700 delay-100">
                  {activeStep.description}
                </p>

                {/* Enhanced progress indicator */}
                <div className="mt-6 flex gap-1.5 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
                  {cycleSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveStepIndex(index);
                        setIsAutoPlaying(false);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-500 hover:h-2 ${
                        index === activeStepIndex
                          ? "bg-gradient-to-r from-primary via-primary/90 to-primary w-8 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
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
