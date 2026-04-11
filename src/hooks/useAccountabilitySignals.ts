import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  formatActiveDaysLabel,
  normalizeAccountabilityPreferences,
  type AccountabilityPreferences,
} from '@/lib/accountabilityPreferences';

interface AccountabilitySignalsState {
  preferences: AccountabilityPreferences;
  activeDaysLast14: number;
  activeDaysLabel: string;
  daysSinceLastActivity: number | null;
  daysSinceLastMilestone: number | null;
  hasRecentMilestoneCompletion: boolean;
  stageStaleDays: number;
  isLoading: boolean;
}

const DEFAULT_STATE: AccountabilitySignalsState = {
  preferences: normalizeAccountabilityPreferences(null),
  activeDaysLast14: 0,
  activeDaysLabel: formatActiveDaysLabel(0),
  daysSinceLastActivity: null,
  daysSinceLastMilestone: null,
  hasRecentMilestoneCompletion: false,
  stageStaleDays: 0,
  isLoading: true,
};

function getDaysSince(timestamp: string | null | undefined) {
  if (!timestamp) {
    return null;
  }

  const parsed = new Date(timestamp).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
}

export function useAccountabilitySignals(userId?: string) {
  const [state, setState] = useState<AccountabilitySignalsState>(DEFAULT_STATE);

  useEffect(() => {
    if (!userId) {
      setState(DEFAULT_STATE);
      return;
    }

    let isCancelled = false;

    const loadSignals = async () => {
      setState((current) => ({ ...current, isLoading: true }));

      const recentActivityIso = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString();
      const recentMilestoneIso = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const [
          profileResult,
          activityEventsResult,
          activityLogResult,
          checkInsResult,
          progressMilestonesResult,
          founderMilestonesResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_preferences, updated_at')
            .eq('id', userId)
            .single(),
          supabase
            .from('activity_events')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', recentActivityIso),
          supabase
            .from('user_activity_log')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', recentActivityIso),
          supabase
            .from('daily_check_ins')
            .select('created_at, check_in_date')
            .eq('user_id', userId)
            .gte('check_in_date', recentActivityIso.slice(0, 10)),
          supabase
            .from('progress_milestones')
            .select('status, completed_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(20),
          supabase
            .from('founder_milestones')
            .select('achieved_at')
            .eq('user_id', userId)
            .order('achieved_at', { ascending: false })
            .limit(20),
        ]);

        if (isCancelled) {
          return;
        }

        if (profileResult.error) {
          throw profileResult.error;
        }

        const preferences = normalizeAccountabilityPreferences(
          (profileResult.data?.user_preferences as Record<string, unknown> | null | undefined) ?? null,
        );

        const activeDates = new Set<string>();
        let lastActivityTimestamp: string | null = null;

        for (const row of activityEventsResult.data ?? []) {
          if (row.created_at) {
            activeDates.add(row.created_at.slice(0, 10));
            lastActivityTimestamp = !lastActivityTimestamp || row.created_at > lastActivityTimestamp
              ? row.created_at
              : lastActivityTimestamp;
          }
        }

        for (const row of activityLogResult.data ?? []) {
          if (row.created_at) {
            activeDates.add(row.created_at.slice(0, 10));
            lastActivityTimestamp = !lastActivityTimestamp || row.created_at > lastActivityTimestamp
              ? row.created_at
              : lastActivityTimestamp;
          }
        }

        for (const row of checkInsResult.data ?? []) {
          if (row.check_in_date) {
            activeDates.add(row.check_in_date.slice(0, 10));
          }

          if (row.created_at) {
            lastActivityTimestamp = !lastActivityTimestamp || row.created_at > lastActivityTimestamp
              ? row.created_at
              : lastActivityTimestamp;
          }
        }

        const progressMilestoneDates = (progressMilestonesResult.data ?? [])
          .filter((milestone) => milestone.status === 'completed' && milestone.completed_at)
          .map((milestone) => milestone.completed_at as string);
        const founderMilestoneDates = (founderMilestonesResult.data ?? [])
          .map((milestone) => milestone.achieved_at)
          .filter(Boolean) as string[];
        const allMilestoneDates = [...progressMilestoneDates, ...founderMilestoneDates]
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
        const mostRecentMilestoneAt = allMilestoneDates[0] ?? null;
        const hasRecentMilestoneCompletion = allMilestoneDates.some(
          (timestamp) => new Date(timestamp).toISOString() >= recentMilestoneIso,
        );
        const stageAnchor = preferences.stage_last_updated_at || profileResult.data.updated_at || null;

        setState({
          preferences,
          activeDaysLast14: activeDates.size,
          activeDaysLabel: formatActiveDaysLabel(activeDates.size),
          daysSinceLastActivity: getDaysSince(lastActivityTimestamp),
          daysSinceLastMilestone: getDaysSince(mostRecentMilestoneAt),
          hasRecentMilestoneCompletion,
          stageStaleDays: getDaysSince(stageAnchor) ?? 0,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to load accountability signals', error);
        if (!isCancelled) {
          setState((current) => ({
            ...current,
            activeDaysLabel: formatActiveDaysLabel(current.activeDaysLast14),
            isLoading: false,
          }));
        }
      }
    };

    void loadSignals();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  return useMemo(() => state, [state]);
}
