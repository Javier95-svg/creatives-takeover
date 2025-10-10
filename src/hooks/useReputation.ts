import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserReputation {
  user_id: string;
  total_points: number;
  level: number;
  level_name: string;
  next_level_threshold: number;
  badges: Badge[];
  achievements: Achievement[];
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Achievement {
  id: string;
  title: string;
  progress: number;
  total: number;
  completed: boolean;
}

export interface ReputationTransaction {
  id: string;
  user_id: string;
  points: number;
  action_type: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

export const useReputation = (userId?: string) => {
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<ReputationTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchReputation = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setReputation({
          ...data,
          badges: (data.badges as any) || [],
          achievements: (data.achievements as any) || [],
        });
      }
    } catch (error: any) {
      console.error('Error fetching reputation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('reputation_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setRecentTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    }
  };

  const awardBadge = async (badge: Omit<Badge, 'earned_at'>) => {
    if (!userId || !reputation) return;

    try {
      const newBadge = { ...badge, earned_at: new Date().toISOString() };
      const updatedBadges = [...(reputation.badges || []), newBadge];

      const { error } = await supabase
        .from('user_reputation')
        .update({ badges: updatedBadges as any })
        .eq('user_id', userId);

      if (error) throw error;

      setReputation({ ...reputation, badges: updatedBadges });
      
      toast({
        title: `🎉 Badge Unlocked!`,
        description: `You earned "${badge.name}"!`,
      });
    } catch (error: any) {
      console.error('Error awarding badge:', error);
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-muted-foreground';
      case 2: return 'text-blue-500';
      case 3: return 'text-green-500';
      case 4: return 'text-purple-500';
      case 5: return 'text-orange-500';
      case 6: return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getLevelProgress = () => {
    if (!reputation) return 0;
    
    const levelThresholds = [0, 100, 500, 1500, 5000, 15000];
    const currentLevelStart = levelThresholds[reputation.level - 1] || 0;
    const nextLevelStart = reputation.next_level_threshold;
    const progress = reputation.total_points - currentLevelStart;
    const total = nextLevelStart - currentLevelStart;
    
    return Math.min((progress / total) * 100, 100);
  };

  useEffect(() => {
    fetchReputation();
    fetchRecentTransactions();

    // Subscribe to reputation updates
    const channel = supabase
      .channel('reputation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_reputation',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchReputation();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reputation_transactions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchRecentTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    reputation,
    recentTransactions,
    isLoading,
    awardBadge,
    getLevelColor,
    getLevelProgress,
    refetch: fetchReputation,
  };
};

// Hook to get leaderboard
export const useLeaderboard = (limit: number = 10) => {
  const [leaderboard, setLeaderboard] = useState<UserReputation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('user_reputation')
          .select(`
            *,
            profiles!user_reputation_user_id_fkey (
              full_name,
              avatar_url
            )
          `)
          .order('total_points', { ascending: false })
          .limit(limit);

        if (error) throw error;
        
        const formattedData = (data || []).map(item => ({
          ...item,
          badges: (item.badges as any) || [],
          achievements: (item.achievements as any) || [],
        }));
        
        setLeaderboard(formattedData);
      } catch (error: any) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  return { leaderboard, isLoading };
};
