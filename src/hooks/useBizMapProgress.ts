import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_CURRENT_STAGE,
  DEFAULT_HIGHEST_UNLOCKED_STAGE,
  isStageUnlocked,
  type BizMapStage,
} from '@/lib/bizmapStages';
import {
  deriveFounderProgress,
  type FundraisingOverlayStatus,
  type JourneyOutcomeSignal,
} from '@/lib/founderProgress';

interface UserProgressRow {
  user_id: string;
  current_stage: BizMapStage;
  highest_unlocked_stage: BizMapStage;
  identity_completed_at: string | null;
  prototype_completed_at: string | null;
  validating_completed_at: string | null;
  building_completed_at: string | null;
  launch_completed_at: string | null;
  traction_completed_at: string | null;
  /** Legacy-only: fundraising is now an overlay, not an operating-stage completion. */
  fundraising_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FundraisingOverlay {
  eligible: boolean;
  status: FundraisingOverlayStatus;
  readinessCompletedAt: string | null;
  pitchDeckCompletedAt: string | null;
  savedInvestorCount: number;
}

const USER_PROGRESS_TABLE = 'user_progress' as any;

function dateFromRow(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  return typeof row.updated_at === 'string' ? row.updated_at
    : typeof row.created_at === 'string' ? row.created_at
      : null;
}

export const useBizMapProgress = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UserProgressRow | null>(null);
  const [fundraisingOverlay, setFundraisingOverlay] = useState<FundraisingOverlay>({
    eligible: false, status: 'not_eligible', readinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0,
  });
  const loadedUserIdRef = useRef<string | null>(null);

