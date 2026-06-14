import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCommunityFeedback } from '@/hooks/useCommunityFeedback';
import { MessageSquare, ThumbsUp, Sparkles, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedbackSummaryPanelProps {
  postId: string;
  onContinueInChatbot?: () => void;
}

export const FeedbackSummaryPanel = ({ postId, onContinueInChatbot }: FeedbackSummaryPanelProps) => {
  const { feedbackSummary, isLoading, refreshFeedback, processFeedback } = useCommunityFeedback(postId);

  const handleProcessFeedback = async () => {
    await processFeedback(postId);
    void refreshFeedback();
  };

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    );
  }

  if (!feedbackSummary) return null;

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Community Feedback Summary
        </h3>
        <Button variant="ghost" size="sm" onClick={refreshFeedback}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold">{feedbackSummary.totalComments}</p>
            <p className="text-xs text-muted-foreground">Comments</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
          <ThumbsUp className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold">{feedbackSummary.totalReactions}</p>
            <p className="text-xs text-muted-foreground">Reactions</p>
          </div>
        </div>
      </div>

      {feedbackSummary.aiSummary && (
        <div className="space-y-2 p-4 rounded-lg bg-background border">
          <p className="text-sm font-medium">AI Summary:</p>
          <p className="text-sm text-muted-foreground">{feedbackSummary.aiSummary}</p>
        </div>
      )}

      {feedbackSummary.actionItems && feedbackSummary.actionItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Action Items:</p>
          <div className="space-y-2">
            {feedbackSummary.actionItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="mt-0.5">{idx + 1}</Badge>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleProcessFeedback} variant="outline" className="flex-1">
          <Sparkles className="h-4 w-4 mr-2" />
          Process with AI
        </Button>
        {onContinueInChatbot && (
          <Button onClick={onContinueInChatbot} className="flex-1">
            Continue in BizMap AI
          </Button>
        )}
      </div>
    </Card>
  );
};
