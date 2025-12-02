import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, MessageCircle, ArrowUp } from "lucide-react";
import { RedditDiscussion } from "@/types/founderOS";

interface RedditInsightsProps {
  discussions: RedditDiscussion[];
}

export const RedditInsights = ({ discussions }: RedditInsightsProps) => {
  if (!discussions || discussions.length === 0) {
    return null;
  }

  // Group by sentiment
  const positivePosts = discussions.filter(p => p.sentiment === 'positive').slice(0, 5);
  const highRelevancePosts = discussions
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 5);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'negative': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card className="w-full border-primary/20 shadow-xl mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Reddit Community Insights
        </CardTitle>
        <CardDescription>
          Real discussions from Reddit communities analyzing your business idea
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <div className="text-2xl font-bold text-primary">{discussions.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Posts</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/5">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {positivePosts.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Demand Signals</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-500/5">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {discussions.reduce((sum, p) => sum + p.upvotes, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Upvotes</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-500/5">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {discussions.reduce((sum, p) => sum + p.comments, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Comments</div>
          </div>
        </div>

        {/* Top Relevant Discussions */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Most Relevant Discussions
          </h3>
          <div className="space-y-3">
            {highRelevancePosts.map((post, idx) => (
              <div
                key={post.post_id || idx}
                className="p-4 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors bg-card"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-medium text-sm sm:text-base flex-1 line-clamp-2">
                    {post.title}
                  </h4>
                  <Badge className={getSentimentColor(post.sentiment)}>
                    {post.sentiment}
                  </Badge>
                </div>
                {post.content && post.content.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {post.content.substring(0, 200)}...
                  </p>
                )}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Badge variant="outline" className="px-2 py-0">
                        r/{post.subreddit}
                      </Badge>
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />
                      {post.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.comments}
                    </span>
                    <span className="text-xs">
                      {post.relevance_score}% relevant
                    </span>
                  </div>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View on Reddit
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demand Signals */}
        {positivePosts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              Demand Signals (Positive Sentiment)
            </h3>
            <div className="space-y-2">
              {positivePosts.map((post, idx) => (
                <div
                  key={post.post_id || `positive-${idx}`}
                  className="p-3 rounded-lg border border-green-500/20 bg-green-500/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium flex-1">{post.title}</p>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="px-2 py-0">
                      r/{post.subreddit}
                    </Badge>
                    <span>{post.upvotes} upvotes</span>
                    <span>{post.comments} comments</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

