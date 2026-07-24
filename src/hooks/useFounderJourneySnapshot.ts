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

const REFETCH_THROTTLE_MS = 60_000;

export function useFounderJourneySnapshot() {
  const { user } = useAuth();
  const { currentStage, stageState, outcomeSnapshot, loading: stageLoading } = useBizMapProgress();
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
    () =>
      buildFounderJourneySnapshot({
        currentStage,
        stageState,
        toolSignals,
        extras,
        foundationalMilestones: getFoundationalMilestones(toolSignals),
        outcomeByTool: outcomeSnapshot?.outcomes,
      }),
    [currentStage, extras, outcomeSnapshot?.outcomes, stageState, toolSignals],
  );

  const refetch = useCallback(() => load(true), [load]);

  return {
    snapshot,
    isLoading: isLoading || stageLoading,
    refetch,
  };
}
