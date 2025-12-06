import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Lock, TrendingUp, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useConversionTracking } from "@/hooks/useConversionTracking";

interface WizardConversionPromptProps {
  step: number;
  triggerStep: number;
  variant: 'inline-banner' | 'modal' | 'completion-gate';
  onDismiss: () => void;
  onSignUp: () => void;
  show: boolean;
  context?: {
    progress?: number; // Progress percentage (0-100)
    timeSpent?: number; // Time spent in seconds
    engagementScore?: number; // Engagement score (0-100)
  };
}

export const WizardConversionPrompt = ({
  step,
  triggerStep,
  variant,
  onDismiss,
  onSignUp,
  show,
  context
}: WizardConversionPromptProps) => {
  const navigate = useNavigate();
  const { trackTriggerView, trackEngagement, trackDismissal, trackSignupStarted } = useConversionTracking();
  const triggerType = `bizmap-step-${triggerStep}`;

  // Track trigger view when shown
  useEffect(() => {
    if (show && step === triggerStep) {
      trackTriggerView(triggerType, {
        variant,
        step,
        progress: context?.progress,
        timeSpent: context?.timeSpent,
        engagementScore: context?.engagementScore,
      });
    }
  }, [show, step, triggerStep, variant, context, trackTriggerView, triggerType]);

  // Generate contextual messaging
  const getContextualMessage = () => {
    if (context?.progress && context.progress >= 80) {
      return {
        title: "You're almost done! 🎉",
        description: `You've completed ${Math.round(context.progress)}% of your business plan. Sign up to save your progress and get your complete roadmap.`
      };
    } else if (context?.timeSpent && context.timeSpent > 300) {
      return {
        title: "You've invested time in this plan",
        description: "Don't lose your work! Create a free account to save your progress and access it anytime."
      };
    } else if (context?.engagementScore && context.engagementScore > 70) {
      return {
        title: "You're clearly engaged!",
        description: "You're putting real thought into this. Sign up to unlock AI-powered insights tailored to your business."
      };
    }
    return null;
  };

  const contextualMsg = getContextualMessage();

  const handleSignUpClick = () => {
    trackEngagement(triggerType, context?.engagementScore);
    trackSignupStarted(triggerType);
    onSignUp();
  };

  const handleDismiss = () => {
    trackDismissal(triggerType);
    onDismiss();
  };

  if (!show || step !== triggerStep) return null;

  // Inline Banner (Step 5 - soft nudge)
  if (variant === 'inline-banner') {
    return (
      <Alert className="mb-4 border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Save className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-semibold text-sm">
                {contextualMsg?.title || "Save your progress & unlock more features"}
              </h4>
              <AlertDescription className="text-xs text-muted-foreground">
                {contextualMsg?.description || "Create a free account to save your business plan, access AI insights, and get personalized recommendations"}
              </AlertDescription>
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  onClick={handleSignUpClick}
                  className="h-8 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Sign Up Free
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 text-xs"
                >
                  Continue Without Account
                </Button>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    );
  }

  // Modal (Step 7-8 - stronger push)
  if (variant === 'modal') {
    return (
      <Dialog open={show} onOpenChange={(open) => !open && onDismiss()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              You're making great progress! 🎉
            </DialogTitle>
            <DialogDescription className="text-center">
              Create a free account to unlock premium features and save your work:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 my-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Save className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Save Your Progress</p>
                <p className="text-xs text-muted-foreground">Never lose your business plan</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">AI-Powered Insights</p>
                <p className="text-xs text-muted-foreground">Get personalized recommendations</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Premium Features</p>
                <p className="text-xs text-muted-foreground">Sprint planning, collaboration & more</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={handleSignUpClick}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Sign Up Free - 30 Seconds
            </Button>
            <Button 
              variant="outline"
              onClick={handleDismiss}
              className="w-full"
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Completion Gate (Step 5 - blocking, must sign up to continue)
  if (variant === 'completion-gate') {
    return (
      <Dialog open={show} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              🚀 Create Your Free Account to Continue
            </DialogTitle>
            <DialogDescription className="text-center">
              You've made great progress! Sign up now to unlock the full 30-day launch roadmap and save your business plan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 my-4">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Complete your personalized 30-day roadmap</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Save className="h-4 w-4 text-primary" />
              <span>Save your progress automatically</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Access AI-powered insights & recommendations</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Get sprint planning and task breakdown</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={handleSignUpClick}
              className="w-full h-11"
            >
              Sign Up & Continue
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Free forever • No credit card required
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
};
