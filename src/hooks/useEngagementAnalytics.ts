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
      // Fetch all analytics data in parallel
      const [postsResult, pvResult, followersResult, storiesResult, earningsResult] = await Promise.all([
        supabase
          .from('community_posts')
          .select('upvotes, comment_count, share_count, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profile_views')
          .select('created_at')
          .eq('user_id', user.id),
        supabase
          .from('followers')
          .select('created_at')
          .eq('followed_id', user.id),
        supabase
          .from('success_stories')
          .select('id, created_at')
          .eq('user_id', user.id),
        supabase
          .from('earnings_daily')
          .select('date, amount_cents')
          .eq('user_id', user.id)
          .order('date', { ascending: true }),
      ]);

      const posts = (postsResult.data || []).filter(p => !dateFrom || p.created_at >= dateFrom);
      const pv = (pvResult.data || []).filter(v => !dateFrom || v.created_at >= dateFrom);
      const followers = (followersResult.data || []).filter(f => !dateFrom || f.created_at >= dateFrom);
      const stories = (storiesResult.data || []).filter(s => !dateFrom || s.created_at >= dateFrom);
      const earnings = (earningsResult.data || []).filter(e => !dateFrom || e.date >= dateFrom.slice(0, 10));

      const totalEngagement = posts.reduce((acc, p: any) => 
        acc + (p.upvotes || 0) + (p.comment_count || 0) + (p.share_count || 0), 0
      );

      // Create trend series by day
      const engagementByDate = new Map<string, number>();
      posts.forEach((p: any) => {
        const key = (p.created_at || '').slice(0, 10);
        engagementByDate.set(key, (engagementByDate.get(key) || 0) + 
          (p.upvotes || 0) + (p.comment_count || 0) + (p.share_count || 0));
      });

      const allDates = new Set<string>([
        ...Array.from(engagementByDate.keys()),
        ...(earnings.map((e: any) => e.date)),
      ]);

      const points: TrendPoint[] = Array.from(allDates)
        .sort()
        .map((d) => ({
          date: d,
          earnings: (earnings.find((e: any) => e.date === d)?.amount_cents || 0) / 100,
          engagement: engagementByDate.get(d) || 0,
        }));

      // Calculate revenue milestones from earnings
      const lifetimeEarningsCents = earnings.reduce((acc, e: any) => acc + (e.amount_cents || 0), 0);
      const milestones: string[] = [];
      if (lifetimeEarningsCents >= 1000000) milestones.push('$10K Club');
      else if (lifetimeEarningsCents >= 100000) milestones.push('$1K Club');
      else if (lifetimeEarningsCents >= 50000) milestones.push('$500 Club');
      else if (lifetimeEarningsCents >= 10000) milestones.push('$100 Club');

      setSummary({
        profileViews: pv.length,
        postEngagement: totalEngagement,
        revenueMilestones: milestones,
        followerGrowth: followers.length,
        successStoriesShared: stories.length,
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


