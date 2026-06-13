import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MessageCircle, Users, Target, Award, Calendar, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfileStatsProps {
  stats: {
    totalPosts: number;
    totalDiaries: number;
    totalPrompts: number;
    totalPitches: number;
    totalFeedback: number;
    totalEngagement: number;
    streak: number;
    joinDate: string;
    reputationPoints?: number;
    reputationLevel?: number;
    nextLevelPoints?: number;
  };
}

export const ProfileStats = ({ stats }: ProfileStatsProps) => {
  const totalSubmissions = stats.totalPosts + stats.totalDiaries + stats.totalPrompts + stats.totalPitches + stats.totalFeedback;
  
  const progressToNextLevel = stats.reputationPoints && stats.nextLevelPoints 
    ? (stats.reputationPoints / stats.nextLevelPoints) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Contributions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Total Contributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalSubmissions}</div>
          <div className="flex flex-wrap gap-2 mt-3">
            {stats.totalPosts > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.totalPosts} Posts
              </Badge>
            )}
            {stats.totalDiaries > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.totalDiaries} Diaries
              </Badge>
            )}
            {stats.totalPrompts > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.totalPrompts} Prompts
              </Badge>
            )}
            {stats.totalPitches > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.totalPitches} Pitches
              </Badge>
            )}
            {stats.totalFeedback > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.totalFeedback} Feedback
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Engagement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            Total Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalEngagement}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Combined upvotes & comments received
          </p>
        </CardContent>
      </Card>

      {/* Streak */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" />
            Activity Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold flex items-center gap-2">
            {stats.streak}
            <span className="text-lg text-muted-foreground">days</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Keep posting to maintain your streak!
          </p>
        </CardContent>
      </Card>

      {/* Reputation Level */}
      {stats.reputationLevel !== undefined && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Reputation Level {stats.reputationLevel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to Level {(stats.reputationLevel || 0) + 1}</span>
              <span className="font-medium">
                {stats.reputationPoints} / {stats.nextLevelPoints} points
              </span>
            </div>
            <Progress value={progressToNextLevel} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Member Since */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Member since {new Date(stats.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
