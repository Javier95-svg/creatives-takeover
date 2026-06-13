import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTrendingPosts } from "@/hooks/useTrendingPosts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, MessageSquare, ThumbsUp, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const TrendingPostsCard = () => {
  const { trendingPosts, isLoading } = useTrendingPosts(5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendingPosts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trending Posts
          </CardTitle>
          <CardDescription>
            No trending posts yet. Be the first to start a conversation!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-warning" />
          Trending Now
        </CardTitle>
        <CardDescription>
          Hot topics in the community
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {trendingPosts.map((post, index) => (
            <Link
              key={post.id}
              to={`/mentorship?post=${post.id}`}
              className="block p-3 rounded-lg border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-warning to-pink-500 text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-clamp-1 mb-1">{post.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {post.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {post.comment_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      {post.share_count}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendingPostsCard;
