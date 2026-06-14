import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeedbackSummary {
  totalComments: number;
  totalReactions: number;
  topSuggestions: string[];
  aiSummary?: string;
  actionItems?: string[];
}

export const useCommunityFeedback = (postId?: string) => {
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchFeedbackSummary = async () => {
    if (!postId) return;
    
    setIsLoading(true);
    try {
      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      // Fetch reactions/votes
      const { data: post } = await supabase
        .from('community_posts')
        .select('upvotes, downvotes')
        .eq('id', postId)
        .single();

      setFeedbackSummary({
        totalComments: commentsCount || 0,
        totalReactions: (post?.upvotes || 0) + (post?.downvotes || 0),
        topSuggestions: [],
      });
    } catch (error: any) {
      console.error('Error fetching feedback summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processFeedback = async (postId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-community-feedback', {
        body: { postId },
      });

      if (error) throw error;

      toast({
        title: "Feedback processed ✨",
        description: "AI has analyzed all community feedback",
      });

      return data;
    } catch (error: any) {
      console.error('Error processing feedback:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Could not process feedback",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    void fetchFeedbackSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [postId]);

  return {
    feedbackSummary,
    isLoading,
    refreshFeedback: fetchFeedbackSummary,
    processFeedback,
  };
};
