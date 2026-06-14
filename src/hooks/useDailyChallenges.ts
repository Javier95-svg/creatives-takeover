import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailyChallenge {
  id: string;
  challenge_type: string;
  challenge_title: string;
  challenge_description: string;
  reward_points: number;
  participants_count: number;
  completion_count: number;
}

export const useDailyChallenges = (userId?: string) => {
  const [todaysChallenge, setTodaysChallenge] = useState<DailyChallenge | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTodaysChallenge = async () => {
    try {
      const { data, error } = await supabase.rpc('get_todays_challenge');

      if (error) throw error;
      
      if (data && data.length > 0) {
        setTodaysChallenge(data[0]);
        
        // Check if user has completed it
        if (userId) {
          const { data: completedData } = await supabase.rpc('has_completed_todays_challenge', {
            p_user_id: userId
          });
          
          setIsCompleted(completedData === true);
        }
      } else {
        setTodaysChallenge(null);
      }
    } catch (error: any) {
      console.error('Error fetching today\'s challenge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeChallenge = async (
    challengeId: string,
    proofReferenceId?: string,
    proofReferenceType?: string
  ) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to complete challenges",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('complete_daily_challenge', {
        p_user_id: userId,
        p_challenge_id: challengeId,
        p_proof_reference_id: proofReferenceId || null,
        p_proof_reference_type: proofReferenceType || null
      });

      if (error) throw error;

      const result = data as any;
      
      if (!result.success) {
        toast({
          title: "Challenge completion failed",
          description: result.error || "Unable to complete challenge",
          variant: "destructive"
        });
        return false;
      }

      setIsCompleted(true);
      
      toast({
        title: "🎉 Challenge Completed!",
        description: `You earned ${result.points_awarded} points!`,
      });

      // Check if leveled up
      if (result.reputation_result?.level_up) {
        setTimeout(() => {
          toast({
            title: "⭐ Level Up!",
            description: `You're now a ${result.reputation_result.level_name}!`,
          });
        }, 1000);
      }

      return true;
    } catch (error: any) {
      console.error('Error completing challenge:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete challenge",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    void fetchTodaysChallenge();

    // Subscribe to challenge updates
    const channel = supabase
      .channel('daily-challenges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_challenges'
        },
        () => {
          void fetchTodaysChallenge();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [userId]);

  return {
    todaysChallenge,
    isCompleted,
    isLoading,
    completeChallenge,
    refetch: fetchTodaysChallenge,
  };
};
