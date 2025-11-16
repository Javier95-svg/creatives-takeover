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

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "upcoming";
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Modern Timeline Card with Glass Effect */}
      <div className="group relative overflow-hidden glass-card-silver hover-lift transition-all duration-700 hover:shadow-2xl hover:shadow-primary/20 border border-primary/10 rounded-2xl">
        {/* Dynamic Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        {/* Floating Elements */}
        <div className="absolute top-4 right-4 w-3 h-3 bg-primary/30 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-500" />
        <div className="absolute bottom-6 left-6 w-2 h-2 bg-secondary/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-500" style={{ animationDelay: '0.3s' }} />
        
        <div className="relative z-10 p-8">
          {/* Progress Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 group-hover:scale-110 transition-all duration-500 shadow-lg">
                <CheckCircle className="w-6 h-6 text-primary group-hover:animate-pulse" />
                <div className="absolute inset-0 rounded-xl bg-primary/20 opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-500" />
              </div>
              <h3 className="text-2xl font-bold creatives-font group-hover:text-primary transition-colors duration-500">
                {isComplete ? "🎉 Plan Complete!" : `Progress: Step ${currentStep + 1} of ${totalSteps}`}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              {isComplete 
                ? "✨ Your AI-powered comprehensive business plan is ready with industry insights and smart recommendations" 
                : `Currently working on: ${displayTitles[currentStep]}`
              }
            </p>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative px-4">
            {/* Progress Line */}
            <div className="absolute top-6 left-8 right-8 h-1 bg-muted-foreground/20 rounded-full" />
            <div 
              className="absolute top-6 left-8 h-1 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out shadow-sm shadow-primary/30"
              style={{ 
                width: totalSteps > 1 ? `calc(${(currentStep / (totalSteps - 1)) * 100}% - 1rem)` : '0%'
              }}
            />

            {/* Steps */}
            <div className="flex justify-between items-center relative">
              {displayTitles.map((title, index) => {
                const status = getStepStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                
                return (
                  <div 
                    key={index}
                    className={`flex flex-col items-center group/step transition-all duration-300 ${
                      onStepClick ? 'cursor-pointer hover:scale-105' : ''
                    }`}
                    onClick={() => onStepClick?.(index)}
                    style={{ width: `${100 / totalSteps}%` }}
                  >
                    {/* Step Circle */}
                    <div className={`
                      relative z-10 w-12 h-12 rounded-full border-2 transition-all duration-500 shadow-lg
                      flex items-center justify-center
                      ${isCompleted 
                        ? 'bg-primary border-primary shadow-primary/30' 
                        : isCurrent 
                        ? 'bg-background border-primary border-4 shadow-primary/20 animate-pulse' 
                        : 'bg-background border-muted-foreground/30'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-primary-foreground" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/50" />
                      )}
                      
                      {/* Glowing Ring for Current Step */}
                      {isCurrent && (
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-primary animate-ping opacity-75" />
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="mt-4 text-center max-w-[140px] group-hover/step:transform group-hover/step:translate-y-1 transition-transform duration-300">
                      <p className={`text-xs font-semibold transition-colors duration-300 ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Step {index + 1}
                      </p>
                      
                      {/* Status Badge */}
                      {(isCompleted || isCurrent) && (
                        <div className="mt-2">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                              ✓ Done
                            </span>
                          )}
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium animate-pulse">
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