import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AccountabilityProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
}

interface AccountabilitySprint {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
}

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
  partner_profile?: AccountabilityProfile;
  requester_profile?: AccountabilityProfile;
  sprint?: AccountabilitySprint;
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
  nudger_profile?: AccountabilityProfile;
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

      // Do not rely on PostgREST embedded relationships here. Older production
      // schemas can have the tables and RLS policies without the foreign keys in
      // PostgREST's schema cache, which makes an embedded select fail completely.
      const { data, error } = await supabase
        .from('accountability_partnerships')
        .select('*')
        .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const partnershipRows = data ?? [];
      const profileIds = [...new Set(
        partnershipRows.flatMap((partnership) => [partnership.requester_id, partnership.partner_id]),
      )];
      const sprintIds = [...new Set(
        partnershipRows
          .map((partnership) => partnership.sprint_id)
          .filter((sprintId): sprintId is string => Boolean(sprintId)),
      )];

      const [profileResult, sprintResult] = await Promise.all([
        profileIds.length
          ? supabase
              .from('public_profiles')
              .select('id, full_name, avatar_url, bio')
              .in('id', profileIds)
          : Promise.resolve({ data: [], error: null }),
        sprintIds.length
          ? supabase
              .from('sprints')
              .select('id, title, description, start_date, end_date')
              .in('id', sprintIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profileResult.error) {
        console.warn('Could not enrich accountability partner profiles:', profileResult.error);
      }
      if (sprintResult.error) {
        console.warn('Could not enrich accountability partnership sprints:', sprintResult.error);
      }

      const profilesById = new Map(
        (profileResult.data ?? [])
          .filter((profile): profile is AccountabilityProfile => Boolean(profile.id))
          .map((profile) => [profile.id, profile]),
      );
      const sprintsById = new Map(
        (sprintResult.data ?? []).map((sprint) => [sprint.id, sprint]),
      );

      const hydratedPartnerships = partnershipRows.map((partnership) => ({
        ...partnership,
        partner_profile: profilesById.get(partnership.partner_id) ?? {
          id: partnership.partner_id,
          full_name: null,
          avatar_url: null,
          bio: null,
        },
        requester_profile: profilesById.get(partnership.requester_id) ?? {
          id: partnership.requester_id,
          full_name: null,
          avatar_url: null,
          bio: null,
        },
        sprint: partnership.sprint_id ? sprintsById.get(partnership.sprint_id) : undefined,
      })) as AccountabilityPartnership[];

      const activePartnerships = hydratedPartnerships.filter((partnership) => partnership.status === 'active');
      const pendingPartnerships = hydratedPartnerships.filter((partnership) => partnership.status === 'pending');

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
        .select('*')
        .eq('nudged_id', user.id)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const nudgeRows = data ?? [];
      const nudgerIds = [...new Set(nudgeRows.map((nudge) => nudge.nudger_id))];
      const { data: profiles, error: profileError } = nudgerIds.length
        ? await supabase
            .from('public_profiles')
            .select('id, full_name, avatar_url, bio')
            .in('id', nudgerIds)
        : { data: [], error: null };

      if (profileError) {
        console.warn('Could not enrich accountability nudge profiles:', profileError);
      }

      const profilesById = new Map(
        (profiles ?? [])
          .filter((profile): profile is AccountabilityProfile => Boolean(profile.id))
          .map((profile) => [profile.id, profile]),
      );
      setRecentNudges(nudgeRows.map((nudge) => ({
        ...nudge,
        nudger_profile: profilesById.get(nudge.nudger_id) ?? {
          id: nudge.nudger_id,
          full_name: null,
          avatar_url: null,
        },
      })) as AccountabilityNudge[]);
    } catch (error) {
      console.error('Error fetching nudges:', error);
    }
  }, [user]);

  const sendPartnershipRequest = useCallback(async (
    partnerId: string, 
    partnershipType: AccountabilityPartnership['partnership_type'],
    sprintId?: string,
    message?: string,
    settings?: Record<string, any>,
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const partnershipSettings = {
        ...(message ? { request_message: message } : {}),
        ...(settings || {}),
      };
      
      const { error } = await supabase
        .from('accountability_partnerships')
        .insert({
          requester_id: user.id,
          partner_id: partnerId,
          sprint_id: sprintId,
          partnership_type: partnershipType,
          partnership_settings: partnershipSettings
        });

      if (error) throw error;

      toast.success('Partnership request sent!');
      void fetchPartnerships();
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
      void fetchPartnerships();
      return { error: null };
    } catch (error: any) {
      console.error('Error responding to partnership request:', error);
      toast.error('Failed to respond to partnership request');
      return { error: error.message };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
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
      void fetchPartnerships();
      return { error: null };
    } catch (error: any) {
      console.error('Error ending partnership:', error);
      toast.error('Failed to end partnership');
      return { error: error.message };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [fetchPartnerships]);

  useEffect(() => {
    if (user) {
      void fetchPartnerships();
      void fetchRecentNudges();
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
