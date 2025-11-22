import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, ArrowRight, Users } from "lucide-react";

interface OnboardingStep2QuickWinsProps {
  onContinue: () => void;
}

const quickWins = [
  {
    id: 1,
    text: "Business model canvas validated",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />
  },
  {
    id: 2,
    text: "30-day action plan created",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />
  },
  {
    id: 3,
    text: "Pitch deck outline started",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />
  },
];

export const OnboardingStep2QuickWins = ({ onContinue }: OnboardingStep2QuickWinsProps) => {
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader className="text-center space-y-4 pb-6">
        <DialogTitle className="text-3xl font-bold">
          Here's What You'll Get in the Next 24 Hours
        </DialogTitle>
        <DialogDescription className="text-lg text-muted-foreground">
          We'll help you achieve these concrete outputs to get you started
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-6">
        {quickWins.map((win) => (
          <div
            key={win.id}
            className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
          >
            <div className="flex-shrink-0">
              {win.icon}
            </div>
            <div className="flex-1">
              <p className="text-lg font-medium">{win.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Social Proof */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex items-center justify-center space-x-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <p className="text-sm">
            <span className="font-semibold text-foreground">3,456 founders</span> completed this this week
          </p>
        </div>
      </div>

      <div className="pt-6 flex justify-center">
        <Button size="lg" onClick={onContinue} className="px-8">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </DialogContent>
  );
};

