import { CheckCircle, Circle } from "lucide-react";

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
  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "upcoming";
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      {/* Progress Header */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          {isComplete ? "Plan Complete!" : `Step ${currentStep + 1} of ${totalSteps}`}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isComplete 
            ? "Your business plan is ready to launch" 
            : stepTitles[currentStep]
          }
        </p>
      </div>

      {/* Horizontal Timeline */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted-foreground/20" />
        <div 
          className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-700 ease-out"
          style={{ 
            width: totalSteps > 1 ? `${(currentStep / (totalSteps - 1)) * 100}%` : '0%'
          }}
        />

        {/* Steps */}
        <div className="flex justify-between items-center relative">
          {stepTitles.map((title, index) => {
            const status = getStepStatus(index);
            const isCompleted = status === "completed";
            const isCurrent = status === "current";
            
            return (
              <div 
                key={index}
                className={`flex flex-col items-center group ${
                  onStepClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onStepClick?.(index)}
                style={{ width: `${100 / totalSteps}%` }}
              >
                {/* Step Circle */}
                <div className={`
                  relative z-10 w-12 h-12 rounded-full border-2 transition-all duration-300
                  flex items-center justify-center
                  ${isCompleted 
                    ? 'bg-primary border-primary' 
                    : isCurrent 
                    ? 'bg-background border-primary border-4' 
                    : 'bg-background border-muted-foreground/30'
                  }
                  ${onStepClick ? 'group-hover:scale-110' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-primary-foreground" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 bg-primary rounded-full" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-4 text-center max-w-[120px]">
                  <p className={`text-xs font-medium transition-colors duration-300 ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {title}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Step {index + 1}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="mt-8 text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">
            🎉 All steps completed! Your business plan is ready.
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveProgress;