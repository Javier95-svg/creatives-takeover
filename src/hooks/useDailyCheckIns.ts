import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DailyCheckInData {
  id: string;
  user_id: string;
  sprint_id: string;
  check_in_date: string;
  progress_summary: string;
  completed_tasks: string[];
  blockers: string | null;
  mood_rating: number;
  energy_level: number;
  streak_count: number;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicCheckInData extends DailyCheckInData {
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  sprints: {
    title: string;
  } | null;
}

export const useDailyCheckIns = (sprintId?: string) => {
  const [checkIns, setCheckIns] = useState<DailyCheckInData[]>([]);
  const [publicCheckIns, setPublicCheckIns] = useState<PublicCheckInData[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckInData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user's check-ins for a specific sprint
  const fetchCheckIns = async (targetSprintId?: string) => {
    if (!user) return;
    
    const searchSprintId = targetSprintId || sprintId;
    if (!searchSprintId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('sprint_id', searchSprintId)
        .order('check_in_date', { ascending: false });

      if (fetchError) throw fetchError;

      setCheckIns(data || []);

      // Check if user has checked in today
      const today = new Date().toISOString().split('T')[0];
      const todayData = data?.find(checkIn => checkIn.check_in_date === today) || null;
      setTodayCheckIn(todayData);

    } catch (err: any) {
      console.error('Error fetching check-ins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch public check-ins from community sprints
  const fetchPublicCheckIns = async (limit: number = 20) => {
    setLoading(true);
    setError(null);

    try {
      // First get public sprint IDs
      const { data: publicSprints, error: sprintsError } = await supabase
        .from('sprints')
        .select('id, title')
        .eq('is_public', true)
        .eq('community_visible', true);

      if (sprintsError) throw sprintsError;
      
      if (!publicSprints || publicSprints.length === 0) {
        setPublicCheckIns([]);
        return;
      }

      const publicSprintIds = publicSprints.map(s => s.id);

      // Get check-ins for public sprints
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('daily_check_ins')
        .select('*')
        .in('sprint_id', publicSprintIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (checkInsError) throw checkInsError;

      if (!checkInsData || checkInsData.length === 0) {
        setPublicCheckIns([]);
        return;
      }

      // Get profile data for the users
      const userIds = [...new Set(checkInsData.map(c => c.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const enrichedCheckIns: PublicCheckInData[] = checkInsData.map(checkIn => {
        const profile = profilesData?.find(p => p.id === checkIn.user_id);
        const sprint = publicSprints.find(s => s.id === checkIn.sprint_id);
        
        return {
          ...checkIn,
          profiles: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          } : null,
          sprints: sprint ? {
            title: sprint.title
          } : null
        };
      });

      setPublicCheckIns(enrichedCheckIns);

    } catch (err: any) {
      console.error('Error fetching public check-ins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new check-in
  const createCheckIn = async (checkInData: {
    sprint_id: string;
    progress_summary: string;
    completed_tasks: string[];
    blockers?: string;
    mood_rating: number;
    energy_level: number;
    photo_url?: string;
  }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate streak count based on previous check-ins
      const streakCount = calculateStreak(checkIns) + 1;

      const newCheckIn = {
        user_id: user.id,
        check_in_date: today,
        streak_count: streakCount,
        ...checkInData,
      };

      const { data, error: insertError } = await supabase
        .from('daily_check_ins')
        .insert(newCheckIn)
        .select()
        .single();

      if (insertError) throw insertError;

      // Update sprint accountability
      await supabase
        .from('sprint_accountability')
        .upsert({
          user_id: user.id,
          sprint_id: checkInData.sprint_id,
          last_checkin_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,sprint_id'
        });

      // Refresh check-ins
      await fetchCheckIns(checkInData.sprint_id);

      toast({
        title: "Check-in Complete! 🎉",
        description: `Day ${streakCount} of your accountability streak!`,
      });

      return data;

    } catch (err: any) {
      console.error('Error creating check-in:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to submit check-in. Please try again.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Calculate streak based on check-ins
  const calculateStreak = (checkInData: DailyCheckInData[]): number => {
    if (checkInData.length === 0) return 0;
    
    const sortedCheckIns = [...checkInData].sort((a, b) => 
      new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime()
    );
    
    let streak = 0;
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday
    
    for (const checkIn of sortedCheckIns) {
      const checkInDate = new Date(checkIn.check_in_date);
      const expectedDate = new Date(currentDate.toISOString().split('T')[0]);
      
      if (checkInDate.getTime() === expectedDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Get streak for current check-ins
  const getCurrentStreak = (): number => {
    return calculateStreak(checkIns);
  };

  // Check if user has checked in today
  const hasCheckedInToday = (): boolean => {
    return !!todayCheckIn;
  };

  // Get recent check-ins for streak visualization
  const getRecentCheckIns = (days: number = 7): DailyCheckInData[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return checkIns.filter(checkIn => 
      new Date(checkIn.check_in_date) >= cutoffDate
    );
  };

  // Auto-fetch check-ins when sprint changes
  useEffect(() => {
    if (sprintId) {
      void fetchCheckIns();
    }
  }, [user, sprintId]);

  return {
    checkIns,
    publicCheckIns,
    todayCheckIn,
    loading,
    error,
    fetchCheckIns,
    fetchPublicCheckIns,
    createCheckIn,
    getCurrentStreak,
    hasCheckedInToday,
    getRecentCheckIns,
  };
};