import { CheckCircle, Circle, Sparkles, Compass, Target, Rocket, TrendingUp } from "lucide-react";

interface InteractiveProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onStepClick?: (step: number) => void;
  isComplete?: boolean;
}

const InteractiveProgress = ({ 
  currentStep, 
  totalSteps, 
  stepTitles, 
  onStepClick,
  isComplete = false 
}: InteractiveProgressProps) => {
  // Enhanced step titles reflecting new chatbot features
  const enhancedStepTitles = [
    "🎯 Discovery & Vision",
    "🔍 Market Intelligence", 
    "💡 Solution Design",
    "📊 Financial Blueprint",
    "🚀 Launch Strategy",
    "📈 Growth & Scaling",
    "✅ Plan Refinement"
  ];

  const stepMeta = [
    {
      label: "Step 1 · Concept",
      description: "Clarify what you’re building and why it matters.",
      accentClass: "from-primary/15 via-primary/5 to-transparent",
      icon: Compass,
    },
    {
      label: "Step 2 · Market",
      description: "Define the people most likely to become your first customers.",
      accentClass: "from-secondary/15 via-secondary/5 to-transparent",
      icon: Target,
    },
    {
      label: "Step 3 · Problem",
      description: "Turn vague frustrations into sharp, testable problems.",
      accentClass: "from-accent/15 via-accent/5 to-transparent",
      icon: Sparkles,
    },
    {
      label: "Step 4 · Solution",
      description: "Shape an offer that directly solves the core problem.",
      accentClass: "from-primary/15 via-secondary/10 to-transparent",
      icon: Rocket,
    },
    {
      label: "Step 5 · Channels",
      description: "Decide how you’ll reach real humans in the next 30 days.",
      accentClass: "from-secondary/15 via-primary/10 to-transparent",
      icon: TrendingUp,
    },
    {
      label: "Step 6 · Pricing",
      description: "Choose a pricing model that fits your goals and audience.",
      accentClass: "from-primary/15 via-accent/10 to-transparent",
      icon: CheckCircle,
    },
    {
      label: "Step 7 · Roadmap",
      description: "Lock in your focused 30-day launch plan.",
      accentClass: "from-primary/15 via-secondary/10 to-transparent",
      icon: Rocket,
    },
  ];

  const displayTitles = stepTitles.length > 0 ? stepTitles : enhancedStepTitles;

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "upcoming";
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
      {/* Modern Timeline Card with Glass Effect */}
      <div className="group relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-background via-card/60 to-background shadow-xl hover:shadow-2xl transition-all duration-700">
        {/* Subtle gradient + shimmer */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        {/* Decorative corner nodes */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative z-10 p-7 sm:p-9 lg:p-10">
          {/* Progress Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary/80 uppercase mb-1">
                BizMap AI Timeline
              </p>
              <h3 className="text-xl sm:text-2xl font-bold creatives-font bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {isComplete ? "Plan Complete" : `Step ${currentStep + 1} of ${totalSteps}`}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md">
                {isComplete
                  ? "Your AI-generated plan is ready. Use the roadmap and report to move into execution."
                  : `Currently working on: ${displayTitles[currentStep]}`}
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
                <div className="absolute inset-0 rounded-xl border border-primary/30 animate-pulse opacity-40" />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {Math.round(((currentStep + (isComplete ? 1 : 0)) / totalSteps) * 100)}% complete
                </p>
                <p>Follow the steps in order for the smoothest 30-day launch.</p>
              </div>
            </div>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative px-1 sm:px-4 lg:px-8">
            {/* Progress Line */}
            <div className="absolute top-7 left-6 right-6 lg:left-10 lg:right-10 h-1 bg-muted-foreground/20 rounded-full" />
            <div
              className="absolute top-7 left-10 h-1 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out shadow-sm shadow-primary/30"
              style={{
                width:
                  totalSteps > 1
                    ? `calc(${(currentStep / (totalSteps - 1)) * 100}% - 0.5rem)`
                    : "0%",
              }}
            />

            {/* Steps */}
            <div className="flex justify-between items-start relative">
              {displayTitles.map((title, index) => {
                const status = getStepStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                const meta = stepMeta[index] ?? stepMeta[0];
                const Icon = meta.icon;

                return (
                  <div
                    key={index}
                    className={`flex flex-col items-center group/step transition-all duration-300 ${
                      onStepClick ? "cursor-pointer hover:scale-105" : ""
                    }`}
                    onClick={() => onStepClick?.(index)}
                    style={{ width: `${100 / totalSteps}%` }}
                  >
                    {/* Step Circle with icon */}
                    <div
                      className={`
                        relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-lg
                        transition-all duration-500
                        ${
                          isCompleted
                            ? "bg-primary border-primary shadow-primary/40"
                            : isCurrent
                            ? "bg-background border-primary border-4 shadow-primary/30"
                            : "bg-background border-muted-foreground/30"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                      ) : (
                        <Icon
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            isCurrent ? "text-primary" : "text-muted-foreground/70"
                          }`}
                        />
                      )}

                      {/* Glowing Ring for Current Step */}
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-70" />
                      )}

                      {/* Soft aura */}
                      <div
                        className={`pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-br ${
                          meta.accentClass
                        } opacity-0 group-hover/step:opacity-100 transition-opacity duration-500`}
                      />
                    </div>

                    {/* Step Label + mini description */}
                    <div className="mt-5 text-center max-w-[180px] group-hover/step:translate-y-0.5 transition-transform duration-300">
                      <p
                        className={`text-[11px] sm:text-xs font-semibold tracking-wide uppercase mb-1.5 ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {meta.label}
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground/70 leading-relaxed">
                        {meta.description}
                      </p>

                      {/* Status Badge */}
                      {(isCompleted || isCurrent) && (
                        <div className="mt-2">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-medium">
                              ✓ Done
                            </span>
                          )}
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-[11px] font-medium animate-pulse">
                              <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-ping" />
                              Active
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completion Message */}
          {isComplete && (
            <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-xl text-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-primary animate-pulse" />
                <p className="text-lg font-bold text-primary">
                  All Steps Completed!
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                🚀 Your AI-enhanced business plan with smart insights, industry benchmarks, and personalized recommendations is ready to launch
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveProgress;