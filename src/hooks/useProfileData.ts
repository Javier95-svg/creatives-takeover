import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useReputation } from './useReputation';

export const useProfileData = (userId: string) => {
  const { reputation } = useReputation(userId);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalDiaries: 0,
    totalPrompts: 0,
    totalPitches: 0,
    totalFeedback: 0,
    totalEngagement: 0,
    streak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch content counts by type
        const { data: posts, error: postsError } = await supabase
          .from('community_posts')
          .select('content_type, upvotes, comment_count', { count: 'exact' })
          .eq('user_id', userId);

        if (postsError) throw postsError;

        // Calculate stats
        const postsByType = {
          post: 0,
          diary: 0,
          prompt: 0,
          pitch: 0,
          feedback: 0,
        };

        let totalEngagement = 0;

        posts?.forEach((post) => {
          const type = (post.content_type || 'post') as keyof typeof postsByType;
          if (type in postsByType) {
            postsByType[type]++;
          }
          totalEngagement += (post.upvotes || 0) + (post.comment_count || 0);
        });

        // Calculate streak (simplified - check consecutive days of activity)
        const { data: recentActivity } = await supabase
          .from('community_posts')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);

        let streak = 0;
        if (recentActivity && recentActivity.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let currentDate = new Date(today);
          const activityDates = recentActivity.map(a => {
            const d = new Date(a.created_at);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          });
          
          const uniqueDates = [...new Set(activityDates)];
          
          for (let i = 0; i < 30; i++) {
            if (uniqueDates.includes(currentDate.getTime())) {
              streak++;
              currentDate.setDate(currentDate.getDate() - 1);
            } else {
              break;
            }
          }
        }

        setStats({
          totalPosts: postsByType.post,
          totalDiaries: postsByType.diary,
          totalPrompts: postsByType.prompt,
          totalPitches: postsByType.pitch,
          totalFeedback: postsByType.feedback,
          totalEngagement,
          streak,
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  return {
    stats: {
      ...stats,
      reputationPoints: reputation?.total_points || 0,
      reputationLevel: reputation?.level || 0,
      nextLevelPoints: ((reputation?.level || 0) + 1) * 100,
    },
    badges: reputation?.badges || [],
    loading,
  };
};
