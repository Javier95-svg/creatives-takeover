import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { LaunchCohort, CohortMember, CohortCheckIn } from '@/types/founderOS';

export const useCohortMembership = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentCohort, setCurrentCohort] = useState<LaunchCohort | null>(null);
  const [membership, setMembership] = useState<CohortMember | null>(null);
  const [cohortMembers, setCohortMembers] = useState<CohortMember[]>([]);
  const [checkIns, setCheckIns] = useState<CohortCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's current cohort
  const fetchCohort = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get user's active membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('cohort_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      
      if (membershipError) throw membershipError;
      
      if (membershipData) {
        setMembership(membershipData as CohortMember);
        
        // Fetch cohort details
        const { data: cohortData, error: cohortError } = await supabase
          .from('launch_cohorts')
          .select('*')
          .eq('id', membershipData.cohort_id)
          .single();
        
        if (cohortError) throw cohortError;
        setCurrentCohort(cohortData as LaunchCohort);

        // Fetch other cohort members
        const { data: membersData, error: membersError } = await supabase
          .from('cohort_members')
          .select('*')
          .eq('cohort_id', membershipData.cohort_id)
          .eq('status', 'active');
        
        if (membersError) throw membersError;
        setCohortMembers((membersData as CohortMember[]) || []);

        // Fetch user's check-ins
        const { data: checkInsData, error: checkInsError } = await supabase
          .from('cohort_checkins')
          .select('*')
          .eq('user_id', user.id)
          .eq('cohort_id', membershipData.cohort_id)
          .order('week_number', { ascending: false });
        
        if (checkInsError) throw checkInsError;
        setCheckIns((checkInsData as CohortCheckIn[]) || []);
      }
    } catch (err) {
      console.error('Error fetching cohort:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cohort');
    } finally {
      setLoading(false);
    }
  };

  // Join a cohort
  const joinCohort = async (cohortId: string, roadmapId?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to join a cohort",
        variant: "destructive",
      });
      return false;
    }

    try {
      setLoading(true);

      const { error: insertError } = await supabase
        .from('cohort_members')
        .insert({
          cohort_id: cohortId,
          user_id: user.id,
          roadmap_id: roadmapId,
          current_milestone: 'validate',
        });
      
      if (insertError) throw insertError;

      toast({
        title: "Welcome to the Cohort!",
        description: "You've successfully joined the launch cohort",
      });

      await fetchCohort();
      return true;
    } catch (err) {
      console.error('Error joining cohort:', err);
      toast({
        title: "Failed to Join",
        description: err instanceof Error ? err.message : 'Could not join cohort',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Submit weekly check-in
  const submitCheckIn = async (
    weekNumber: number,
    wins: string[],
    blockers: string[],
    nextWeekGoals: string[],
    helpNeeded?: string,
    sharePublicly = false
  ) => {
    if (!user || !currentCohort) {
      toast({
        title: "Error",
        description: "No active cohort found",
        variant: "destructive",
      });
      return false;
    }

    try {
      setLoading(true);

      const { data, error: insertError } = await supabase
        .from('cohort_checkins')
        .insert({
          cohort_id: currentCohort.id,
          user_id: user.id,
          week_number: weekNumber,
          checkin_date: new Date().toISOString().split('T')[0],
          wins,
          blockers,
          next_week_goals: nextWeekGoals,
          help_needed: helpNeeded,
          shared_publicly: sharePublicly,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;

      // Update membership check-in count
      if (membership) {
        const newCheckInCount = membership.weekly_checkins_completed + 1;
        const newAttendanceRate = (newCheckInCount / membership.total_checkins_expected) * 100;

        await supabase
          .from('cohort_members')
          .update({
            weekly_checkins_completed: newCheckInCount,
            attendance_rate: newAttendanceRate,
          })
          .eq('id', membership.id);

        setMembership(prev => prev ? {
          ...prev,
          weekly_checkins_completed: newCheckInCount,
          attendance_rate: newAttendanceRate,
        } : null);
      }

      setCheckIns(prev => [data as CohortCheckIn, ...prev]);

      toast({
        title: "Check-In Submitted",
        description: "Your weekly progress has been recorded",
      });

      return true;
    } catch (err) {
      console.error('Error submitting check-in:', err);
      toast({
        title: "Submission Failed",
        description: err instanceof Error ? err.message : 'Could not submit check-in',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get available cohorts to join
  const getAvailableCohorts = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('launch_cohorts')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true });
      
      if (fetchError) throw fetchError;
      return (data as LaunchCohort[]) || [];
    } catch (err) {
      console.error('Error fetching cohorts:', err);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      void fetchCohort();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [user]);

  return {
    currentCohort,
    membership,
    cohortMembers,
    checkIns,
    loading,
    error,
    joinCohort,
    submitCheckIn,
    getAvailableCohorts,
    refreshCohort: fetchCohort,
  };
};
