import { Brain, Users, AlertCircle, Lightbulb, Share2, DollarSign, Rocket } from "lucide-react";

interface InteractiveProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onStepClick?: (step: number) => void;
  isComplete?: boolean;
}

// Step configuration matching the screenshot design
const stepConfig = [
  {
    icon: Brain,
    name: "CONCEPT",
    description: "Clarify what you're building and why it matters.",
    days: "Days 1-2"
  },
  {
    icon: Users,
    name: "MARKET",
    description: "Define the people most likely to become your first customers.",
    days: "Days 3-4"
  },
  {
    icon: AlertCircle,
    name: "PROBLEM",
    description: "Turn vague frustrations into sharp, testable problems.",
    days: "Days 5-7"
  },
  {
    icon: Lightbulb,
    name: "SOLUTION",
    description: "Shape an offer that directly solves the core problem.",
    days: "Days 8-14"
  },
  {
    icon: Share2,
    name: "CHANNELS",
    description: "Decide how you'll reach real humans in the next 30 days.",
    days: "Days 15-21"
  },
  {
    icon: DollarSign,
    name: "PRICING",
    description: "Choose a pricing model that fits your goals and audience.",
    days: "Days 22-25"
  },
  {
    icon: Rocket,
    name: "LAUNCH",
    description: "Lock in your focused 30-day launch plan.",
    days: "Days 26-30"
  }
];

const InteractiveProgress = ({ 
  currentStep, 
  totalSteps, 
  stepTitles, 
  onStepClick,
  isComplete = false 
}: InteractiveProgressProps) => {
  const activeStepIndex = currentStep;
  const activeStep = stepConfig[activeStepIndex] || stepConfig[0];
  const progressPercentage = Math.round(((activeStepIndex + 1) / totalSteps) * 100);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < activeStepIndex) return "completed";
    if (stepIndex === activeStepIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Dark Gradient Background Container */}
      <div className="relative bg-gradient-to-br from-background via-background/95 to-background rounded-2xl shadow-2xl overflow-hidden border border-primary/10">
        <div className="p-6 sm:p-8 lg:p-10">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8">
            {/* Left Side - Title and Step Info */}
            <div className="mb-4 sm:mb-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-secondary mb-2">
                BIZMAP AI TIMELINE
              </h2>
              <div className="text-sm sm:text-base text-muted-foreground">
                <span className="font-semibold">Step {activeStepIndex + 1} of {totalSteps}</span>
                <span className="mx-2">·</span>
                <span>Currently working on: {activeStep.name} ({activeStep.days})</span>
              </div>
            </div>

            {/* Right Side - Progress Box */}
            <div className="bg-background/90 border border-primary/20 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-[250px] hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                {progressPercentage}% complete
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Follow the steps in order for the smoothest 30-day launch.
              </p>
            </div>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative">
            {/* Connecting Line Background */}
            <div className="absolute top-10 left-0 right-0 h-0.5 bg-border" />
            
            {/* Progress Line */}
            <div 
              className="absolute top-10 left-0 h-0.5 bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out animate-pulse"
              style={{ 
                width: totalSteps > 1 ? `${(activeStepIndex / (totalSteps - 1)) * 100}%` : '0%',
                boxShadow: '0 0 8px hsl(var(--primary) / 0.5), 0 0 12px hsl(var(--secondary) / 0.3)'
              }}
            />

            {/* Step Indicators */}
            <div className="flex justify-between items-start relative">
              {stepConfig.map((step, index) => {
                const status = getStepStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                const Icon = step.icon;
                
                return (
                  <div 
                    key={index}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      onStepClick ? 'cursor-pointer hover:scale-105' : ''
                    }`}
                    onClick={() => onStepClick?.(index)}
                    style={{ 
                      width: `${100 / totalSteps}%`,
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    {/* Icon Circle */}
                    <div className={`
                      relative z-10 w-20 h-20 rounded-full transition-all duration-300
                      flex items-center justify-center mb-4
                      ${isCurrent 
                        ? 'bg-gradient-to-br from-primary to-secondary border-2 border-primary/50 shadow-lg shadow-primary/50' 
                        : 'bg-background/60 border-2 border-border hover:border-primary/30 hover:bg-background/80'
                      }
                    `}
                    style={isCurrent ? {
                      animation: 'pulse-scale 2s ease-in-out infinite'
                    } : {}}
                    >
                      <Icon className={`w-8 h-8 transition-all duration-300 ${
                        isCurrent 
                          ? 'text-foreground' 
                          : 'text-muted-foreground'
                      }`}
                      style={isCurrent ? {
                        animation: 'bounce-slow 3s ease-in-out infinite'
                      } : {}}
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                      )}
                    </div>

                    {/* Step Title */}
                    <h4 className={`
                      text-xs sm:text-sm font-semibold mb-2 text-center transition-all duration-300
                      ${isCurrent 
                        ? 'text-foreground animate-pulse-glow' 
                        : 'text-muted-foreground'
                      }
                    `}>
                      STEP {index + 1} · {step.name}
                    </h4>
                    
                    {/* Step Description */}
                    <p className={`
                      text-[10px] sm:text-xs text-center leading-relaxed max-w-[140px] transition-all duration-300
                      ${isCurrent ? 'text-muted-foreground' : 'text-muted-foreground/80'}
                    `}>
                      {step.description}
                    </p>

                    {/* Active Button */}
                    {isCurrent && (
                      <button className="mt-3 px-4 py-1.5 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-foreground text-xs font-medium rounded-md transition-all animate-pulse-glow hover:scale-105 hover:shadow-lg hover:shadow-primary/50">
                        Active
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveProgress;
