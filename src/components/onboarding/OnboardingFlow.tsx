import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingStep1GoalSelection, OnboardingGoal } from "./OnboardingStep1GoalSelection";
import { OnboardingStep2QuickWins } from "./OnboardingStep2QuickWins";
import { OnboardingStep3FirstTask } from "./OnboardingStep3FirstTask";
import { OnboardingStep4PlatformTour } from "./OnboardingStep4PlatformTour";
import { captureEvent } from "@/lib/analytics";

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4;

export const OnboardingFlow = ({ open, onComplete }: OnboardingFlowProps) => {
  const { user } = useAuth();
  const { 
    onboardingProgress, 
    updateOnboardingGoal, 
    updateOnboardingStatus,
    completeOnboardingStep,
    finishOnboarding,
    getOnboardingProgress,
    shouldShowOnboarding
  } = useUser();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [selectedGoal, setSelectedGoal] = useState<OnboardingGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stepStartTime, setStepStartTime] = useState<Record<number, number>>({});

  // Load progress on mount and resume from where user left off (works for anonymous and authenticated)
  useEffect(() => {
    const loadProgress = async () => {
      setIsLoading(true);
      try {
        // Get progress from localStorage (for anonymous) or DB (for authenticated)
        const progress = await getOnboardingProgress();
        
        if (progress) {
          // Resume from last completed step + 1
          if (progress.status === 'IN_PROGRESS' && progress.completedStep !== null) {
            const nextStep = (progress.completedStep + 1) as OnboardingStep;
            setCurrentStep(nextStep > 4 ? 4 : nextStep);
          } else if (progress.status === 'NOT_STARTED') {
            setCurrentStep(1);
          } else if (progress.status === 'COMPLETED') {
            // Should not show, but handle gracefully
            onComplete();
            return;
          }
          
          // Set selected goal if exists
          if (progress.goal) {
            setSelectedGoal(progress.goal as OnboardingGoal);
          }
        } else {
          // No progress found, start from Step 1 (first visit)
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
        // On error, start from Step 1
        setCurrentStep(1);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadProgress();
    }
  }, [open, getOnboardingProgress, onComplete]);

  // Track step start time
  useEffect(() => {
    if (open && currentStep) {
      setStepStartTime(prev => ({
        ...prev,
        [currentStep]: Date.now()
      }));

      // Track step viewed in PostHog (with anonymous_id if no user)
      captureEvent('onboarding_step_viewed', {
        step: currentStep,
        goal: selectedGoal,
        user_authenticated: !!user,
        user_id: user?.id || null,
      });
    }
  }, [currentStep, open, selectedGoal]);

  // Track onboarding started
  useEffect(() => {
    if (open && currentStep === 1) {
      // Check localStorage if onboardingProgress is not loaded yet
      const stored = localStorage.getItem('ct_onboarding_progress');
      let currentStatus = onboardingProgress?.status;
      
      if (!currentStatus && stored) {
        try {
          const progress = JSON.parse(stored);
          currentStatus = progress?.status;
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Start onboarding if not started yet
      if (!currentStatus || currentStatus === 'NOT_STARTED') {
        updateOnboardingStatus('IN_PROGRESS');
        captureEvent('onboarding_started', {
          user_authenticated: !!user,
        });
      }
    }
  }, [open, currentStep, onboardingProgress, updateOnboardingStatus, user]);

  const handleGoalSelect = async (goal: OnboardingGoal) => {
    setSelectedGoal(goal);
    await updateOnboardingGoal(goal);
    await completeOnboardingStep(1);
    
    // Track step completion
    const timeSpent = stepStartTime[1] ? Math.round((Date.now() - stepStartTime[1]) / 1000) : 0;
    captureEvent('onboarding_step_completed', {
      step: 1,
      goal,
      time_spent_seconds: timeSpent,
      user_authenticated: !!user,
      user_id: user?.id || null,
    });

    // Move to next step after a brief delay
    setTimeout(() => {
      setCurrentStep(2);
    }, 300);
  };

  const handleStep2Continue = async () => {
    await completeOnboardingStep(2);
    
    // Track step completion
    const timeSpent = stepStartTime[2] ? Math.round((Date.now() - stepStartTime[2]) / 1000) : 0;
    captureEvent('onboarding_step_completed', {
      step: 2,
      goal: selectedGoal,
      time_spent_seconds: timeSpent,
      user_authenticated: !!user,
      user_id: user?.id || null,
    });

    setTimeout(() => {
      setCurrentStep(3);
    }, 300);
  };

  const handleStep3Continue = async () => {
    await completeOnboardingStep(3);
    
    // Track step completion
    const timeSpent = stepStartTime[3] ? Math.round((Date.now() - stepStartTime[3]) / 1000) : 0;
    captureEvent('onboarding_step_completed', {
      step: 3,
      goal: selectedGoal,
      time_spent_seconds: timeSpent,
      user_authenticated: !!user,
      user_id: user?.id || null,
    });

    setTimeout(() => {
      setCurrentStep(4);
    }, 300);
  };

  const handleStep4Complete = async () => {
    await finishOnboarding();
    
    // Track completion
    const timeSpent = stepStartTime[4] ? Math.round((Date.now() - stepStartTime[4]) / 1000) : 0;
    captureEvent('onboarding_completed', {
      goal: selectedGoal,
      time_spent_seconds: timeSpent,
      skipped_tour: false,
      user_authenticated: !!user,
      user_id: user?.id || null,
    });

    onComplete();
  };

  const handleStep4Skip = async () => {
    await finishOnboarding();
    
    // Track completion with skip
    const timeSpent = stepStartTime[4] ? Math.round((Date.now() - stepStartTime[4]) / 1000) : 0;
    captureEvent('onboarding_completed', {
      goal: selectedGoal,
      time_spent_seconds: timeSpent,
      skipped_tour: true,
      user_authenticated: !!user,
      user_id: user?.id || null,
    });

    captureEvent('onboarding_skipped_tour', {
      goal: selectedGoal,
      user_authenticated: !!user,
      user_id: user?.id || null,
    });

    onComplete();
  };

  if (isLoading || !open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      {/* Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-[100]">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <OnboardingStep1GoalSelection
          onGoalSelect={handleGoalSelect}
          selectedGoal={selectedGoal}
        />
      )}

      {currentStep === 2 && (
        <OnboardingStep2QuickWins onContinue={handleStep2Continue} />
      )}

      {currentStep === 3 && (
        <OnboardingStep3FirstTask
          selectedGoal={selectedGoal}
          onContinue={handleStep3Continue}
        />
      )}

      {currentStep === 4 && (
        <OnboardingStep4PlatformTour
          onComplete={handleStep4Complete}
          onSkip={handleStep4Skip}
        />
      )}
    </Dialog>
  );
};

