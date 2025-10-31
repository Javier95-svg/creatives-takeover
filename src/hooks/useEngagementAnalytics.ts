import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type EngagementSummary = {
  profileViews: number;
  postEngagement: number; // sum of upvotes + comments + shares
  revenueMilestones: string[]; // e.g., ["$100", "$1K Club"]
  followerGrowth: number; // net change in period
  successStoriesShared: number;
};

export type TrendPoint = { date: string; earnings: number; engagement: number };

export type AnalyticsFilters = {
  period: '30d' | '90d' | 'all';
  contentType?: 'all' | 'post' | 'event' | 'content';
};

export function useEngagementAnalytics(filters: AnalyticsFilters = { period: '30d', contentType: 'all' }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EngagementSummary>({
    profileViews: 0,
    postEngagement: 0,
    revenueMilestones: [],
    followerGrowth: 0,
    successStoriesShared: 0,
  });
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFrom = useMemo(() => {
    if (filters.period === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    if (filters.period === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return d.toISOString();
    }
    return undefined;
  }, [filters.period]);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch posts data
      const postsResult = await (supabase as any)
        .from('community_posts')
        .select('upvotes, comment_count, share_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const posts = ((postsResult.data || []) as any[]).filter((p: any) => !dateFrom || p.created_at >= dateFrom);

      const totalEngagement = posts.reduce((acc: number, p: any) => 
        acc + (p.upvotes || 0) + (p.comment_count || 0) + (p.share_count || 0), 0
      );

      // Create trend series by day
      const engagementByDate = new Map<string, number>();
      posts.forEach((p: any) => {
        const key = (p.created_at || '').slice(0, 10);
        engagementByDate.set(key, (engagementByDate.get(key) || 0) + 
          (p.upvotes || 0) + (p.comment_count || 0) + (p.share_count || 0));
      });

      const points: TrendPoint[] = Array.from(engagementByDate.keys())
        .sort()
        .map((d) => ({
          date: d,
          earnings: 0,
          engagement: engagementByDate.get(d) || 0,
        }));

      setSummary({
        profileViews: 0,
        postEngagement: totalEngagement,
        revenueMilestones: [],
        followerGrowth: 0,
        successStoriesShared: 0,
      });
      setTrends(points.length > 0 ? points : []);
    } catch (e: any) {
      console.error('Engagement analytics fetch error:', e);
      setError(e?.message || 'Failed to load analytics data');
      setSummary({ profileViews: 0, postEngagement: 0, revenueMilestones: [], followerGrowth: 0, successStoriesShared: 0 });
      setTrends([]);
    } finally {
      setLoading(false);
    }
  }, [user, dateFrom]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Posts subscription
    const postsChannel = supabase
      .channel(`analytics-posts-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_posts',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadData();
      })
      .subscribe();

    channels.push(postsChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, loadData]);

  return { summary, trends, loading, error, refresh: loadData };
}


