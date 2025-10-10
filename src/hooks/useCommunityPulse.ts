import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommunityPulse {
  id: string;
  pulse_date: string;
  total_posts: number;
  total_comments: number;
  total_upvotes: number;
  active_users: number;
  new_users: number;
  challenges_completed: number;
  avg_engagement_score: number;
  trending_topics: string[];
}

export const useCommunityPulse = () => {
  const [todaysPulse, setTodaysPulse] = useState<CommunityPulse | null>(null);
  const [weekPulse, setWeekPulse] = useState<CommunityPulse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodaysPulse = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('community_pulse')
        .select('*')
        .eq('pulse_date', today)
        .maybeSingle();

      if (error) throw error;
      setTodaysPulse(data);
    } catch (error) {
      console.error('Error fetching today\'s pulse:', error);
    }
  };

  const fetchWeekPulse = async () => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('community_pulse')
        .select('*')
        .gte('pulse_date', weekAgo.toISOString().split('T')[0])
        .order('pulse_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setWeekPulse(data || []);
    } catch (error) {
      console.error('Error fetching week pulse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaysPulse();
    fetchWeekPulse();

    // Subscribe to updates
    const channel = supabase
      .channel('community-pulse')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_pulse'
        },
        () => {
          fetchTodaysPulse();
          fetchWeekPulse();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    todaysPulse,
    weekPulse,
    isLoading,
    refetch: () => {
      fetchTodaysPulse();
      fetchWeekPulse();
    }
  };
};
