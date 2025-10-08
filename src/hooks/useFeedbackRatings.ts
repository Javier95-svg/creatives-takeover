import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeedbackRating {
  id: string;
  post_id: string;
  user_id: string;
  clarity_score: number | null;
  market_fit_score: number | null;
  innovation_score: number | null;
  created_at: string;
}

interface AverageRatings {
  clarity: number;
  market_fit: number;
  innovation: number;
  total_ratings: number;
}

export const useFeedbackRatings = (postId: string) => {
  const [ratings, setRatings] = useState<FeedbackRating[]>([]);
  const [averages, setAverages] = useState<AverageRatings | null>(null);
  const [userRating, setUserRating] = useState<FeedbackRating | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRatings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_feedback_ratings')
        .select('*')
        .eq('post_id', postId);

      if (error) throw error;

      setRatings(data || []);
      
      // Calculate averages
      if (data && data.length > 0) {
        const clarity = data.reduce((sum, r) => sum + (r.clarity_score || 0), 0) / data.length;
        const market_fit = data.reduce((sum, r) => sum + (r.market_fit_score || 0), 0) / data.length;
        const innovation = data.reduce((sum, r) => sum + (r.innovation_score || 0), 0) / data.length;
        
        setAverages({
          clarity: Math.round(clarity * 10) / 10,
          market_fit: Math.round(market_fit * 10) / 10,
          innovation: Math.round(innovation * 10) / 10,
          total_ratings: data.length
        });
      }

      // Check if current user has rated
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        const userRatingData = data.find(r => r.user_id === user.id);
        setUserRating(userRatingData || null);
      }
    } catch (error: any) {
      console.error('Error fetching ratings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitRating = async (clarity: number, marketFit: number, innovation: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to rate posts",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('post_feedback_ratings')
        .upsert({
          post_id: postId,
          user_id: user.id,
          clarity_score: clarity,
          market_fit_score: marketFit,
          innovation_score: innovation,
        });

      if (error) throw error;

      toast({
        title: "Rating submitted",
        description: "Thank you for your feedback!",
      });

      await fetchRatings();
      return true;
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Failed to submit rating",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    if (postId) {
      fetchRatings();
    }
  }, [postId]);

  return {
    ratings,
    averages,
    userRating,
    isLoading,
    submitRating,
    refreshRatings: fetchRatings
  };
};
