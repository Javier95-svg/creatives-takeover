import { Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useReputation } from "@/hooks/useReputation";

interface ReputationBadgeProps {
  userId: string;
  showPoints?: boolean;
  compact?: boolean;
}

const ReputationBadge = ({ userId, showPoints = true, compact = false }: ReputationBadgeProps) => {
  const { reputation, isLoading, getLevelColor } = useReputation(userId);

  if (isLoading || !reputation) return null;

  const levelColor = getLevelColor(reputation.level);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className={`w-3 h-3 ${levelColor}`} />
              <span className={levelColor}>{reputation.level}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{reputation.level_name}</p>
            <p className="text-sm text-muted-foreground">
              {reputation.total_points} points
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              {reputation.level >= 5 ? (
                <Trophy className={`w-3.5 h-3.5 ${levelColor}`} />
              ) : (
                <Sparkles className={`w-3.5 h-3.5 ${levelColor}`} />
              )}
              <span className={`font-semibold ${levelColor}`}>
                {reputation.level_name}
              </span>
            </Badge>
            {showPoints && (
              <span className="text-sm text-muted-foreground">
                {reputation.total_points} pts
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{reputation.level_name}</p>
            <p className="text-sm">Level {reputation.level} • {reputation.total_points} points</p>
            <p className="text-xs text-muted-foreground">
              {reputation.next_level_threshold - reputation.total_points} points to next level
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ReputationBadge;
