import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingContext } from '@/hooks/useOnboardingContext';
import {
  answerFounderStageBoundary,
  confirmFounderStage,
  deriveFounderStageAssessment,
  fetchFounderStageEvidence,
  fetchFounderStageState,
  getFounderStageBoundaryQuestion,
  syncFounderStageState,
  type FounderStageBoundaryQuestion,
  type FounderStageState,
  type StageCorrectionReason,
} from '@/lib/stageIntelligence';
import type {
  CapitalMotion,
  FounderOperatingStageId,
  StageConfidenceBand,
} from '@/lib/stageDiagnostic';

export const FOUNDER_STAGE_UPDATED_EVENT = 'founder-stage-updated';

function clampOperatingStage(value: unknown): FounderOperatingStageId {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(6, Math.max(1, Math.round(numeric))) as FounderOperatingStageId;
}

function fallbackState(params: {
  userId: string;
  currentStage: FounderOperatingStageId;
  runnerUpStage: FounderOperatingStageId | null;
  confidenceScore: number;
  confidenceBand: StageConfidenceBand;
  evidenceCoverage: number;
  scoreMargin: number;
  capitalMotion: CapitalMotion;
  capitalEvidence: boolean;
  rationaleCodes: string[];
}): FounderStageState {
  const now = new Date().toISOString();
  return {
    user_id: params.userId,
    current_stage: params.currentStage,
    candidate_stage: params.currentStage,
    runner_up_stage: params.runnerUpStage,
    score_margin: params.scoreMargin,
    confidence_score: params.confidenceScore,
    confidence_band: params.confidenceBand,
    evidence_coverage: params.evidenceCoverage,
    capital_motion: params.capitalMotion,
    capital_evidence: params.capitalEvidence,
    rationale_codes: params.rationaleCodes,
    model_version: 'stage_evidence_v1',
    candidate_since: now,
    last_transition_at: null,
    last_evaluated_at: now,
    stage_stale: false,
    user_confirmed_stage: null,
    user_confirmed_at: null,
    user_override_stage: null,
    user_override_until: null,
    correction_reason: null,
    boundary_question_key: null,
    boundary_answer: null,
    boundary_answered_at: null,
  };
}

export function useStageIntelligence() {
  const { user } = useAuth();
  const { value: onboarding, loading: onboardingLoading } = useOnboardingContext();
  const [state, setState] = useState<FounderStageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || !onboarding?.context) {
      if (!user?.id) loadedUserIdRef.current = null;
      setState(null);
      setLoading(onboardingLoading);
      return;
    }

    if (loadedUserIdRef.current !== user.id) {
      setLoading(true);
    }
    const context = onboarding.context;
    const baseStage = clampOperatingStage(context.operatingStage ?? context.assignedStage);
    const runnerUpStage = context.runnerUpStage == null
      ? null
      : clampOperatingStage(context.runnerUpStage);
    const confidenceScore = Number.isFinite(Number(context.stageConfidence))
      ? Number(context.stageConfidence)
      : 50;
    const confidenceBand: StageConfidenceBand =
      context.stageConfidenceBand === 'high' || context.stageConfidenceBand === 'medium'
        ? context.stageConfidenceBand
        : 'low';
    const capitalMotion: CapitalMotion =
      context.capitalMotion === 'active' || context.capitalMotion === 'preparing'
        ? context.capitalMotion
        : 'inactive';
    const base = {
      baseStage,
      runnerUpStage,
      confidenceScore,
      confidenceBand,
      scoreMargin: Math.max(0, Number(context.stageScoreMargin ?? 0)),
      evidenceCoverage: Math.min(1, Math.max(0, Number(context.stageEvidenceCoverage ?? 0.667))),
      capitalMotion,
      capitalEvidence: context.capitalEvidence === true,
      rationaleCodes: Array.isArray(context.stageRationaleCodes)
        ? context.stageRationaleCodes
        : [],
    };

    try {
      const [evidence, persisted] = await Promise.all([
        fetchFounderStageEvidence(user.id),
        fetchFounderStageState(user.id),
      ]);
      const assessment = deriveFounderStageAssessment(base, evidence);
      const synced = await syncFounderStageState(
        assessment,
        persisted ? 'dashboard_refresh' : 'dashboard_initialization',
      );
      setState(synced);
      setAvailable(true);
    } catch (error) {
      // The Command Center remains useful before the migration reaches an
      // environment, or if stage intelligence is temporarily unavailable.
      console.warn('Stage intelligence is unavailable; using onboarding context.', error);
      setState(fallbackState({
        userId: user.id,
        currentStage: baseStage,
        runnerUpStage,
        confidenceScore,
        confidenceBand,
        evidenceCoverage: base.evidenceCoverage,
        scoreMargin: base.scoreMargin,
        capitalMotion,
        capitalEvidence: base.capitalEvidence,
        rationaleCodes: base.rationaleCodes,
      }));
      setAvailable(false);
    } finally {
      loadedUserIdRef.current = user.id;
      setLoading(false);
    }
  }, [onboarding, onboardingLoading, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener(FOUNDER_STAGE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(FOUNDER_STAGE_UPDATED_EVENT, refresh);
  }, [load]);

  const boundaryQuestion = useMemo<FounderStageBoundaryQuestion | null>(() => {
    if (!state || state.boundary_answered_at) return null;
    return getFounderStageBoundaryQuestion(
      state.candidate_stage,
      state.runner_up_stage,
      state.confidence_band,
    );
  }, [state]);

  const confirm = useCallback(async (
    confirmedStage: FounderOperatingStageId,
    reason: StageCorrectionReason,
  ) => {
    if (!available) return null;
    setSaving(true);
    try {
      const next = await confirmFounderStage(confirmedStage, reason);
      setState(next);
      window.dispatchEvent(new Event(FOUNDER_STAGE_UPDATED_EVENT));
      return next;
    } finally {
      setSaving(false);
    }
  }, [available]);

  const answerBoundary = useCallback(async (answer: 'lower' | 'upper') => {
    if (!available || !boundaryQuestion) return null;
    setSaving(true);
    try {
      const next = await answerFounderStageBoundary(boundaryQuestion, answer);
      setState(next);
      window.dispatchEvent(new Event(FOUNDER_STAGE_UPDATED_EVENT));
      return next;
    } finally {
      setSaving(false);
    }
  }, [available, boundaryQuestion]);

  return {
    state,
    boundaryQuestion,
    loading: loading || onboardingLoading,
    saving,
    available,
    refetch: load,
    confirm,
    answerBoundary,
  };
}
