import { Link } from "react-router-dom";
import { Flame } from "lucide-react";

import { useRoutine } from "@/hooks/useRoutine";
import { cn } from "@/lib/utils";

// Persistent consistency signal shown in the dashboard header on every tab.
// Accountability is driven by a streak the founder sees every session.
export function DashboardStreakChip() {
  const { stats, isLoading } = useRoutine();

  if (isLoading) return null;

  const streak = stats.dailyStreak;
  const active = streak > 0;

  return (
    <Link
      to="/dashboard/routine"
      aria-label={`Daily streak: ${streak} ${streak === 1 ? "day" : "days"}. Open your routine.`}
      className={cn(
        "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur-md transition-colors",
        active
          ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15 dark:text-warning"
          : "border-border/70 bg-background/88 text-muted-foreground hover:text-foreground",
      )}
    >
      <Flame className={cn("h-4 w-4", active ? "text-warning" : "text-muted-foreground")} aria-hidden="true" />
      <span className="tabular-nums">{streak}</span>
      <span className="hidden sm:inline">{streak === 1 ? "day" : "days"}</span>
    </Link>
  );
}

export default DashboardStreakChip;
