import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommunityPulse } from "@/hooks/useCommunityPulse";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, MessageSquare, ThumbsUp, Users, Trophy, Sparkles } from "lucide-react";

const CommunityPulseCard = () => {
  const { todaysPulse, weekPulse, isLoading } = useCommunityPulse();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const weekTotal = weekPulse.reduce((acc, pulse) => ({
    posts: acc.posts + pulse.total_posts,
    comments: acc.comments + pulse.total_comments,
    upvotes: acc.upvotes + pulse.total_upvotes,
    activeUsers: Math.max(acc.activeUsers, pulse.active_users)
  }), { posts: 0, comments: 0, upvotes: 0, activeUsers: 0 });

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Community Pulse
        </CardTitle>
        <CardDescription>
          {todaysPulse ? "Today's activity" : "This week's activity"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>Posts</span>
            </div>
            <p className="text-2xl font-bold">
              {todaysPulse?.total_posts || weekTotal.posts}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>Comments</span>
            </div>
            <p className="text-2xl font-bold">
              {todaysPulse?.total_comments || weekTotal.comments}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ThumbsUp className="w-4 h-4" />
              <span>Upvotes</span>
            </div>
            <p className="text-2xl font-bold">
              {todaysPulse?.total_upvotes || weekTotal.upvotes}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Active</span>
            </div>
            <p className="text-2xl font-bold">
              {todaysPulse?.active_users || weekTotal.activeUsers}
            </p>
          </div>
        </div>

        {todaysPulse?.challenges_completed && todaysPulse.challenges_completed > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-muted-foreground">Challenges completed today</span>
              </div>
              <span className="text-lg font-semibold">{todaysPulse.challenges_completed}</span>
            </div>
          </div>
        )}

        {todaysPulse?.trending_topics && todaysPulse.trending_topics.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>Trending Topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {todaysPulse.trending_topics.map((topic, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommunityPulseCard;
