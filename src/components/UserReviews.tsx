import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CycleStep = {
  shortLabel: string;
  title: string;
  description: string;
};

const cycleSteps: CycleStep[] = [
  {
    shortLabel: "Identity",
    title: "Step 1: Identity",
    description:
      "Define the exact problem, who it is for, what differentiates your solution, and why your team can deliver. The outcome is a clear ICP and measurable goals for the next stage."
  },
  {
    shortLabel: "Prototyping",
    title: "Step 2: Prototyping",
    description:
      "Build a simple landing page and waitlist that clearly presents the future MVP features and user flow. This tests whether your value proposition is compelling before writing product code."
  },
  {
    shortLabel: "Validation",
    title: "Step 3: Validation",
    description:
      "Run direct outreach and interviews, capture feedback, and measure waitlist conversion to confirm demand. If traction is weak, refine positioning and feature priorities with your ICP before moving on."
  },
  {
    shortLabel: "Building",
    title: "Step 4: Building",
    description:
      "Once demand is validated, ship the MVP with only core features and tight scope. Use tools, mentors, and technical guidance to build reliably while preserving room to iterate."
  },
  {
    shortLabel: "Launch",
    title: "Step 5: Launch",
    description:
      "Distribute aggressively across social channels, communities, and startup directories. Treat launch as an ongoing acquisition system, not a one-day event, and compound visibility with consistent branding."
  },
  {
    shortLabel: "Networking",
    title: "Step 6: Networking",
    description:
      "Form strategic relationships through founder communities, partnerships, accelerators, and early investor conversations. Strong backing increases speed, distribution opportunities, and resilience."
  },
  {
    shortLabel: "Fundraising",
    title: "Step 7: Fundraising",
    description:
      "After proving MVP execution, real demand, and early customers, raise capital to accelerate growth. It is optional, but the right funding can expand runway, talent, and execution capacity."
  }
];

const STEP_ANGLE = 360 / cycleSteps.length;

const UserReviews = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const stepPositions = cycleSteps.map((_, index) => {
    const angleInRadians = ((-90 + STEP_ANGLE * index) * Math.PI) / 180;
    const radius = 39;
    return {
      x: 50 + Math.cos(angleInRadians) * radius,
      y: 50 + Math.sin(angleInRadians) * radius
    };
  });

  const activeStep = cycleSteps[activeStepIndex];

  return (
    <section className="section-shell">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="section-header px-6 sm:px-8 lg:px-12">
          <h2 className="section-title mb-6 break-words">Startup Development Cycle</h2>
          <p className="section-description max-w-3xl mx-auto">
            Click each stage to explore what founders should achieve before moving to the next phase.
          </p>
        </div>

        <div className="grid gap-8 lg:gap-10 lg:grid-cols-2 items-stretch">
          <Card className="surface-panel trust-outline">
            <CardContent className="p-6 sm:p-8">
              <div className="relative mx-auto w-full max-w-[560px] aspect-square">
                <div className="absolute inset-[8%] rounded-full border border-primary/20 bg-gradient-to-b from-primary/[0.07] to-background" />
                <div className="absolute inset-[19%] rounded-full border border-primary/15" />
                <div className="absolute inset-[33%] rounded-full border border-primary/10 bg-background/90 backdrop-blur-sm flex items-center justify-center text-center px-6">
                  <div>
                    <p className="text-xs tracking-[0.22em] uppercase text-muted-foreground mb-2">Active Stage</p>
                    <p className="font-space-grotesk text-xl sm:text-2xl font-semibold">{activeStep.shortLabel}</p>
                  </div>
                </div>

                {stepPositions.map((position, index) => {
                  const step = cycleSteps[index];
                  const isActive = index === activeStepIndex;

                  return (
                    <button
                      key={step.shortLabel}
                      type="button"
                      onClick={() => setActiveStepIndex(index)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[104px] sm:w-[116px] px-3 py-2 rounded-xl border text-xs sm:text-sm text-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_0_3px_rgba(99,102,241,0.25)]"
                          : "bg-background/95 border-border/70 hover:border-primary/45 hover:bg-primary/5"
                      }`}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      aria-pressed={isActive}
                      aria-label={`Select ${step.title}`}
                    >
                      <span className="block text-[10px] sm:text-[11px] tracking-[0.1em] uppercase opacity-75">
                        {index + 1}
                      </span>
                      <span className="block mt-0.5 leading-tight">{step.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel trust-outline">
            <CardContent className="p-6 sm:p-8 lg:p-10 h-full flex flex-col justify-center">
              <Badge variant="outline" className="w-fit mb-4 bg-primary/10 border-primary/20 text-primary">
                Startup Development Cycle
              </Badge>
              <h3 className="font-space-grotesk text-2xl sm:text-3xl font-semibold mb-4">
                {activeStep.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
                {activeStep.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default UserReviews;

