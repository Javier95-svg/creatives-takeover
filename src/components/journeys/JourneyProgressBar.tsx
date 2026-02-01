import { Progress } from '@/components/ui/progress';

interface JourneyProgressBarProps {
  completionPercent: number;
  currentDay: number;
  totalDays: number;
}

export default function JourneyProgressBar({ completionPercent, currentDay, totalDays }: JourneyProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Day {Math.min(currentDay, totalDays)} of {totalDays}
        </span>
        <span className="font-medium">{completionPercent}% complete</span>
      </div>
      <Progress value={completionPercent} className="h-2" />
    </div>
  );
}
