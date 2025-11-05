import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AccountabilityPartnership {
  id: string;
  requester_id: string;
  partner_id: string;
  sprint_id?: string;
  partnership_type: 'sprint_buddy' | 'daily_accountability' | 'goal_tracker';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  started_at?: string;
  ended_at?: string;
  partnership_settings: Record<string, any>;
  // Joined data
  partner_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
  };
  requester_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
  };
  sprint?: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
  };
}

export interface AccountabilityNudge {
  id: string;
  partnership_id: string;
  nudger_id: string;
  nudged_id: string;
  nudge_type: 'missed_checkin' | 'encouragement' | 'check_in' | 'milestone';
  message?: string;
  nudge_trigger: Record<string, any>;
  created_at: string;
  acknowledged_at?: string;
  // Joined data
  nudger_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export const useAccountabilityPartners = () => {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<AccountabilityPartnership[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccountabilityPartnership[]>([]);
  const [recentNudges, setRecentNudges] = useState<AccountabilityNudge[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPartnerships = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch partnerships with profile and sprint data
      const { data, error } = await supabase
        .from('accountability_partnerships')
        .select(`
          *,
          partner_profile:profiles!accountability_partnerships_partner_id_fkey(
            id, full_name, avatar_url, bio
          ),
          requester_profile:profiles!accountability_partnerships_requester_id_fkey(
            id, full_name, avatar_url, bio
          ),
          sprint:sprints(
            id, title, description, start_date, end_date
          )
        `)
        .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const activePartnerships = (data?.filter(p => p.status === 'active') || []) as unknown as AccountabilityPartnership[];
      const pendingPartnerships = (data?.filter(p => p.status === 'pending') || []) as unknown as AccountabilityPartnership[];

      setPartnerships(activePartnerships);
      setPendingRequests(pendingPartnerships);
    } catch (error) {
      console.error('Error fetching partnerships:', error);
      toast.error('Failed to load accountability partnerships');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchRecentNudges = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('accountability_nudges')
        .select(`
          *,
          nudger_profile:profiles!accountability_nudges_nudger_id_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq('nudged_id', user.id)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentNudges((data || []) as unknown as AccountabilityNudge[]);
    } catch (error) {
      console.error('Error fetching nudges:', error);
    }
  }, [user]);

  const sendPartnershipRequest = useCallback(async (
    partnerId: string, 
    partnershipType: AccountabilityPartnership['partnership_type'],
    sprintId?: string,
    message?: string
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const settings = message ? { request_message: message } : {};
      
      const { error } = await supabase
        .from('accountability_partnerships')
        .insert({
          requester_id: user.id,
          partner_id: partnerId,
          sprint_id: sprintId,
          partnership_type: partnershipType,
          partnership_settings: settings
        });

      if (error) throw error;

      toast.success('Partnership request sent!');
      fetchPartnerships();
      return { error: null };
    } catch (error: any) {
      console.error('Error sending partnership request:', error);
      toast.error('Failed to send partnership request');
      return { error: error.message };
    }
  }, [user, fetchPartnerships]);

  const respondToPartnershipRequest = useCallback(async (
    partnershipId: string, 
    action: 'accept' | 'decline'
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const updates: Partial<AccountabilityPartnership> = {
        status: action === 'accept' ? 'active' : 'cancelled',
        updated_at: new Date().toISOString()
      };

      if (action === 'accept') {
        updates.started_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('accountability_partnerships')
        .update(updates)
        .eq('id', partnershipId);

      if (error) throw error;

      toast.success(`Partnership request ${action}ed`);
      fetchPartnerships();
      return { error: null };
    } catch (error: any) {
      console.error('Error responding to partnership request:', error);
      toast.error('Failed to respond to partnership request');
      return { error: error.message };
    }
  }, [fetchPartnerships]);

  const sendNudge = useCallback(async (
    partnershipId: string,
    partnerId: string,
    nudgeType: AccountabilityNudge['nudge_type'],
    message?: string,
    trigger?: Record<string, any>
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('accountability_nudges')
        .insert({
          partnership_id: partnershipId,
          nudger_id: user.id,
          nudged_id: partnerId,
          nudge_type: nudgeType,
          message,
          nudge_trigger: trigger || {}
        });

      if (error) throw error;

      toast.success('Nudge sent to your accountability partner!');
      return { error: null };
    } catch (error: any) {
      console.error('Error sending nudge:', error);
      toast.error('Failed to send nudge');
      return { error: error.message };
    }
  }, [user, partnerships, fetchRecentNudges]);

  const acknowledgeNudge = useCallback(async (nudgeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('accountability_nudges')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', nudgeId);

      if (error) throw error;

      setRecentNudges(prev => prev.filter(n => n.id !== nudgeId));
    } catch (error) {
      console.error('Error acknowledging nudge:', error);
    }
  }, [fetchRecentNudges]);

  const endPartnership = useCallback(async (partnershipId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('accountability_partnerships')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', partnershipId);

      if (error) throw error;

      toast.success('Partnership ended');
      fetchPartnerships();
      return { error: null };
    } catch (error: any) {
      console.error('Error ending partnership:', error);
      toast.error('Failed to end partnership');
      return { error: error.message };
    }
  }, [fetchPartnerships]);

  useEffect(() => {
    if (user) {
      fetchPartnerships();
      fetchRecentNudges();
    }
  }, [user, fetchPartnerships, fetchRecentNudges]);

  return {
    partnerships,
    pendingRequests,
    recentNudges,
    loading,
    sendPartnershipRequest,
    respondToPartnershipRequest,
    sendNudge,
    acknowledgeNudge,
    endPartnership,
    refetch: fetchPartnerships
  };
};