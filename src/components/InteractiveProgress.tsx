import { Compass, Target, Sparkles, Rocket, TrendingUp, CheckCircle } from "lucide-react";

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
    icon: Compass,
    name: "CONCEPT",
    description: "Clarify what you're building and why it matters.",
    days: "Days 1-2"
  },
  {
    icon: Target,
    name: "MARKET",
    description: "Define the people most likely to become your first customers.",
    days: "Days 3-4"
  },
  {
    icon: Sparkles,
    name: "PROBLEM",
    description: "Turn vague frustrations into sharp, testable problems.",
    days: "Days 5-7"
  },
  {
    icon: Rocket,
    name: "SOLUTION",
    description: "Shape an offer that directly solves the core problem.",
    days: "Days 8-14"
  },
  {
    icon: TrendingUp,
    name: "CHANNELS",
    description: "Decide how you'll reach real humans in the next 30 days.",
    days: "Days 15-21"
  },
  {
    icon: CheckCircle,
    name: "PRICING",
    description: "Choose a pricing model that fits your goals and audience.",
    days: "Days 22-25"
  },
  {
    icon: Rocket,
    name: "ROADMAP",
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
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8 lg:p-10">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8">
            {/* Left Side - Title and Step Info */}
            <div className="mb-4 sm:mb-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                BIZMAP AI TIMELINE
              </h2>
              <div className="text-sm sm:text-base text-gray-300">
                <span className="font-semibold">Step {activeStepIndex + 1} of {totalSteps}</span>
                <span className="mx-2">·</span>
                <span>Currently working on: {activeStep.name} ({activeStep.days})</span>
              </div>
            </div>

            {/* Right Side - Progress Box */}
            <div className="bg-gray-800/90 border border-gray-700 rounded-lg p-4 sm:p-5 min-w-[200px] sm:min-w-[250px]">
              <div className="text-3xl sm:text-4xl font-bold text-blue-500 mb-1">
                {progressPercentage}% complete
              </div>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Follow the steps in order for the smoothest 30-day launch.
              </p>
            </div>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative">
            {/* Connecting Line Background */}
            <div className="absolute top-10 left-0 right-0 h-0.5 bg-gray-700" />
            
            {/* Progress Line */}
            <div 
              className="absolute top-10 left-0 h-0.5 bg-blue-500 transition-all duration-500 ease-out"
              style={{ 
                width: totalSteps > 1 ? `${(activeStepIndex / (totalSteps - 1)) * 100}%` : '0%'
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
                      onStepClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onStepClick?.(index)}
                    style={{ width: `${100 / totalSteps}%` }}
                  >
                    {/* Icon Circle */}
                    <div className={`
                      relative z-10 w-20 h-20 rounded-full transition-all duration-300
                      flex items-center justify-center mb-4
                      ${isCurrent 
                        ? 'bg-blue-500 border-2 border-blue-400 shadow-lg shadow-blue-500/50' 
                        : 'bg-gray-600 border-2 border-gray-500'
                      }
                    `}>
                      <Icon className={`w-8 h-8 ${
                        isCurrent ? 'text-white' : 'text-gray-300'
                      }`} />
                    </div>

                    {/* Step Title */}
                    <h4 className={`
                      text-xs sm:text-sm font-semibold mb-2 text-center transition-colors
                      ${isCurrent ? 'text-white' : 'text-gray-400'}
                    `}>
                      STEP {index + 1} · {step.name}
                    </h4>
                    
                    {/* Step Description */}
                    <p className={`
                      text-[10px] sm:text-xs text-center leading-relaxed max-w-[140px] transition-colors
                      ${isCurrent ? 'text-gray-300' : 'text-gray-500'}
                    `}>
                      {step.description}
                    </p>

                    {/* Active Button */}
                    {isCurrent && (
                      <button className="mt-3 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition-colors">
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
