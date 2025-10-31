import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // Profile views (assume table profile_views)
        const pvQuery = supabase
          .from('profile_views')
          .select('created_at')
          .eq('user_id', user.id);
        if (dateFrom) pvQuery.gte('created_at', dateFrom);
        const { data: pv } = await pvQuery;

        // Community posts engagement
        const postsQuery = supabase
          .from('community_posts')
          .select('upvotes, comment_count, shares, created_at')
          .eq('user_id', user.id);
        if (dateFrom) postsQuery.gte('created_at', dateFrom);
        const { data: posts } = await postsQuery;

        // Followers growth (assume followers table with follow/unfollow events)
        const followersQuery = supabase
          .from('followers')
          .select('created_at')
          .eq('followed_id', user.id);
        if (dateFrom) followersQuery.gte('created_at', dateFrom);
        const { data: followers } = await followersQuery;

        // Success stories
        const storiesQuery = supabase
          .from('success_stories')
          .select('id, created_at')
          .eq('user_id', user.id);
        if (dateFrom) storiesQuery.gte('created_at', dateFrom);
        const { data: stories } = await storiesQuery;

        const totalEngagement = (posts || []).reduce((acc: number, p: any) => acc + (p.upvotes || 0) + (p.comment_count || 0) + (p.shares || 0), 0);

        // Create simple trend series by day based on posts and a placeholder earnings series from another table if present
        const earningsQuery = supabase
          .from('earnings_daily')
          .select('date, amount_cents')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        if (dateFrom) earningsQuery.gte('date', dateFrom.slice(0, 10));
        const { data: earnings } = await earningsQuery;

        const engagementByDate = new Map<string, number>();
        (posts || []).forEach((p: any) => {
          const key = (p.created_at || '').slice(0, 10);
          engagementByDate.set(key, (engagementByDate.get(key) || 0) + (p.upvotes || 0) + (p.comment_count || 0) + (p.shares || 0));
        });

        const allDates = new Set<string>([
          ...Array.from(engagementByDate.keys()),
          ...((earnings || []).map((e: any) => e.date)),
        ]);
        const points: TrendPoint[] = Array.from(allDates)
          .sort()
          .map((d) => ({
            date: d,
            earnings: ((earnings || []).find((e: any) => e.date === d)?.amount_cents || 0) / 100,
            engagement: engagementByDate.get(d) || 0,
          }));

        const milestones: string[] = [];
        const lifetimeEarningsCents = (earnings || []).reduce((acc: number, e: any) => acc + (e.amount_cents || 0), 0);
        if (lifetimeEarningsCents >= 100000) milestones.push('$1K Club');
        if (lifetimeEarningsCents >= 1000000) milestones.push('$10K Club');

        if (!isMounted) return;
        setSummary({
          profileViews: (pv || []).length,
          postEngagement: totalEngagement,
          revenueMilestones: milestones,
          followerGrowth: (followers || []).length,
          successStoriesShared: (stories || []).length,
        });
        setTrends(points);
      } catch (e: any) {
        console.debug('Engagement analytics fetch error (non-fatal):', e?.message || e);
        if (!isMounted) return;
        setSummary({ profileViews: 0, postEngagement: 0, revenueMilestones: [], followerGrowth: 0, successStoriesShared: 0 });
        setTrends([]);
        setError('Analytics tables not found or empty');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [user, dateFrom, filters.period, filters.contentType]);

  return { summary, trends, loading, error };
}


