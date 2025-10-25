import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Sparkles } from "lucide-react";

interface ContinueProgressDialogProps {
  open: boolean;
  onContinue: () => void;
  onStartFresh: () => void;
  savedDate: Date | null;
  currentStep: number;
  totalSteps: number;
}

export const ContinueProgressDialog = ({
  open,
  onContinue,
  onStartFresh,
  savedDate,
  currentStep,
  totalSteps,
}: ContinueProgressDialogProps) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <AlertDialogTitle>Continue where you left off?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              We found your saved progress from{" "}
              <span className="font-medium text-foreground">
                {savedDate ? formatDate(savedDate) : "earlier"}
              </span>
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {Math.round((currentStep / totalSteps) * 100)}% complete
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onStartFresh} className="sm:flex-1">
            Start Fresh
          </AlertDialogCancel>
          <AlertDialogAction onClick={onContinue} className="sm:flex-1">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
