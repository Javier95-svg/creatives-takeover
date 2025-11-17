import { CheckCircle, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface InteractiveProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onStepClick?: (step: number) => void;
  isComplete?: boolean;
}

// Step configuration with emojis and descriptions
const stepConfig = [
  {
    emoji: "🎯",
    title: "Business Concept",
    description: "Define your business concept and vision"
  },
  {
    emoji: "🔍",
    title: "Target Customer",
    description: "Identify your target audience and market"
  },
  {
    emoji: "💡",
    title: "Validation Plan",
    description: "Understand the core problem you're solving"
  },
  {
    emoji: "✨",
    title: "MVP Design",
    description: "Design your unique solution"
  },
  {
    emoji: "📢",
    title: "Launch Strategy",
    description: "Choose your marketing and distribution channels"
  },
  {
    emoji: "💰",
    title: "Pricing Model",
    description: "Set your pricing strategy and revenue model"
  },
  {
    emoji: "🚀",
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
  const progressPercentage = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "upcoming";
  };

  const getStepConfig = (index: number) => {
    // Try to extract emoji from title if it exists
    const title = displayTitles[index] || stepConfig[index]?.title || `Step ${index + 1}`;
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(title);
    const emoji = hasEmoji ? title.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] : stepConfig[index]?.emoji || "•";
    const cleanTitle = title.replace(/[\u{1F300}-\u{1F9FF}]/u, "").trim();
    
    return {
      emoji: emoji || stepConfig[index]?.emoji || "•",
      title: cleanTitle || stepConfig[index]?.title || `Step ${index + 1}`,
      description: stepConfig[index]?.description || ""
    };
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Modern Timeline Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 border border-border/50 rounded-2xl shadow-lg backdrop-blur-sm">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,rgb(0,0,0)_1px,transparent_0)] bg-[length:20px_20px]" />
        
        <div className="relative p-6 sm:p-8">
          {/* Progress Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {isComplete ? "🎉 Plan Complete!" : `Step ${currentStep + 1} of ${totalSteps}`}
              </h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              {isComplete 
                ? "Your AI-powered business plan is ready with industry insights and recommendations" 
                : `Currently working on: ${getStepConfig(currentStep).title}`
              }
            </p>
            
            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <Progress value={progressPercentage} className="h-2.5 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">
                {Math.round(progressPercentage)}% Complete
              </p>
            </div>
          </div>

          {/* Modern Horizontal Timeline */}
          <div className="relative px-4 sm:px-6">
            {/* Connecting Line Background */}
            <div className="absolute top-16 left-8 right-8 h-1 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full" />
            
            {/* Progress Line */}
            <div 
              className="absolute top-16 left-8 h-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-full transition-all duration-700 ease-out shadow-lg shadow-primary/30"
              style={{ 
                width: totalSteps > 1 ? `calc(${(currentStep / (totalSteps - 1)) * 100}% - 2rem)` : '0%'
              }}
            />

            {/* Step Cards */}
            <div className="flex justify-between items-start relative gap-2">
              {displayTitles.map((title, index) => {
                const status = getStepStatus(index);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";
                const config = getStepConfig(index);
                
                return (
                  <div 
                    key={index}
                    className={`flex flex-col items-center transition-all duration-300 flex-1 ${
                      onStepClick ? 'cursor-pointer hover:scale-105' : ''
                    }`}
                    onClick={() => onStepClick?.(index)}
                  >
                    {/* Step Card */}
                    <div className={`
                      relative z-10 w-full max-w-[140px] sm:max-w-[160px] rounded-xl p-4 sm:p-5
                      transition-all duration-300 border-2
                      ${isCompleted 
                        ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-md shadow-primary/10' 
                        : isCurrent 
                        ? 'bg-gradient-to-br from-accent/15 to-accent/5 border-accent/40 shadow-lg shadow-accent/20 scale-105' 
                        : 'bg-card/50 border-border/30 shadow-sm'
                      }
                    `}>
                      {/* Emoji */}
                      <div className={`
                        text-4xl sm:text-5xl mb-3 text-center transition-all duration-300
                        ${isCompleted ? 'scale-110' : isCurrent ? 'scale-110 animate-pulse' : 'opacity-60'}
                      `}>
                        {config.emoji}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="absolute top-2 right-2">
                        {isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-4 h-4 text-primary-foreground" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-sm animate-pulse">
                            <div className="w-2.5 h-2.5 bg-accent-foreground rounded-full" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                            <Circle className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Step Title */}
                      <h4 className={`
                        text-sm sm:text-base font-semibold mb-2 text-center transition-colors
                        ${isCurrent ? 'text-accent' : isCompleted ? 'text-primary' : 'text-foreground/70'}
                      `}>
                        {config.title}
                      </h4>
                      
                      {/* Step Description */}
                      <p className={`
                        text-xs text-center leading-relaxed transition-colors
                        ${isCurrent ? 'text-accent-foreground/80' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/70'}
                      `}>
                        {config.description}
                      </p>
                      
                      {/* Step Number */}
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-xs text-center text-muted-foreground font-medium">
                          Step {index + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completion Message */}
          {isComplete && (
            <div className="mt-10 p-6 sm:p-8 bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 border border-primary/20 rounded-xl text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-primary" />
                <p className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  All Steps Completed! 🎉
                </p>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
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
