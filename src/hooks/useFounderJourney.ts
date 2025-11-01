import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type JourneyStage = 'ideation' | 'validation' | 'building' | 'launching' | 'scaling';

interface JourneyData {
  stage: JourneyStage;
  lastCheckinDate: Date | null;
  milestonesAchieved: any[];
}

export const useFounderJourney = () => {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadJourney = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('founder_journey_stage, last_checkin_date')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Get milestones from recent chat sessions
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('milestones_achieved')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      const allMilestones = sessions?.flatMap(s => Array.isArray(s.milestones_achieved) ? s.milestones_achieved : []) || [];

      setJourney({
        stage: (profile.founder_journey_stage as JourneyStage) || 'ideation',
        lastCheckinDate: profile.last_checkin_date ? new Date(profile.last_checkin_date) : null,
        milestonesAchieved: allMilestones,
      });
    } catch (error) {
      console.error('Error loading founder journey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateJourneyStage = async (stage: JourneyStage) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ founder_journey_stage: stage })
        .eq('id', user.id);

      if (error) throw error;

      setJourney(prev => prev ? { ...prev, stage } : null);
      toast.success(`Journey stage updated to ${stage}`);
      return true;
    } catch (error) {
      console.error('Error updating journey stage:', error);
      toast.error('Failed to update journey stage');
      return false;
    }
  };

  const recordCheckin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('profiles')
        .update({ last_checkin_date: today })
        .eq('id', user.id);

      if (error) throw error;

      setJourney(prev => prev ? { ...prev, lastCheckinDate: new Date(today) } : null);
      return true;
    } catch (error) {
      console.error('Error recording check-in:', error);
      return false;
    }
  };

  const addMilestone = async (sessionId: string, milestone: any) => {
    try {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('milestones_achieved')
        .eq('id', sessionId)
        .single();

      const currentMilestones = Array.isArray(session?.milestones_achieved) ? session.milestones_achieved : [];
      const updatedMilestones = [...currentMilestones, { ...milestone, achieved_at: new Date().toISOString() }];

      const { error } = await supabase
        .from('chat_sessions')
        .update({ milestones_achieved: updatedMilestones })
        .eq('id', sessionId);

      if (error) throw error;

      setJourney(prev => prev ? {
        ...prev,
        milestonesAchieved: [...prev.milestonesAchieved, milestone]
      } : null);

      return true;
    } catch (error) {
      console.error('Error adding milestone:', error);
      return false;
    }
  };

  useEffect(() => {
    loadJourney();
  }, []);

  return {
    journey,
    isLoading,
    updateJourneyStage,
    recordCheckin,
    addMilestone,
    reload: loadJourney,
  };
};
