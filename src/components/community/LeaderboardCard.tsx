import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Sparkles } from "lucide-react";
import { useLeaderboard } from "@/hooks/useReputation";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const LeaderboardCard = () => {
  const { leaderboard, isLoading } = useLeaderboard(10);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 6) return 'text-yellow-500';
    if (level >= 5) return 'text-orange-500';
    if (level >= 4) return 'text-purple-500';
    if (level >= 3) return 'text-green-500';
    if (level >= 2) return 'text-blue-500';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Community Leaderboard
        </CardTitle>
        <CardDescription>Top contributors this month</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="w-16 h-4" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No leaderboard data yet</p>
            <p className="text-sm">Be the first to contribute!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((user: any, index) => (
              <Link
                key={user.user_id}
                to={`/profile/${user.profiles?.username || user.user_id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="w-8 flex items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>
                
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.profiles?.avatar_url} />
                  <AvatarFallback>
                    {user.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.profiles?.full_name || 'Anonymous'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className={`w-3 h-3 mr-1 ${getLevelColor(user.level)}`} />
                      {user.level_name}
                    </Badge>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">{user.total_points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardCard;
