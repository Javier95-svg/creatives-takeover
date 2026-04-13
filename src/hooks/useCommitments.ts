import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logError } from '@/lib/logger';

export interface SprintCommitment {
  id: string;
  user_id: string;
  sprint_id: string | null;
  commitment_text: string;
  credits_staked: number;
  target_date: string;
  status: 'active' | 'achieved' | 'failed' | 'cancelled';
  is_public: boolean;
  verification_method: 'self_report' | 'peer_verified' | 'checkin_based';
  verification_data: Record<string, unknown> | null;
  verified_by: string[];
  verified_at: string | null;
  achievement_notes: string | null;
  community_reactions: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    avatar_url: string;
  };
}

export const useCommitments = (sprintId?: string) => {
  const { user } = useAuth();
  const [commitments, setCommitments] = useState<SprintCommitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [userActiveCommitments, setUserActiveCommitments] = useState<SprintCommitment[]>([]);

  const fetchCommitments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('sprint_commitments')
        .select('*')
        .order('created_at', { ascending: false });

      if (sprintId) {
        query = query.eq('sprint_id', sprintId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const baseCommitments = (data as SprintCommitment[]) || [];
      if (baseCommitments.length === 0) {
        setCommitments([]);
        return;
      }

      const userIds = Array.from(new Set(baseCommitments.map((commitment) => commitment.user_id).filter(Boolean)));
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesById = new Map(
        (profiles || []).map((profile) => [
          profile.id,
          {
            full_name: profile.full_name ?? 'Anonymous founder',
            avatar_url: profile.avatar_url ?? '',
          },
        ]),
      );

      setCommitments(
        baseCommitments.map((commitment) => ({
          ...commitment,
          user: profilesById.get(commitment.user_id),
        })),
      );
    } catch (error) {
      logError('Error fetching commitments', error);
    } finally {
      setLoading(false);
    }
  }, [user, sprintId]);

  const fetchUserActiveCommitments = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sprint_commitments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setUserActiveCommitments((data as SprintCommitment[]) || []);
    } catch (error) {
      logError('Error fetching user active commitments', error);
    }
  }, [user]);

  const createCommitment = async (commitmentData: {
    sprintId: string | null;
    commitmentText: string;
    creditsStaked: number;
    targetDate: string;
    verificationMethod: 'self_report' | 'peer_verified' | 'checkin_based';
    isPublic?: boolean;
  }) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('commitment-manager', {
        body: {
          action: 'createCommitment',
          ...commitmentData
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return null;
      }

      toast({ 
        title: 'Commitment Created!', 
        description: `You've staked ${commitmentData.creditsStaked} credits on this goal.` 
      });
      
      await fetchCommitments();
      await fetchUserActiveCommitments();
      
      return data.commitment;
    } catch (error) {
      logError('Error creating commitment', error);
      toast({ title: 'Error', description: 'Failed to create commitment', variant: 'destructive' });
      return null;
    }
  };

  const verifyCommitment = async (commitmentId: string, verificationData?: Record<string, unknown>, achievementNotes?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('commitment-manager', {
        body: {
          action: 'verifyCommitment',
          commitmentId,
          verificationData,
          achievementNotes
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      toast({ 
        title: 'Commitment Verified!', 
        description: data.creditsReturned 
          ? `You earned ${data.creditsReturned} credits!` 
          : 'Verification recorded'
      });
      
      await fetchCommitments();
      await fetchUserActiveCommitments();
    } catch (error) {
      logError('Error verifying commitment', error);
      toast({ title: 'Error', description: 'Failed to verify commitment', variant: 'destructive' });
    }
  };

  const resolveCommitment = async (
    commitmentId: string, 
    status: 'achieved' | 'failed', 
    achievementNotes?: string
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('commitment-manager', {
        body: {
          action: 'resolveCommitment',
          commitmentId,
          status,
          achievementNotes
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      const message = status === 'achieved'
        ? `Congratulations! You earned ${data.creditsReturned} credits!`
        : 'Commitment marked as failed. Better luck next time!';

      toast({ 
        title: status === 'achieved' ? 'Success!' : 'Commitment Failed', 
        description: message,
        variant: status === 'achieved' ? 'default' : 'destructive'
      });
      
      await fetchCommitments();
      await fetchUserActiveCommitments();
    } catch (error) {
      logError('Error resolving commitment', error);
      toast({ title: 'Error', description: 'Failed to resolve commitment', variant: 'destructive' });
    }
  };

  const cancelCommitment = async (commitmentId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('commitment-manager', {
        body: {
          action: 'cancelCommitment',
          commitmentId
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      toast({ 
        title: 'Commitment Cancelled', 
        description: `You received ${data.creditsReturned} credits back (50% penalty applied).`
      });
      
      await fetchCommitments();
      await fetchUserActiveCommitments();
    } catch (error) {
      logError('Error cancelling commitment', error);
      toast({ title: 'Error', description: 'Failed to cancel commitment', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchCommitments();
      fetchUserActiveCommitments();
    }
  }, [user, sprintId, fetchCommitments, fetchUserActiveCommitments]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('sprint_commitments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sprint_commitments'
        },
        () => {
          fetchCommitments();
          fetchUserActiveCommitments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sprintId, fetchCommitments, fetchUserActiveCommitments]);

  return {
    commitments,
    userActiveCommitments,
    loading,
    createCommitment,
    verifyCommitment,
    resolveCommitment,
    cancelCommitment,
    refreshCommitments: fetchCommitments
  };
};
