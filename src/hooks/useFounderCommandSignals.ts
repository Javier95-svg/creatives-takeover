import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { getFoundationalMilestones, type ToolCompletionSignals } from '@/lib/taskCalendar';

async function countLatest(table: string, userId: string, extra?: (query: any) => any): Promise<boolean> {
  let query = supabase.from(table as any).select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (extra) query = extra(query);
  const { count, error } = await query;
  if (error) {
    console.warn(`Unable to read ${table} for dashboard command signals`, error);
    return false;
  }
  return Number(count ?? 0) > 0;
}

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
    const [
      icpCompleted,
      waitlistCompleted,
      pmfScored,
      pmfEvidenceCaptured,
      mvpCompleted,
      techStackCompleted,
      gtmCompleted,
    ] = await Promise.all([
      countLatest('icp_analysis_results', user.id),
      countLatest('waitlist_pages', user.id, (query) => query.in('status', ['published', 'exported'])),
      countLatest('pmf_analysis_results', user.id),
      countLatest('pmf_validation_evidence', user.id),
      countLatest('mvp_builder_artifacts', user.id, (query) => query.eq('status', 'saved')),
      countLatest('tech_stack_reports', user.id),
      countLatest('gtm_plans', user.id, (query) => query.in('status', ['saved', 'exported'])),
    ]);

    setToolSignals({
      icpCompleted,
      waitlistCompleted,
      pmfCompleted: pmfScored || pmfEvidenceCaptured,
      mvpCompleted,
      techStackCompleted,
      gtmCompleted,
    });
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
