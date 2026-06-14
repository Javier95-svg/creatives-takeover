import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  BIZMAP_STAGE_ORDER,
  DEFAULT_CURRENT_STAGE,
  DEFAULT_HIGHEST_UNLOCKED_STAGE,
  PMF_REQUIRED_SIGNALS,
  getNextStage,
  getStageIndex,
  isStageUnlocked,
  maxStage,
  type BizMapStage,
} from '@/lib/bizmapStages';
import { mapFounderStageToBizMapStage, type FounderStageId } from '@/lib/stageDiagnostic';
import {
  getPmfResultsTableName,
  handlePmfResultsTableError,
  isPmfResultsTableAvailable,
} from '@/lib/pmfResultsTable';

interface UserProgressRow {
  user_id: string;
  current_stage: BizMapStage;
  highest_unlocked_stage: BizMapStage;
  identity_completed_at: string | null;
  prototype_completed_at: string | null;
  validating_completed_at: string | null;
  building_completed_at: string | null;
  launch_completed_at: string | null;
  traction_completed_at?: string | null;
  fundraising_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface CompletionSignals {
  identityCompletedAt: string | null;
  prototypeCompletedAt: string | null;
  validatingCompletedAt: string | null;
  buildingCompletedAt: string | null;
  launchCompletedAt: string | null;
  tractionCompletedAt: string | null;
  fundraisingCompletedAt: string | null;
}

const USER_PROGRESS_TABLE = 'user_progress' as any;
const WAITLIST_TABLE = 'waitlist_pages' as any;
const WAITLIST_SIGNUPS_TABLE = 'waitlist_signups' as any;
const PMF_EVIDENCE_TABLE = 'pmf_validation_evidence' as any;
const MVP_ARTIFACTS_TABLE = 'mvp_builder_artifacts' as any;
const GTM_PLANS_TABLE = 'gtm_plans' as any;
const ICP_RESULTS_TABLE = 'icp_analysis_results' as any;
const PMF_RESULTS_TABLE = getPmfResultsTableName();
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
  if (stage === 'LAUNCH') return !!row.launch_completed_at;
  if (stage === 'TRACTION') return !!row.traction_completed_at;
  return !!row.fundraising_completed_at;
}

