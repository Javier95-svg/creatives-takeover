import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JourneyProgress {
  id: string;
  user_id: string;
  plan_it_completed: boolean;
  plan_it_completed_at: string | null;
  refine_it_shared: boolean;
  refine_it_shared_at: string | null;
  refine_it_feedback_received: boolean;
  refine_it_feedback_received_at: string | null;
  propel_viewed: boolean;
  propel_viewed_at: string | null;
  propel_applied: boolean;
  propel_applied_at: string | null;
}

type JourneyStep = 'plan_it' | 'refine_it_shared' | 'refine_it_feedback' | 'propel_viewed' | 'propel_applied';

export const useJourneyProgress = () => {
  const [progress, setProgress] = useState<JourneyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_journey_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProgress(data);
      } else {
        // Create initial progress record
        const { data: newProgress, error: insertError } = await supabase
          .from('user_journey_progress')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setProgress(newProgress);
      }
    } catch (error: any) {
      console.error('Error fetching journey progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async (step: JourneyStep, completed: boolean = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const updateData: any = {};
      
      switch (step) {
        case 'plan_it':
          updateData.plan_it_completed = completed;
          if (completed) updateData.plan_it_completed_at = new Date().toISOString();
          break;
        case 'refine_it_shared':
          updateData.refine_it_shared = completed;
          if (completed) updateData.refine_it_shared_at = new Date().toISOString();
          break;
        case 'refine_it_feedback':
          updateData.refine_it_feedback_received = completed;
          if (completed) updateData.refine_it_feedback_received_at = new Date().toISOString();
          break;
        case 'propel_viewed':
          updateData.propel_viewed = completed;
          if (completed) updateData.propel_viewed_at = new Date().toISOString();
          break;
        case 'propel_applied':
          updateData.propel_applied = completed;
          if (completed) updateData.propel_applied_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('user_journey_progress')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchProgress();
      return true;
    } catch (error: any) {
      console.error('Error updating journey progress:', error);
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const getCurrentStage = (): 'plan' | 'refine' | 'propel' | 'complete' => {
    if (!progress) return 'plan';
    
    if (progress.propel_applied) return 'complete';
    if (progress.refine_it_feedback_received) return 'propel';
    if (progress.plan_it_completed) return 'refine';
    return 'plan';
  };

  const getCompletionPercentage = (): number => {
    if (!progress) return 0;
    
    let completed = 0;
    if (progress.plan_it_completed) completed += 20;
    if (progress.refine_it_shared) completed += 20;
    if (progress.refine_it_feedback_received) completed += 20;
    if (progress.propel_viewed) completed += 20;
    if (progress.propel_applied) completed += 20;
    
    return completed;
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  return {
    progress,
    isLoading,
    updateProgress,
    getCurrentStage,
    getCompletionPercentage,
    refreshProgress: fetchProgress
  };
};
