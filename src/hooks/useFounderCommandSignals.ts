import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { fetchToolCompletionSignals } from '@/lib/founderSignals';
import { getFoundationalMilestones, type ToolCompletionSignals } from '@/lib/taskCalendar';

export function useFounderCommandSignals() {
  const { user } = useAuth();
  const { currentStage } = useBizMapProgress();
  const [toolSignals, setToolSignals] = useState<ToolCompletionSignals>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadSignals = useCallback(async () => {
    if (!user?.id) {
      setToolSignals({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setToolSignals(await fetchToolCompletionSignals(user.id));
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  const foundationalMilestones = useMemo(() => getFoundationalMilestones(toolSignals), [toolSignals]);
  const incompleteFoundations = useMemo(
    () => foundationalMilestones.filter((milestone) => !milestone.completed),
    [foundationalMilestones],
  );
  const completedFoundationCount = foundationalMilestones.length - incompleteFoundations.length;
  const hasProductFoundation = Boolean(
    toolSignals.icpCompleted && (toolSignals.waitlistCompleted || toolSignals.mvpCompleted || toolSignals.pmfCompleted),
  );

  return {
    currentStage,
    toolSignals,
    foundationalMilestones,
    incompleteFoundations,
    completedFoundationCount,
    hasProductFoundation,
    isLoading,
    refetch: loadSignals,
  };
}
