import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GTMProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    key: string;
    title: string;
  }>;
}

export const GTMProgress = ({ currentStep, totalSteps, steps }: GTMProgressProps) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GTMProgress.tsx:13',message:'GTMProgress render',data:{currentStep,totalSteps,stepsLength:steps?.length,stepsExists:!!steps,isValidStep:currentStep>=0&&currentStep<totalSteps,stepsIsArray:Array.isArray(steps)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GTMProgress.tsx:16',message:'GTMProgress - after percentage calc',data:{progressPercentage,willRenderSteps:steps?.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  return (
    <div className="w-full space-y-4">
      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Step {currentStep + 1} of {totalSteps}</span>
        <span>{Math.round(progressPercentage)}% Complete</span>
      </div>

      {/* Step List */}
      <div className="space-y-2">
        {steps && Array.isArray(steps) && steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div
              key={step?.key || `step-${index}`}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md transition-colors",
                isCurrent && "bg-primary/10 border border-primary/20",
                isCompleted && "opacity-60"
              )}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className={cn(
                    "w-5 h-5",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )} />
                )}
              </div>
              <div className="flex-1">
                <div className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-primary",
                  isCompleted && "line-through"
                )}>
                  {index + 1}. {step?.title || `Step ${index + 1}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

