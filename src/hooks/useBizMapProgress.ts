import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  BIZMAP_STAGE_ORDER,
  DEFAULT_CURRENT_STAGE,
  DEFAULT_HIGHEST_UNLOCKED_STAGE,
  PMF_REQUIRED_SIGNALS,
  getNextStage,
  getRequiredUnlockMessage,
  getStageByRoute,
  getStageIndex,
  isStageUnlocked,
  maxStage,
  type BizMapStage,
} from '@/lib/bizmapStages';

interface UserProgressRow {
  user_id: string;
  current_stage: BizMapStage;
  highest_unlocked_stage: BizMapStage;
  identity_completed_at: string | null;
  prototype_completed_at: string | null;
  validating_completed_at: string | null;
  building_completed_at: string | null;
  launch_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CompletionSignals {
  identityCompletedAt: string | null;
  prototypeCompletedAt: string | null;
  validatingCompletedAt: string | null;
  buildingCompletedAt: string | null;
  launchCompletedAt: string | null;
}

const USER_PROGRESS_TABLE = 'user_progress' as any;
const WAITLIST_TABLE = 'waitlist_pages' as any;
const PMF_EVIDENCE_TABLE = 'pmf_validation_evidence' as any;
const MVP_ARTIFACTS_TABLE = 'mvp_builder_artifacts' as any;
const GTM_PLANS_TABLE = 'gtm_plans' as any;
const ICP_RESULTS_TABLE = 'icp_analysis_results' as any;
const PMF_RESULTS_TABLE = 'pmf_analysis_results' as any;
const TECH_STACK_TABLE = 'tech_stack_reports';

function normalizeStage(value: unknown, fallback: BizMapStage): BizMapStage {
  if (typeof value !== 'string') return fallback;
  if ((BIZMAP_STAGE_ORDER as readonly string[]).includes(value)) {
    return value as BizMapStage;
  }
  return fallback;
}

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function isCompleted(row: UserProgressRow, stage: BizMapStage): boolean {
  if (stage === 'IDENTITY') return !!row.identity_completed_at;
  if (stage === 'PROTOTYPE') return !!row.prototype_completed_at;
  if (stage === 'VALIDATING') return !!row.validating_completed_at;
  if (stage === 'BUILDING') return !!row.building_completed_at;
  return !!row.launch_completed_at;
}

function getCompletionUnlockedStage(progress: UserProgressRow): BizMapStage {
  let highest = DEFAULT_HIGHEST_UNLOCKED_STAGE;

  if (progress.identity_completed_at && progress.prototype_completed_at) {
    highest = maxStage(highest, 'VALIDATING');
  }

  if (progress.validating_completed_at) {
    highest = maxStage(highest, 'BUILDING');
  }

  if (progress.building_completed_at) {
    highest = maxStage(highest, 'LAUNCH');
  }

  return highest;
}

export const useBizMapProgress = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UserProgressRow | null>(null);

