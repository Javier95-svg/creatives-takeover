import { CheckCircle, Circle, Target, Users, AlertCircle, Sparkles, Share2, DollarSign, Rocket } from "lucide-react";

interface InteractiveProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onStepClick?: (step: number) => void;
  isComplete?: boolean;
}

// Step configuration with icons and descriptions
const stepConfig = [
  {
    icon: Target,
    title: "Business Concept",
    description: "Define your business concept and vision"
  },
  {
    icon: Users,
    title: "Target Customer",
    description: "Identify your target audience and market"
  },
  {
    icon: AlertCircle,
    title: "Validation Plan",
    description: "Understand the core problem you're solving"
  },
  {
    icon: Sparkles,
    title: "MVP Design",
    description: "Design your unique solution"
  },
  {
    icon: Share2,
    title: "Launch Strategy",
    description: "Choose your marketing and distribution channels"
  },
  {
    icon: DollarSign,
    title: "Pricing Model",
    description: "Set your pricing strategy and revenue model"
  },
  {
    icon: Rocket,
    title: "Success Metrics",
    description: "Define your launch goals and timeline"
  }
];

const InteractiveProgress = ({ 
  currentStep, 
  totalSteps, 
  stepTitles, 
  onStepClick,
  isComplete = false 
}: InteractiveProgressProps) => {
  const displayTitles = stepTitles.length > 0 ? stepTitles : stepConfig.map(s => s.title);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "upcoming";
  };

  const getStepConfig = (index: number) => {
    const title = displayTitles[index] || stepConfig[index]?.title || `Step ${index + 1}`;
    // Remove any emojis from title
    const cleanTitle = title.replace(/[\u{1F300}-\u{1F9FF}]/u, "").trim();
    
    return {
      icon: stepConfig[index]?.icon || Target,
      title: cleanTitle || stepConfig[index]?.title || `Step ${index + 1}`,
      description: stepConfig[index]?.description || ""
    };
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Professional Timeline Container */}
      <div className="relative bg-card border border-border/50 rounded-xl shadow-sm">
        <div className="p-6 sm:p-8">
          {/* Horizontal Timeline */}
          <div className="relative">
            {/* Connecting Line Background */}
            <div className="absolute top-8 left-12 right-12 h-0.5 bg-muted rounded-full" />
            
            {/* Progress Line */}
            <div 
              className="absolute top-8 left-12 h-0.5 bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: totalSteps > 1 ? `calc(${(currentStep / (totalSteps - 1)) * 100}% - 3rem)` : '0%'
              }}
            />

            {/* Step Indicators */}
            <div className="flex justify-between items-start relative">
              {displayTitles.map((title, index) => {
                const status = getStepStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                const config = getStepConfig(index);
                const Icon = config.icon;
                
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
                      relative z-10 w-16 h-16 rounded-full border-2 transition-all duration-300
                      flex items-center justify-center mb-4
                      ${isCompleted 
                        ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20' 
                        : isCurrent 
                        ? 'bg-background border-primary border-2 shadow-lg shadow-primary/30' 
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-7 h-7" />
                      ) : (
                        <Icon className={`w-7 h-7 ${isCurrent ? 'text-primary' : ''}`} />
                      )}
                      
                      {/* Current Step Pulse Effect */}
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
                      )}
                    </div>

                    {/* Step Title */}
                    <h4 className={`
                      text-sm font-semibold mb-1.5 text-center transition-colors
                      ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                    `}>
                      {config.title}
                    </h4>
                    
                    {/* Step Description */}
                    <p className={`
                      text-xs text-center leading-relaxed max-w-[120px] transition-colors
                      ${isCurrent ? 'text-foreground/80' : 'text-muted-foreground'}
                    `}>
                      {config.description}
                    </p>
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
