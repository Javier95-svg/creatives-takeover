import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Sparkles, Trophy, Rocket, Star } from "lucide-react";

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
  const [showCelebration, setShowCelebration] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  // Trigger celebration when step changes or completes
  useEffect(() => {
    if (currentStep > 0 || isComplete) {
      setShowCelebration(true);
      setJustCompleted(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
        setJustCompleted(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isComplete]);

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="w-6 h-6 text-primary" />;
    } else if (stepIndex === currentStep) {
      return (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-pulse">
          <div className="w-3 h-3 rounded-full bg-primary-foreground" />
        </div>
      );
    } else {
      return (
        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        </div>
      );
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "current";
    return "upcoming";
  };

  const getCelebrationIcon = () => {
    if (isComplete) return <Trophy className="w-8 h-8" />;
    if (isLastStep) return <Rocket className="w-8 h-8" />;
    return <Star className="w-8 h-8" />;
  };

  const getCelebrationMessage = () => {
    if (isComplete) return "🎉 Launch Report Generated!";
    if (isLastStep) return "🚀 Almost There!";
    return `✨ Step ${currentStep + 1} Complete!`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-scale-in">
            <div className="bg-primary/90 text-primary-foreground rounded-full p-6 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="animate-bounce text-yellow-300">
                  {getCelebrationIcon()}
                </div>
                <span className="text-xl font-bold">{getCelebrationMessage()}</span>
              </div>
            </div>
          </div>
          
          {/* Confetti effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <Sparkles className="w-4 h-4 text-yellow-400 opacity-70" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">
          {isComplete ? "Your Business Plan is Ready!" : `Step ${currentStep + 1} of ${totalSteps}`}
        </h2>
        <p className="text-muted-foreground">
          {isComplete 
            ? "🎯 Time to turn your vision into reality!" 
            : `Current: ${stepTitles[currentStep]}`
          }
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm font-bold text-primary">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <Progress 
          value={progressPercentage} 
          className="h-3 transition-all duration-700 ease-out"
        />
      </div>

      {/* Step Timeline */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
        <div 
          className="absolute left-6 top-0 w-0.5 bg-primary transition-all duration-700 ease-out"
          style={{ height: `${(currentStep / (totalSteps - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="space-y-6">
          {stepTitles.map((title, index) => (
            <div 
              key={index}
              className={`relative flex items-center gap-4 cursor-pointer group transition-all duration-300 ${
                onStepClick ? 'hover:scale-105' : ''
              }`}
              onClick={() => onStepClick?.(index)}
            >
              {/* Step Icon */}
              <div className="relative z-10 bg-background">
                {getStepIcon(index)}
              </div>

              {/* Step Content */}
              <div className={`flex-1 transition-all duration-300 ${
                getStepStatus(index) === 'current' 
                  ? 'scale-105 font-semibold text-primary' 
                  : getStepStatus(index) === 'completed'
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/60'
              }`}>
                <h3 className="font-medium">
                  {title}
                  {getStepStatus(index) === 'completed' && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      ✓ Done
                    </span>
                  )}
                  {getStepStatus(index) === 'current' && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">
                      In Progress
                    </span>
                  )}
                </h3>
                
                {/* Step Number */}
                <p className="text-sm opacity-70">
                  Step {index + 1}
                </p>
              </div>

              {/* Completion Animation */}
              {getStepStatus(index) === 'completed' && justCompleted && index === currentStep - 1 && (
                <div className="absolute -right-2 -top-2 animate-bounce">
                  <div className="bg-primary text-primary-foreground rounded-full p-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg text-center">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-primary mb-2">
            Congratulations! 🎉
          </h3>
          <p className="text-muted-foreground">
            You've completed all steps and your personalized Launch Report is ready.
            Time to make your business dream a reality!
          </p>
        </div>
      )}

      {/* Motivational Footer */}
      {!isComplete && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-full">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {totalSteps - currentStep - 1 === 0 
                ? "One more step to your business plan!" 
                : `${totalSteps - currentStep - 1} steps remaining`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveProgress;