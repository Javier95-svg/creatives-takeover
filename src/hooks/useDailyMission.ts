import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { getLocalDateString } from '@/lib/dailyGoalPrompt';
import { BIZMAP_STAGES, type BizMapStage } from '@/lib/bizmapStages';
import { recordRecommendationOutcome } from '@/lib/recommendationLearning';

type DailyMission = Database['public']['Tables']['daily_missions']['Row'];

const STAGE_FALLBACK_LABEL = 'Stage I - Identity';

function getStageLabel(stage: BizMapStage | null | undefined) {
  if (!stage) return STAGE_FALLBACK_LABEL;
  const match = BIZMAP_STAGES.find((item) => item.id === stage);
  if (!match) return STAGE_FALLBACK_LABEL;
  return `Stage ${match.numeral} - ${match.title}`;
}

interface UseDailyMissionOptions {
  showErrorToast?: boolean;
}

export const useDailyMission = (options: UseDailyMissionOptions = {}) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const errorToastShownRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);
  const showErrorToast = options.showErrorToast ?? false;

  const loadMission = useCallback(async () => {
    if (!userId) {
      loadedUserIdRef.current = null;
      setMission(null);
      setLoading(false);
      return;
    }

    if (loadedUserIdRef.current !== userId) {
      setLoading(true);
    }
    const missionDate = getLocalDateString();

    try {
      const { data: existingMission, error: fetchError } = await supabase
        .from('daily_missions')
        .select('*')
        .eq('user_id', userId)
        .eq('mission_date', missionDate)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingMission) {
        setMission(existingMission);
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-daily-mission', {
        body: { mission_date: missionDate },
      });

      if (error) {
        throw error;
      }

      setMission(data?.mission ?? null);
    } catch (error) {
      console.error('Failed to load daily mission:', error);
      if (showErrorToast && !errorToastShownRef.current) {
        errorToastShownRef.current = true;
        toast.error('Failed to load today\'s mission');
      }
    } finally {
      loadedUserIdRef.current = userId;
      setLoading(false);
    }
  }, [showErrorToast, userId]);

  useEffect(() => {
    void loadMission();
  }, [loadMission]);

  const markAsDone = useCallback(async () => {
    if (!userId || !mission || mission.completed) return;

    setCompleting(true);

    try {
      const { data, error } = await supabase
        .from('daily_missions')
        .update({ completed: true })
        .eq('id', mission.id)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      setMission(data);
      void recordRecommendationOutcome({
        recommendationKey: `daily_mission:${mission.id}`,
        surface: 'daily_mission',
        outcomeType: 'completed',
      }).catch(() => {
        // Mission completion must not depend on the additive learning pipeline.
      });
      toast.success('Today\'s mission marked as done');
    } catch (error) {
      console.error('Failed to complete daily mission:', error);
      toast.error('Failed to update today\'s mission');
    } finally {
      setCompleting(false);
    }
  }, [mission, userId]);

  return {
    mission,
    loading,
    completing,
    markAsDone,
    refreshMission: loadMission,
    stageLabel: getStageLabel(mission?.stage as BizMapStage | undefined),
  };
};
