import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrendingPost {
  id: string;
  title: string;
  content: string;
  user_id: string;
  upvotes: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  trending_score: number;
}

export const useTrendingPosts = (limit: number = 10) => {
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrendingPosts = async () => {
    try {
      // Get recent posts
      const { data: posts, error } = await supabase
        .from('community_posts')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!posts || posts.length === 0) {
        setTrendingPosts([]);
        setIsLoading(false);
        return;
      }

      // Calculate trending scores
      const postsWithScores = await Promise.all(
        posts.map(async (post) => {
          const { data: scoreData } = await supabase
            .rpc('calculate_trending_score', { p_post_id: post.id });
          
          return {
            ...post,
            trending_score: scoreData || 0
          };
        })
      );

      // Sort by trending score
      const sorted = postsWithScores
        .sort((a, b) => b.trending_score - a.trending_score)
        .slice(0, limit);

      setTrendingPosts(sorted);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingPosts();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTrendingPosts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [limit]);

  return { trendingPosts, isLoading, refetch: fetchTrendingPosts };
};
