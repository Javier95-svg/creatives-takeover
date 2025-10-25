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
import { AlertTriangle } from "lucide-react";

interface JumpToStepDialogProps {
  open: boolean;
  targetStep: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const JumpToStepDialog = ({
  open,
  targetStep,
  onConfirm,
  onCancel,
}: JumpToStepDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Jump to Step {targetStep + 1}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              You're about to edit a previous step. Your current progress will be saved automatically.
            </p>
            <p className="text-sm text-muted-foreground">
              Note: Changing answers in earlier steps may affect your subsequent responses.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Jump to Step {targetStep + 1}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
