import { Check, Lock, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ProgressTrackerProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

export const ProgressTracker = ({
  currentStep,
  totalSteps,
  completedSteps,
  onStepClick,
}: ProgressTrackerProps) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const getStepStatus = (step: number): 'completed' | 'current' | 'locked' => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    return 'locked';
  };

  const isStepClickable = (step: number): boolean => {
    return completedSteps.includes(step);
  };

  const handleStepClick = (step: number) => {
    if (isStepClickable(step) && onStepClick) {
      onStepClick(step);
    }
  };

  return (
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const status = getStepStatus(index);
          const isClickable = isStepClickable(index);
          const isHovered = hoveredStep === index;

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step Circle */}
              <div
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  status === 'completed' && "bg-green-500 border-green-500 text-white",
                  status === 'current' && "bg-primary border-primary text-primary-foreground",
                  status === 'locked' && "bg-muted border-border text-muted-foreground",
                  isClickable && "cursor-pointer hover:scale-110 hover:shadow-lg",
                  !isClickable && "cursor-not-allowed",
                  isHovered && isClickable && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => handleStepClick(index)}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {status === 'completed' && (
                  <>
                    <Check className="h-5 w-5" />
                    {isHovered && (
                      <div className="absolute -top-8 bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        Edit step {index + 1}
                        <Pencil className="h-3 w-3 inline ml-1" />
                      </div>
                    )}
                  </>
                )}
                {status === 'current' && <span className="font-bold">{index + 1}</span>}
                {status === 'locked' && <Lock className="h-4 w-4" />}
              </div>

              {/* Connector Line */}
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 transition-all duration-300",
                    completedSteps.includes(index) ? "bg-green-500" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Labels */}
      <div className="flex items-center justify-between max-w-3xl mx-auto mt-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const status = getStepStatus(index);
          return (
            <div
              key={index}
              className={cn(
                "flex-1 text-center text-xs transition-colors",
                status === 'completed' && "text-green-600 dark:text-green-400 font-medium",
                status === 'current' && "text-primary font-bold",
                status === 'locked' && "text-muted-foreground"
              )}
            >
              Step {index + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
};
