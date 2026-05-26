import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Sparkles } from "lucide-react";
import { useLeaderboard } from "@/hooks/useReputation";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { getProfileUrl } from "@/utils/profileUtils";

const LeaderboardCard = () => {
  const { leaderboard, isLoading, userRank, totalUsers, pointsToNextRank, userRankInfo, isInTopN } = useLeaderboard(10);

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
            {leaderboard.map((entry: any, index) => {
              const isCurrentUser = userRankInfo?.user_id === entry.user_id;
              return (
                <Link
                  key={entry.user_id}
                  to={getProfileUrl(entry.profiles?.username, entry.profiles?.full_name || undefined)}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors ${
                    isCurrentUser ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                  }`}
                >
                  <div className="w-8 flex items-center justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  <Avatar className="w-8 h-8">
                    <AvatarImage src={entry.profiles?.avatar_url} />
                    <AvatarFallback>
                      {entry.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.profiles?.full_name || 'Anonymous'}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-xs font-normal text-primary">(You)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className={`w-3 h-3 mr-1 ${getLevelColor(entry.level)}`} />
                        {entry.level_name}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold">{entry.total_points}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </Link>
              );
            })}

            {/* Personal rank row — shown only when current user is outside the top N */}
            {userRank !== null && !isInTopN && userRankInfo && (
              <>
                <div className="flex items-center gap-2 py-0.5">
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">•••</span>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                </div>

                <Link
                  to={getProfileUrl(
                    userRankInfo.profiles?.username ?? undefined,
                    userRankInfo.profiles?.full_name ?? undefined
                  )}
                  className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 ring-1 ring-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="w-8 flex items-center justify-center">
                    <span className="text-sm font-semibold text-muted-foreground">#{userRank}</span>
                  </div>

                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userRankInfo.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {userRankInfo.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {userRankInfo.profiles?.full_name || 'You'}
                      <span className="ml-1.5 text-xs font-normal text-primary">(You)</span>
                    </p>
                    {pointsToNextRank > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {pointsToNextRank} pts to pass #{userRank - 1}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold">{userRankInfo.total_points}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </Link>

                <p className="text-center text-xs text-muted-foreground pt-0.5">
                  #{userRank} of {totalUsers} founders
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardCard;
