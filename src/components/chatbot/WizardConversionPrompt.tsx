import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Lock, TrendingUp, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface WizardConversionPromptProps {
  step: number;
  triggerStep: number;
  variant: 'inline-banner' | 'modal' | 'completion-gate';
  onDismiss: () => void;
  onSignUp: () => void;
  show: boolean;
}

export const WizardConversionPrompt = ({
  step,
  triggerStep,
  variant,
  onDismiss,
  onSignUp,
  show
}: WizardConversionPromptProps) => {
  const navigate = useNavigate();

  if (!show || step !== triggerStep) return null;

  // Inline Banner (Step 5 - soft nudge)
  if (variant === 'inline-banner') {
    return (
      <Alert className="mb-4 border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Save className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-semibold text-sm">Save your progress & unlock more features</h4>
              <AlertDescription className="text-xs text-muted-foreground">
                Create a free account to save your business plan, access AI insights, and get personalized recommendations
              </AlertDescription>
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  onClick={onSignUp}
                  className="h-8 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Sign Up Free
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={onDismiss}
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
            onClick={onDismiss}
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
              onClick={onSignUp}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Sign Up Free - 30 Seconds
            </Button>
            <Button 
              variant="outline"
              onClick={onDismiss}
              className="w-full"
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Completion Gate (Final step - blocking)
  if (variant === 'completion-gate') {
    return (
      <Dialog open={show} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              Almost there! 🚀
            </DialogTitle>
            <DialogDescription className="text-center">
              Create a free account to view your complete Launch Report and access all premium features
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 my-4">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Comprehensive business analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Success score & recommendations</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Sprint planning & task management</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Save & edit your plan anytime</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={onSignUp}
              className="w-full h-11"
            >
              Sign Up & View Results
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
