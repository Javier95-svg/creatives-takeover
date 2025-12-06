import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: () => void; // Optional action to perform
}

interface FeatureTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  featureName: string;
}

/**
 * Interactive feature tour component for onboarding
 */
export const FeatureTour: React.FC<FeatureTourProps> = ({
  steps,
  onComplete,
  onSkip,
  featureName,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has completed this tour
    const tourKey = `tour_${featureName}_completed`;
    const hasCompleted = localStorage.getItem(tourKey);
    
    if (!hasCompleted && steps.length > 0) {
      setIsOpen(true);
    }
  }, [featureName, steps.length]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const tourKey = `tour_${featureName}_completed`;
    localStorage.setItem(tourKey, "true");
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    const tourKey = `tour_${featureName}_completed`;
    localStorage.setItem(tourKey, "skipped");
    setIsOpen(false);
    onSkip?.();
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!isOpen || !currentStepData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-md"
        aria-describedby="tour-description"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <DialogTitle>{currentStepData.title}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-6 w-6"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription id="tour-description" className="pt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-2" aria-label={`Tour progress: ${currentStep + 1} of ${steps.length}`} />
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  aria-label="Previous step"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
              <Button
                onClick={handleNext}
                size="sm"
                aria-label={currentStep === steps.length - 1 ? "Complete tour" : "Next step"}
              >
                {currentStep === steps.length - 1 ? "Got it!" : "Next"}
                {currentStep < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

