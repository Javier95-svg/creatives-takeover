import { CheckCircle, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

  const displayTitles = stepTitles.length > 0 ? stepTitles : enhancedStepTitles;
  const progressPercentage = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "upcoming";
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Clean Timeline Card */}
      <div className="relative overflow-hidden bg-card border border-border rounded-xl shadow-sm">
        <div className="p-6 sm:p-8">
          {/* Progress Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h3 className="text-xl sm:text-2xl font-bold">
                {isComplete ? "🎉 Plan Complete!" : `Step ${currentStep + 1} of ${totalSteps}`}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isComplete 
                ? "Your AI-powered business plan is ready with industry insights and recommendations" 
                : `Currently working on: ${displayTitles[currentStep]}`
              }
            </p>
            
            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <Progress value={progressPercentage} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {Math.round(progressPercentage)}% Complete
              </p>
            </div>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative px-2 sm:px-4">
            {/* Progress Line */}
            <div className="absolute top-6 left-4 right-4 h-0.5 bg-muted rounded-full" />
            <div 
              className="absolute top-6 left-4 h-0.5 bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: totalSteps > 1 ? `${(currentStep / (totalSteps - 1)) * 100}%` : '0%'
              }}
            />

            {/* Steps */}
            <div className="flex justify-between items-start relative">
              {displayTitles.map((title, index) => {
                const status = getStepStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                
                return (
                  <div 
                    key={index}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      onStepClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onStepClick?.(index)}
                    style={{ width: `${100 / totalSteps}%` }}
                  >
                    {/* Step Circle */}
                    <div className={`
                      relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all duration-300
                      flex items-center justify-center
                      ${isCompleted 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : isCurrent 
                        ? 'bg-background border-primary border-2 shadow-md shadow-primary/20' 
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : isCurrent ? (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full" />
                      ) : (
                        <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="mt-3 text-center max-w-[120px] sm:max-w-[140px]">
                      <p className={`text-xs font-medium transition-colors ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
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
            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <p className="text-lg font-semibold text-primary">
                  All Steps Completed!
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your AI-enhanced business plan with smart insights and personalized recommendations is ready to launch
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveProgress;
