import { useState, useEffect } from 'react';
import { safe } from '@/integrations/supabase/safe';
import { useToast } from '@/hooks/use-toast';
import { showAchievementToast } from '@/components/community/AchievementToast';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement_type: string;
  requirement_value: number | null;
}

export const useBadgeSystem = (userId?: string) => {
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchBadgeDefinitions = async () => {
    try {
      const { data, error } = await safe.select(async () =>
        await safe.client
          .from('badge_definitions')
          .select('*')
          .order('rarity')
      );

      if (error) throw error;
      setBadges((data || []) as BadgeDefinition[]);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndAwardBadges = async () => {
    if (!userId) return;

    try {
      const { data, error } = await safe.rpc(async () =>
        await safe.client.rpc('check_and_award_badges', {
          p_user_id: userId
        })
      );

      if (error) throw error;

      // Show toast for each new badge
      if (data && Array.isArray(data) && data.length > 0) {
        data.forEach((badge: any) => {
          toast({
            title: `🎉 Badge Unlocked: ${badge.name}`,
            description: `You earned the ${badge.icon} ${badge.name} badge!`,
          });
        });
      }

      return data;
    } catch (error) {
      console.error('Error checking badges:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchBadgeDefinitions();
  }, []);

  return {
    badges,
    isLoading,
    checkAndAwardBadges,
    refetch: fetchBadgeDefinitions
  };
};
