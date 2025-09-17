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
    <div className="w-full max-w-6xl mx-auto">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-scale-in">
            <div className="glass-card p-8 shadow-2xl backdrop-blur-sm border border-primary/20">
              <div className="flex items-center gap-4">
                <div className="animate-bounce text-primary">
                  {getCelebrationIcon()}
                </div>
                <span className="text-2xl font-bold silver-gradient-text">{getCelebrationMessage()}</span>
              </div>
            </div>
          </div>
          
          {/* Enhanced Confetti effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              >
                <Sparkles className="w-5 h-5 text-primary opacity-80" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modern Progress Header */}
      <div className="text-center mb-12">
        <div className="relative">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 creatives-font" style={{ backgroundColor: 'red', color: 'white', padding: '20px' }}>
          ⚡ ENHANCED TIMELINE - CHANGES APPLIED! ⚡
          {isComplete ? (
            <span className="takeover-gradient">Your Business Plan is Ready!</span>
          ) : (
            <span className="silver-gradient-text">Step {currentStep + 1} of {totalSteps}</span>
          )}
        </h2>
          <div className="absolute -top-2 -right-2 animate-pulse">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
          </div>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {isComplete 
            ? "🎯 Time to turn your vision into reality with your personalized roadmap!" 
            : `Currently working on: ${stepTitles[currentStep]}`
          }
        </p>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-12 p-6 glass-card-silver rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold silver-gradient-text">Journey Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold takeover-gradient">
              {Math.round(progressPercentage)}%
            </span>
            <Rocket className="w-5 h-5 text-primary animate-pulse" />
          </div>
        </div>
        <div className="relative">
          <Progress 
            value={progressPercentage} 
            className="h-4 transition-all duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine pointer-events-none" />
        </div>
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>Start</span>
          <span className="font-medium">Launch Ready</span>
        </div>
      </div>

      {/* Modern Step Timeline */}
      <div className="relative p-8 glass-card rounded-2xl">
        {/* Glowing Progress Line */}
        <div className="absolute left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />
        <div 
          className="absolute left-12 top-8 w-1 bg-gradient-to-b from-primary via-primary to-primary/50 transition-all duration-1000 ease-out shadow-lg shadow-primary/20"
          style={{ height: `${Math.max(0, (currentStep / Math.max(1, totalSteps - 1)) * 85)}%` }}
        />

        {/* Enhanced Steps */}
        <div className="space-y-8">
          {stepTitles.map((title, index) => {
            const status = getStepStatus(index);
            const isActive = status === 'current';
            const isCompleted = status === 'completed';
            
            return (
              <div 
                key={index}
                className={`relative flex items-center gap-6 group transition-all duration-500 ${
                  onStepClick ? 'cursor-pointer hover:scale-105' : ''
                } ${isActive ? 'scale-105' : ''}`}
                onClick={() => onStepClick?.(index)}
              >
                {/* Enhanced Step Icon */}
                <div className="relative z-10">
                  <div className={`relative w-12 h-12 rounded-full border-2 transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-primary border-primary shadow-lg shadow-primary/30' 
                      : isActive 
                      ? 'bg-primary/10 border-primary animate-pulse shadow-lg shadow-primary/20' 
                      : 'bg-background border-muted-foreground/30'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-8 h-8 text-primary-foreground absolute inset-1" />
                    ) : isActive ? (
                      <div className="absolute inset-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <div className="absolute inset-4 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  
                  {/* Glowing Ring for Active Step */}
                  {isActive && (
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-primary animate-ping opacity-75" />
                  )}
                </div>

                {/* Enhanced Step Content */}
                <div className={`flex-1 p-4 rounded-xl transition-all duration-500 ${
                  isActive 
                    ? 'bg-primary/5 border border-primary/20 shadow-lg' 
                    : isCompleted
                    ? 'bg-background/50'
                    : 'bg-transparent'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                        isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Step {index + 1} of {totalSteps}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <div>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium animate-pulse">
                          <div className="w-2 h-2 bg-primary-foreground rounded-full animate-ping" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Completion Celebration */}
                {isCompleted && justCompleted && index === currentStep - 1 && (
                  <div className="absolute -top-2 -right-2 animate-bounce z-20">
                    <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                      <Star className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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