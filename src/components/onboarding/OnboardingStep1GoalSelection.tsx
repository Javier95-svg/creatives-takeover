import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rocket, Calendar, Lightbulb, Users } from "lucide-react";
import { captureEvent } from "@/lib/analytics";

export type OnboardingGoal = "Get Funded" | "Launch in 30 Days" | "Validate My Idea" | "Build My Team";

interface OnboardingStep1GoalSelectionProps {
  onGoalSelect: (goal: OnboardingGoal) => void;
  selectedGoal?: OnboardingGoal | null;
}

const goals: Array<{
  id: OnboardingGoal;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: "Get Funded",
    label: "Get Funded",
    icon: <Rocket className="h-6 w-6" />,
    description: "Raise capital for your business"
  },
  {
    id: "Launch in 30 Days",
    label: "Launch in 30 Days",
    icon: <Calendar className="h-6 w-6" />,
    description: "Get to market quickly"
  },
  {
    id: "Validate My Idea",
    label: "Validate My Idea",
    icon: <Lightbulb className="h-6 w-6" />,
    description: "Test if your idea works"
  },
  {
    id: "Build My Team",
    label: "Build My Team",
    icon: <Users className="h-6 w-6" />,
    description: "Find the right people"
  },
];

export const OnboardingStep1GoalSelection = ({ 
  onGoalSelect, 
  selectedGoal 
}: OnboardingStep1GoalSelectionProps) => {
  const [localSelected, setLocalSelected] = useState<OnboardingGoal | null>(selectedGoal || null);

  const handleGoalClick = (goal: OnboardingGoal) => {
    setLocalSelected(goal);
    // Track goal selection in PostHog
    captureEvent('onboarding_goal_selected', {
      goal,
      step: 1,
    });
    onGoalSelect(goal);
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader className="text-center space-y-4 pb-6">
        <DialogTitle className="text-3xl font-bold">
          What's Your Goal?
        </DialogTitle>
        <p className="text-muted-foreground text-lg">
          This helps us personalize your experience. Choose the goal that resonates most with you.
        </p>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        {goals.map((goal) => (
          <Button
            key={goal.id}
            variant={localSelected === goal.id ? "default" : "outline"}
            size="lg"
            className={`h-auto p-6 flex flex-col items-center justify-center space-y-3 transition-all ${
              localSelected === goal.id
                ? "ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground"
                : "hover:border-primary hover:bg-accent"
            }`}
            onClick={() => handleGoalClick(goal.id)}
          >
            <div className={`${localSelected === goal.id ? "text-primary-foreground" : "text-primary"}`}>
              {goal.icon}
            </div>
            <div className="space-y-1 text-center">
              <div className="font-semibold text-lg">{goal.label}</div>
              <div className={`text-sm ${localSelected === goal.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {goal.description}
              </div>
            </div>
          </Button>
        ))}
      </div>

      {localSelected && (
        <div className="pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Selected: <span className="font-semibold text-foreground">{localSelected}</span>
          </p>
        </div>
      )}
    </DialogContent>
  );
};