  const evaluate = useCallback(async (baseRow: UserProgressRow) => {
    const [outcomesRes, sprintRes, readinessRes, pitchRes, prospectsRes] = await Promise.all([
      (supabase as any).from('journey_outcomes').select('tool,status,completed_at,verified_at,reviewed_at,updated_at')
        .eq('user_id', baseRow.user_id).order('updated_at', { ascending: false }),
      (supabase as any).from('first_customer_sprints').select('completed_at,updated_at').eq('founder_id', baseRow.user_id)
        .eq('status', 'completed').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      // Legacy readiness rows have created_at but no updated_at.
      (supabase as any).from('fundraising_readiness_assessments').select('created_at').eq('user_id', baseRow.user_id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // Pitch Deck Analyzer persists analyses, not a pitch_deck_uploads table.
      (supabase as any).from('pitch_deck_analyses').select('created_at,updated_at').eq('user_id', baseRow.user_id)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      (supabase as any).from('insighta_pipeline_items').select('id', { count: 'exact', head: true }).eq('user_id', baseRow.user_id)
        .eq('entity_type', 'vc'),
    ]);

    const derived = deriveFounderProgress({
      outcomes: outcomesRes.error ? [] : ((outcomesRes.data ?? []) as JourneyOutcomeSignal[]),
      firstCustomerSprintCompletedAt: sprintRes.error ? null : dateFromRow(sprintRes.data),
      fundraisingReadinessCompletedAt: readinessRes.error ? null : dateFromRow(readinessRes.data),
      pitchDeckCompletedAt: pitchRes.error ? null : dateFromRow(pitchRes.data),
      savedInvestorCount: prospectsRes.error ? 0 : Number(prospectsRes.count ?? 0),
    });

    const nextRow: UserProgressRow = {
      ...baseRow,
      current_stage: derived.currentStage,
      highest_unlocked_stage: derived.highestUnlockedStage,
      identity_completed_at: derived.completedAt.IDENTITY,
      prototype_completed_at: derived.completedAt.PROTOTYPE,
      validating_completed_at: derived.completedAt.VALIDATING,
      building_completed_at: derived.completedAt.BUILDING,
      launch_completed_at: derived.completedAt.LAUNCH,
      traction_completed_at: derived.completedAt.TRACTION,
      fundraising_completed_at: baseRow.fundraising_completed_at,
    };
    return { nextRow, fundraisingOverlay: derived.fundraisingOverlay };
  }, []);

  const syncProgress = useCallback(async (baseRow: UserProgressRow) => {
    const { nextRow, fundraisingOverlay: overlay } = await evaluate(baseRow);
    const changed = [
      'current_stage', 'highest_unlocked_stage', 'identity_completed_at', 'prototype_completed_at',
      'validating_completed_at', 'building_completed_at', 'launch_completed_at', 'traction_completed_at',
    ].some((key) => nextRow[key as keyof UserProgressRow] !== baseRow[key as keyof UserProgressRow]);
    if (!changed) return { row: nextRow, overlay };
    const { data, error: updateError } = await (supabase as any).from(USER_PROGRESS_TABLE).update({
      current_stage: nextRow.current_stage,
      highest_unlocked_stage: nextRow.highest_unlocked_stage,
      identity_completed_at: nextRow.identity_completed_at,
      prototype_completed_at: nextRow.prototype_completed_at,
      validating_completed_at: nextRow.validating_completed_at,
      building_completed_at: nextRow.building_completed_at,
      launch_completed_at: nextRow.launch_completed_at,
      traction_completed_at: nextRow.traction_completed_at,
    }).eq('user_id', nextRow.user_id).select('*').single();
    if (updateError) throw updateError;
    return { row: data as UserProgressRow, overlay };
  }, [evaluate]);

  const initializeProgress = useCallback(async () => {
    if (!userId) {
      loadedUserIdRef.current = null;
      setProgress(null);
      setFundraisingOverlay({ eligible: false, status: 'not_eligible', readinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0 });
      setLoading(false);
      return;
    }
    if (loadedUserIdRef.current !== userId) setLoading(true);
    setError(null);
    try {
      const { data: existing, error: selectError } = await (supabase as any).from(USER_PROGRESS_TABLE)
        .select('*').eq('user_id', userId).maybeSingle();
      if (selectError) throw selectError;
      let row = existing as UserProgressRow | null;
      if (!row) {
        const { data, error: insertError } = await (supabase as any).from(USER_PROGRESS_TABLE).insert({
          user_id: userId, current_stage: DEFAULT_CURRENT_STAGE, highest_unlocked_stage: DEFAULT_HIGHEST_UNLOCKED_STAGE,
        }).select('*').single();
        if (insertError) throw insertError;
        row = data as UserProgressRow;
      }
      const synced = await syncProgress(row);
      setProgress(synced.row);
      setFundraisingOverlay(synced.overlay);
    } catch (err) {
      console.error('Failed to load founder progress:', err);
      setError('Unable to load founder progress right now.');
      setProgress(null);
    } finally {
      loadedUserIdRef.current = userId;
      setLoading(false);
    }
  }, [syncProgress, userId]);

  useEffect(() => { void initializeProgress(); }, [initializeProgress]);

  const stageState = useMemo(() => {
    const highest = progress?.highest_unlocked_stage ?? DEFAULT_HIGHEST_UNLOCKED_STAGE;
    const lookup: Record<BizMapStage, keyof UserProgressRow | null> = {
      IDENTITY: 'identity_completed_at', PROTOTYPE: 'prototype_completed_at', VALIDATING: 'validating_completed_at',
      BUILDING: 'building_completed_at', LAUNCH: 'launch_completed_at', TRACTION: 'traction_completed_at', FUNDRAISING: null,
    };
    return Object.fromEntries((Object.keys(lookup) as BizMapStage[]).map((stage) => {
      const key = lookup[stage];
      return [stage, {
        unlocked: stage === 'FUNDRAISING' ? fundraisingOverlay.eligible : isStageUnlocked(stage, highest),
        completed: key ? Boolean(progress?.[key]) : false,
        completedAt: key ? (progress?.[key] as string | null | undefined ?? null) : null,
      }];
    })) as Record<BizMapStage, { unlocked: boolean; completed: boolean; completedAt: string | null }>;
  }, [fundraisingOverlay.eligible, progress]);

  return {
    loading, error, progress, stageState,
    currentStage: progress?.current_stage ?? DEFAULT_CURRENT_STAGE,
    highestUnlockedStage: progress?.highest_unlocked_stage ?? DEFAULT_HIGHEST_UNLOCKED_STAGE,
    fundraisingOverlay,
    hasFullBizMapAccess: true,
    refreshProgress: initializeProgress,
    // Progress is evidence-driven; direct routes remain advisory rather than blocked.
    setCurrentStage: async (stage: BizMapStage) => stage === progress?.current_stage,
    isToolRouteUnlocked: () => true,
    getLockReasonForRoute: () => null,
  };
};
