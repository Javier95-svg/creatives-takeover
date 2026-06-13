import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Award, Star, Flame, Zap } from "lucide-react";
import { Badge as BadgeType } from "@/hooks/useReputation";

interface BadgeShowcaseProps {
  badges: BadgeType[];
  compact?: boolean;
}

const badgeIcons: Record<string, React.ReactNode> = {
  '🏆': <Trophy className="w-4 h-4" />,
  '🔥': <Flame className="w-4 h-4" />,
  '💡': <Zap className="w-4 h-4" />,
  '📈': <Star className="w-4 h-4" />,
  '🌟': <Award className="w-4 h-4" />,
};

const getRarityColor = (rarity?: string) => {
  switch (rarity) {
    case 'legendary': return 'border-warning bg-warning/10';
    case 'epic': return 'border-purple-500 bg-purple-500/10';
    case 'rare': return 'border-info bg-info/10';
    default: return 'border-muted-foreground/20';
  }
};

const BadgeShowcase = ({ badges, compact = false }: BadgeShowcaseProps) => {
  if (!badges || badges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Badges
          </CardTitle>
          <CardDescription>
            No badges earned yet. Keep contributing to unlock achievements!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {badges.slice(0, 5).map((badge) => (
          <TooltipProvider key={badge.id}>
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={`${getRarityColor(badge.rarity)} cursor-pointer`}
                >
                  <span className="text-base">{badge.icon}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Earned {new Date(badge.earned_at).toLocaleDateString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {badges.length > 5 && (
          <Badge variant="secondary">+{badges.length - 5}</Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Badges ({badges.length})
        </CardTitle>
        <CardDescription>
          Achievements unlocked through community participation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map((badge) => (
            <TooltipProvider key={badge.id}>
              <Tooltip>
                <TooltipTrigger>
                  <Card className={`cursor-pointer hover:shadow-md transition-shadow ${getRarityColor(badge.rarity)}`}>
                    <CardContent className="p-4 text-center space-y-2">
                      <div className="text-3xl">{badge.icon}</div>
                      <p className="text-sm font-semibold line-clamp-1">{badge.name}</p>
                      {badge.rarity && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {badge.rarity}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-sm">{badge.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Earned on {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgeShowcase;
