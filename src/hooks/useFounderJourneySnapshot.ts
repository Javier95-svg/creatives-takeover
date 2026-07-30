import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import {
  EMPTY_FOUNDER_JOURNEY_EXTRAS,
  buildFounderJourneySnapshot,
  type FounderJourneyExtras,
  type FounderJourneySnapshot,
} from '@/lib/founderJourney';
import { fetchFounderJourneyExtras, fetchToolCompletionSignals } from '@/lib/founderSignals';
import { getFoundationalMilestones, type ToolCompletionSignals } from '@/lib/taskCalendar';
import { useOnboardingContext } from '@/hooks/useOnboardingContext';
import { useStageIntelligence } from '@/hooks/useStageIntelligence';
import { mapFounderStageToBizMapStage } from '@/lib/stageDiagnostic';

const REFETCH_THROTTLE_MS = 60_000;

export function useFounderJourneySnapshot() {
  const { user } = useAuth();
  const { currentStage, stageState, loading: stageLoading } = useBizMapProgress();
  const { value: onboarding, loading: onboardingLoading } = useOnboardingContext();
  const { state: stageIntelligence, loading: intelligenceLoading } = useStageIntelligence();
  const [toolSignals, setToolSignals] = useState<ToolCompletionSignals>({});
  const [extras, setExtras] = useState<FounderJourneyExtras>(EMPTY_FOUNDER_JOURNEY_EXTRAS);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);

  const load = useCallback(
    async (force = false) => {
      if (!user?.id) {
        setToolSignals({});
        setExtras(EMPTY_FOUNDER_JOURNEY_EXTRAS);
        setIsLoading(false);
        return;
      }
      if (!force && Date.now() - lastFetchedAtRef.current < REFETCH_THROTTLE_MS) return;
      lastFetchedAtRef.current = Date.now();

      const [signals, journeyExtras] = await Promise.all([
        fetchToolCompletionSignals(user.id),
        fetchFounderJourneyExtras(user.id),
      ]);
      setToolSignals(signals);
      setExtras(journeyExtras);
      setIsLoading(false);
    },
    [user?.id],
  );

  useEffect(() => {
    lastFetchedAtRef.current = 0;
    setIsLoading(true);
    void load(true);
  }, [load]);

  // Dashboard tabs stay mounted, so a throttled focus/visibility refetch is what
  // keeps the panel fresh after the founder works in a tool and comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const snapshot: FounderJourneySnapshot = useMemo(
    () => {
      const evidenceStage = stageIntelligence?.current_stage;
      const effectiveStage = evidenceStage
        ? mapFounderStageToBizMapStage(evidenceStage)
        : currentStage;
      const effectiveContext = onboarding?.context && stageIntelligence
        ? {
            ...onboarding.context,
            assignedStage: stageIntelligence.current_stage,
            operatingStage: stageIntelligence.current_stage,
            runnerUpStage: stageIntelligence.runner_up_stage,
            stageConfidence: stageIntelligence.confidence_score,
            stageConfidenceBand: stageIntelligence.confidence_band,
            stageEvidenceCoverage: stageIntelligence.evidence_coverage,
            stageScoreMargin: stageIntelligence.score_margin,
            capitalMotion: stageIntelligence.capital_motion,
            capitalEvidence: stageIntelligence.capital_evidence,
            stageRationaleCodes: stageIntelligence.rationale_codes,
          }
        : onboarding?.context;

      return (
      buildFounderJourneySnapshot({
        currentStage: effectiveStage,
        stageState,
        toolSignals,
        extras,
        foundationalMilestones: getFoundationalMilestones(toolSignals),
        onboardingContext: effectiveContext,
      })
      );
    },
    [currentStage, extras, onboarding?.context, stageIntelligence, stageState, toolSignals],
  );

  const refetch = useCallback(() => load(true), [load]);

  return {
    snapshot,
    isLoading: isLoading || stageLoading || onboardingLoading || intelligenceLoading,
    refetch,
  };
}
