import { useState, useEffect } from 'react';
import { safe } from '@/integrations/supabase/safe';

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
      // Get recent posts with retry logic
      const { data: posts, error } = await safe.select(async () =>
        await safe.client
          .from('community_posts')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100)
      );

      if (error) throw error;

      if (!posts || posts.length === 0) {
        setTrendingPosts([]);
        setIsLoading(false);
        return;
      }

      // Calculate trending scores with retry logic
      const postsWithScores = await Promise.all(
        posts.map(async (post: any) => {
          const { data: scoreData } = await safe.rpc(async () =>
            await safe.client.rpc('calculate_trending_score', { p_post_id: post.id })
          );
          
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
    void fetchTrendingPosts();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTrendingPosts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [limit]);

  return { trendingPosts, isLoading, refetch: fetchTrendingPosts };
};
