import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

const TOUR_STORAGE_KEY = "bizmap_tour_completed";

interface OnboardingTourProps {
  forceStart?: boolean;
}

export const OnboardingTour = ({ forceStart = false }: OnboardingTourProps) => {
  const [runTour, setRunTour] = useState(false);
  const [showTourButton, setShowTourButton] = useState(true);

  // Tour steps
  const steps: Step[] = [
    {
      target: "#bizmap-chat-input",
      content: (
        <div className="space-y-2">
          <p className="text-base font-medium">👋 Start here!</p>
          <p className="text-sm text-muted-foreground">
            Describe your business idea in your own words - no jargon needed. 
            Just tell us what you're planning to create!
          </p>
        </div>
      ),
      disableBeacon: true,
      placement: "top",
    },
    {
      target: ".progress-tracker",
      content: (
        <div className="space-y-2">
          <p className="text-base font-medium">📊 Track your journey</p>
          <p className="text-sm text-muted-foreground">
            Follow your progress through 7 key business areas. Each step builds 
            on the last to create your complete business plan.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: ".quick-reply-section",
      content: (
        <div className="space-y-2">
          <p className="text-base font-medium">⚡ Quick replies</p>
          <p className="text-sm text-muted-foreground">
            Use these handy buttons to answer common questions quickly. 
            Or type your own custom response!
          </p>
        </div>
      ),
      placement: "top",
      spotlightClicks: false,
    },
    {
      target: ".auto-save-indicator",
      content: (
        <div className="space-y-2">
          <p className="text-base font-medium">💾 Never lose progress</p>
          <p className="text-sm text-muted-foreground">
            Your work is automatically saved every 30 seconds. Come back anytime 
            and pick up right where you left off!
          </p>
        </div>
      ),
      placement: "top",
    },
  ];

  // Check if tour has been completed
  useEffect(() => {
    const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY);
    
    if (forceStart) {
      setRunTour(true);
    } else if (!hasCompletedTour) {
      // Auto-start tour on first visit after a short delay
      setTimeout(() => setRunTour(true), 1000);
    }
  }, [forceStart]);

  // Handle tour callback
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      
      // Mark tour as completed
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      
      // Fire confetti on completion
      if (status === STATUS.FINISHED) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00d4ff", "#8b5fff", "#00ffcc"],
        });
      }
    }
  };

  const handleStartTour = () => {
    setRunTour(true);
  };

  return (
    <>
      {/* Tour Button */}
      {showTourButton && !runTour && (
        <Button
          onClick={handleStartTour}
          variant="outline"
          size="sm"
          className="fixed top-20 right-4 z-50 gap-2 shadow-lg hover:shadow-xl transition-all animate-fade-in bg-background/80 backdrop-blur-sm border-primary/30 hover:border-primary/50"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Take Tour</span>
          <span className="sm:hidden">?</span>
        </Button>
      )}

      {/* Joyride Tour */}
      <Joyride
        steps={steps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: "hsl(195 100% 50%)", // Primary color
            textColor: "hsl(210 40% 98%)", // Foreground
            backgroundColor: "hsl(240 4% 8%)", // Card background
            arrowColor: "hsl(240 4% 8%)",
            overlayColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: 12,
            padding: 20,
          },
          tooltipContainer: {
            textAlign: "left",
          },
          buttonNext: {
            backgroundColor: "hsl(195 100% 50%)",
            color: "hsl(240 4% 4%)",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 600,
          },
          buttonBack: {
            color: "hsl(215.4 16.3% 65%)",
            marginRight: 8,
          },
          buttonSkip: {
            color: "hsl(215.4 16.3% 65%)",
          },
          spotlight: {
            borderRadius: 8,
          },
        }}
        locale={{
          back: "Back",
          close: "Close",
          last: "Finish",
          next: "Next",
          skip: "Skip Tour",
        }}
        floaterProps={{
          disableAnimation: false,
        }}
      />
    </>
  );
};