  const fetchCompletionSignals = useCallback(async (userId: string): Promise<CompletionSignals> => {
    const [
      icpLatestRes,
      waitlistLatestRes,
      pmfEvidenceRes,
      mvpLatestRes,
      techStackLatestRes,
      gtmLatestRes,
      pmfLatestRes,
    ] = await Promise.all([
      supabase
        .from(ICP_RESULTS_TABLE)
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from(WAITLIST_TABLE)
        .select('published_at, exported_at, created_at, status')
        .eq('user_id', userId)
        .in('status', ['published', 'exported'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from(PMF_EVIDENCE_TABLE)
        .select('checklist_saved_at, interview_notes_count, survey_results_count, required_signals')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from(MVP_ARTIFACTS_TABLE)
        .select('saved_at, created_at, status')
        .eq('user_id', userId)
        .eq('status', 'saved')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from(TECH_STACK_TABLE)
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from(GTM_PLANS_TABLE)
        .select('saved_at, exported_at, created_at, status')
        .eq('user_id', userId)
        .in('status', ['saved', 'exported'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from(PMF_RESULTS_TABLE)
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const waitlistData = waitlistLatestRes.data as any;
    const pmfEvidenceData = pmfEvidenceRes.data as any;
    const mvpData = mvpLatestRes.data as any;
    const gtmData = gtmLatestRes.data as any;
    const techStackData = techStackLatestRes.data as any;

    const validationSignals =
      Number(pmfEvidenceData?.interview_notes_count ?? 0) +
      Number(pmfEvidenceData?.survey_results_count ?? 0);
    const requiredSignals = Number(pmfEvidenceData?.required_signals ?? PMF_REQUIRED_SIGNALS);

    const validatingCompleted =
      !!pmfEvidenceData?.checklist_saved_at && validationSignals >= requiredSignals;

    const buildingCompleted = !!mvpData && !!techStackData;

    return {
      identityCompletedAt: (icpLatestRes.data as any)?.created_at ?? null,
      prototypeCompletedAt:
        waitlistData?.published_at ?? waitlistData?.exported_at ?? (waitlistData ? waitlistData.created_at : null),
      validatingCompletedAt:
        validatingCompleted
          ? maxDate(
              (pmfLatestRes.data as any)?.created_at ?? null,
              pmfEvidenceData?.checklist_saved_at ?? null,
            )
          : null,
      buildingCompletedAt:
        buildingCompleted
          ? maxDate(mvpData?.saved_at ?? mvpData?.created_at ?? null, techStackData?.created_at ?? null)
          : null,
      launchCompletedAt:
        gtmData?.exported_at ?? gtmData?.saved_at ?? (gtmData ? gtmData.created_at : null),
    };
  }, []);

  const syncProgress = useCallback(async (baseRow: UserProgressRow): Promise<UserProgressRow> => {
    const signals = await fetchCompletionSignals(baseRow.user_id);

    const nextRow: UserProgressRow = {
      ...baseRow,
      current_stage: normalizeStage(baseRow.current_stage, DEFAULT_CURRENT_STAGE),
      highest_unlocked_stage: normalizeStage(baseRow.highest_unlocked_stage, DEFAULT_HIGHEST_UNLOCKED_STAGE),
      identity_completed_at: maxDate(baseRow.identity_completed_at, signals.identityCompletedAt),
      prototype_completed_at: maxDate(baseRow.prototype_completed_at, signals.prototypeCompletedAt),
      validating_completed_at: maxDate(baseRow.validating_completed_at, signals.validatingCompletedAt),
      building_completed_at: maxDate(baseRow.building_completed_at, signals.buildingCompletedAt),
      launch_completed_at: maxDate(baseRow.launch_completed_at, signals.launchCompletedAt),
    };

    const completionUnlocked = getCompletionUnlockedStage(nextRow);
    nextRow.highest_unlocked_stage = maxStage(nextRow.highest_unlocked_stage, completionUnlocked);

    if (getStageIndex(nextRow.current_stage) > getStageIndex(nextRow.highest_unlocked_stage)) {
      nextRow.current_stage = nextRow.highest_unlocked_stage;
    }

    while (isCompleted(nextRow, nextRow.current_stage)) {
      const followingStage = getNextStage(nextRow.current_stage);
      if (!followingStage || !isStageUnlocked(followingStage, nextRow.highest_unlocked_stage)) {
        break;
      }
      nextRow.current_stage = followingStage;
    }

    const hasChanges =
      nextRow.current_stage !== baseRow.current_stage ||
      nextRow.highest_unlocked_stage !== baseRow.highest_unlocked_stage ||
      nextRow.identity_completed_at !== baseRow.identity_completed_at ||
      nextRow.prototype_completed_at !== baseRow.prototype_completed_at ||
      nextRow.validating_completed_at !== baseRow.validating_completed_at ||
      nextRow.building_completed_at !== baseRow.building_completed_at ||
      nextRow.launch_completed_at !== baseRow.launch_completed_at;

    if (hasChanges) {
      const { data } = await supabase
        .from(USER_PROGRESS_TABLE)
        .update({
          current_stage: nextRow.current_stage,
          highest_unlocked_stage: nextRow.highest_unlocked_stage,
          identity_completed_at: nextRow.identity_completed_at,
          prototype_completed_at: nextRow.prototype_completed_at,
          validating_completed_at: nextRow.validating_completed_at,
          building_completed_at: nextRow.building_completed_at,
          launch_completed_at: nextRow.launch_completed_at,
        })
        .eq('user_id', nextRow.user_id)
        .select('*')
        .single();

      if (data) {
        return data as UserProgressRow;
      }
    }

    return nextRow;
  }, [fetchCompletionSignals]);

  const initializeProgress = useCallback(async () => {
    if (!user) {
      setProgress(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: existingData, error: selectError } = await supabase
        .from(USER_PROGRESS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      let row = existingData as UserProgressRow | null;

      if (!row) {
        const { data: insertedData, error: insertError } = await supabase
          .from(USER_PROGRESS_TABLE)
          .insert({
            user_id: user.id,
            current_stage: DEFAULT_CURRENT_STAGE,
            highest_unlocked_stage: DEFAULT_HIGHEST_UNLOCKED_STAGE,
          })
          .select('*')
          .single();

        if (insertError) {
          throw insertError;
        }

        row = insertedData as UserProgressRow;
      }

      const synced = await syncProgress(row);
      setProgress(synced);
    } catch (err) {
      console.error('Failed to load BizMap progress:', err);
      setError('Unable to load BizMap progress right now.');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [syncProgress, user]);

  useEffect(() => {
    initializeProgress();
  }, [initializeProgress]);

  const refreshProgress = useCallback(async () => {
    await initializeProgress();
  }, [initializeProgress]);

  const setCurrentStage = useCallback(
    async (stage: BizMapStage): Promise<boolean> => {
      if (!progress || !user) return false;
      if (!isStageUnlocked(stage, progress.highest_unlocked_stage)) return false;

      const { data, error: updateError } = await supabase
        .from(USER_PROGRESS_TABLE)
        .update({ current_stage: stage })
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Failed to set current BizMap stage:', updateError);
        return false;
      }

      setProgress(data as UserProgressRow);
      return true;
    },
    [progress, user],
  );

  const stageState = useMemo(() => {
    const row = progress;
    return {
      IDENTITY: {
        unlocked: row ? isStageUnlocked('IDENTITY', row.highest_unlocked_stage) : true,
        completed: !!row?.identity_completed_at,
        completedAt: row?.identity_completed_at ?? null,
      },
      PROTOTYPE: {
        unlocked: row ? isStageUnlocked('PROTOTYPE', row.highest_unlocked_stage) : true,
        completed: !!row?.prototype_completed_at,
        completedAt: row?.prototype_completed_at ?? null,
      },
      VALIDATING: {
        unlocked: row ? isStageUnlocked('VALIDATING', row.highest_unlocked_stage) : false,
        completed: !!row?.validating_completed_at,
        completedAt: row?.validating_completed_at ?? null,
      },
      BUILDING: {
        unlocked: row ? isStageUnlocked('BUILDING', row.highest_unlocked_stage) : false,
        completed: !!row?.building_completed_at,
        completedAt: row?.building_completed_at ?? null,
      },
      LAUNCH: {
        unlocked: row ? isStageUnlocked('LAUNCH', row.highest_unlocked_stage) : false,
        completed: !!row?.launch_completed_at,
        completedAt: row?.launch_completed_at ?? null,
      },
    } as Record<BizMapStage, { unlocked: boolean; completed: boolean; completedAt: string | null }>;
  }, [progress]);

  const isToolRouteUnlocked = useCallback(
    (route: string) => {
      if (!progress) return true;
      const stage = getStageByRoute(route);
      if (!stage) return true;
      return isStageUnlocked(stage, progress.highest_unlocked_stage);
    },
    [progress],
  );

  const getLockReasonForRoute = useCallback(
    (route: string) => {
      if (!progress) return null;
      const stage = getStageByRoute(route);
      if (!stage) return null;
      if (isStageUnlocked(stage, progress.highest_unlocked_stage)) return null;
      return getRequiredUnlockMessage(stage);
    },
    [progress],
  );

  return {
    loading,
    error,
    progress,
    stageState,
    currentStage: progress?.current_stage ?? DEFAULT_CURRENT_STAGE,
    highestUnlockedStage: progress?.highest_unlocked_stage ?? DEFAULT_HIGHEST_UNLOCKED_STAGE,
    refreshProgress,
    setCurrentStage,
    isToolRouteUnlocked,
    getLockReasonForRoute,
  };
};