function getCompletionUnlockedStage(progress: UserProgressRow): BizMapStage {
  let highest: BizMapStage = 'FUNDRAISING';

  if (progress.identity_completed_at && progress.prototype_completed_at) {
    highest = maxStage(highest, 'VALIDATING');
  }

  if (progress.validating_completed_at) {
    highest = maxStage(highest, 'BUILDING');
  }

  if (progress.building_completed_at) {
    highest = maxStage(highest, 'LAUNCH');
  }

  if (progress.launch_completed_at) {
    highest = maxStage(highest, 'TRACTION');
  }

  if (progress.traction_completed_at) {
    highest = maxStage(highest, 'FUNDRAISING');
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
      waitlistPagesRes,
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
        .select('id, published_at, exported_at, created_at, mark_ready_at, status')
        .eq('user_id', userId)
        .in('status', ['published', 'exported'])
        .order('updated_at', { ascending: false }),
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
      isPmfResultsTableAvailable()
        ? supabase
            .from(PMF_RESULTS_TABLE)
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (pmfLatestRes?.error) {
      handlePmfResultsTableError(pmfLatestRes.error);
    }

    const waitlistPages = (waitlistPagesRes.data as Array<{
      id: string;
      published_at: string | null;
      exported_at: string | null;
      created_at: string | null;
      mark_ready_at: string | null;
      status: string;
    }> | null) ?? [];
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

    let prototypeCompletedAt: string | null = null;
    if (waitlistPages.length > 0) {
      const readyAtDates = waitlistPages
        .map((page) => page.mark_ready_at)
        .filter((value): value is string => !!value);

      if (readyAtDates.length > 0) {
        prototypeCompletedAt = readyAtDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      } else {
        const pageIds = waitlistPages.map((page) => page.id);
        if (pageIds.length > 0) {
          const signupLatestRes = await supabase
            .from(WAITLIST_SIGNUPS_TABLE)
            .select('created_at')
            .in('waitlist_page_id', pageIds)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const signupAt = (signupLatestRes.data as { created_at?: string } | null)?.created_at ?? null;
          if (signupAt) {
            prototypeCompletedAt = signupAt;
          }
        }
      }
    }

    return {
      identityCompletedAt: (icpLatestRes.data as any)?.created_at ?? null,
      prototypeCompletedAt,
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
      tractionCompletedAt: null,
      fundraisingCompletedAt: null,
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
      traction_completed_at: maxDate(baseRow.traction_completed_at ?? null, signals.tractionCompletedAt),
      fundraising_completed_at: maxDate(baseRow.fundraising_completed_at ?? null, signals.fundraisingCompletedAt),
    };

    const completionUnlocked = getCompletionUnlockedStage(nextRow);
    nextRow.highest_unlocked_stage = completionUnlocked;

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
      nextRow.launch_completed_at !== baseRow.launch_completed_at ||
      nextRow.traction_completed_at !== baseRow.traction_completed_at ||
      nextRow.fundraising_completed_at !== baseRow.fundraising_completed_at;

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
          traction_completed_at: nextRow.traction_completed_at,
          fundraising_completed_at: nextRow.fundraising_completed_at,
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
      const progressRes = await supabase
        .from(USER_PROGRESS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      const profileRes = await supabase
        .from('profiles')
        .select('assigned_stage')
        .eq('id', user.id)
        .maybeSingle();

      const { data: existingData, error: selectError } = progressRes;

      if (selectError) {
        throw selectError;
      }

      let row = existingData as UserProgressRow | null;
      const assignedStage = (profileRes.data as { assigned_stage?: number | null } | null)?.assigned_stage;
      const assignedBizMapStage = assignedStage && assignedStage >= 1 && assignedStage <= 7
        ? mapFounderStageToBizMapStage(assignedStage as FounderStageId) as BizMapStage
        : null;

      if (!row) {
        const { data: insertedData, error: insertError } = await supabase
          .from(USER_PROGRESS_TABLE)
          .insert({
            user_id: user.id,
            current_stage: assignedBizMapStage ?? DEFAULT_CURRENT_STAGE,
            highest_unlocked_stage: 'FUNDRAISING' as BizMapStage,
          })
          .select('*')
          .single();

        if (insertError) {
          throw insertError;
        }

        row = insertedData as UserProgressRow;
      } else if (
        assignedBizMapStage &&
        row.current_stage === DEFAULT_CURRENT_STAGE &&
        !row.identity_completed_at &&
        !row.prototype_completed_at &&
        !row.validating_completed_at &&
        !row.building_completed_at &&
        !row.launch_completed_at
      ) {
        row = {
          ...row,
          current_stage: assignedBizMapStage,
          highest_unlocked_stage: 'FUNDRAISING' as BizMapStage,
        };
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
    void initializeProgress();
  }, [initializeProgress]);

  const refreshProgress = useCallback(async () => {
    await initializeProgress();
  }, [initializeProgress]);

  const setCurrentStage = useCallback(
    async (stage: BizMapStage): Promise<boolean> => {
      if (!progress || !user) return false;

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
    const effectiveHighestUnlocked: BizMapStage = 'FUNDRAISING';
    return {
      IDENTITY: {
        unlocked: effectiveHighestUnlocked ? isStageUnlocked('IDENTITY', effectiveHighestUnlocked) : true,
        completed: !!row?.identity_completed_at,
        completedAt: row?.identity_completed_at ?? null,
      },
      PROTOTYPE: {
        unlocked: effectiveHighestUnlocked ? isStageUnlocked('PROTOTYPE', effectiveHighestUnlocked) : true,
        completed: !!row?.prototype_completed_at,
        completedAt: row?.prototype_completed_at ?? null,
      },
      VALIDATING: {
        unlocked: effectiveHighestUnlocked ? isStageUnlocked('VALIDATING', effectiveHighestUnlocked) : false,
        completed: !!row?.validating_completed_at,
        completedAt: row?.validating_completed_at ?? null,
      },
      BUILDING: {
        unlocked: effectiveHighestUnlocked ? isStageUnlocked('BUILDING', effectiveHighestUnlocked) : false,
        completed: !!row?.building_completed_at,
        completedAt: row?.building_completed_at ?? null,
      },
      LAUNCH: {
        unlocked: effectiveHighestUnlocked ? isStageUnlocked('LAUNCH', effectiveHighestUnlocked) : false,
        completed: !!row?.launch_completed_at,
        completedAt: row?.launch_completed_at ?? null,
      },
      TRACTION: {
        unlocked: effectiveHighestUnlocked ? isStageUnlocked('TRACTION', effectiveHighestUnlocked) : false,
        completed: !!row?.traction_completed_at,
        completedAt: row?.traction_completed_at ?? null,
      },
      FUNDRAISING: {
        unlocked: effectiveHighestUnlocked ? isStageUnlocked('FUNDRAISING', effectiveHighestUnlocked) : false,
        completed: !!row?.fundraising_completed_at,
        completedAt: row?.fundraising_completed_at ?? null,
      },
    } as Record<BizMapStage, { unlocked: boolean; completed: boolean; completedAt: string | null }>;
  }, [progress]);

  const isToolRouteUnlocked = useCallback(
    () => true,
    [],
  );

  const getLockReasonForRoute = useCallback(
    () => null,
    [],
  );

  return {
    loading,
    error,
    progress,
    stageState,
    currentStage: progress?.current_stage ?? DEFAULT_CURRENT_STAGE,
    highestUnlockedStage: 'FUNDRAISING' as BizMapStage,
    hasFullBizMapAccess: true,
    refreshProgress,
    setCurrentStage,
    isToolRouteUnlocked,
    getLockReasonForRoute,
  };
};
