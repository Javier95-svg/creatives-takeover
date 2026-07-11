/* eslint-disable react-refresh/only-export-components -- provider and selector hooks intentionally share one contract */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeatureFlagEnabled } from 'posthog-js/react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isDashboardAiRankingEnabled } from '@/lib/dashboardRollout';
import { captureEvent } from '@/lib/analytics';
import { isDashboardSnapshotV1, type DashboardAction, type DashboardSnapshotV1 } from '@/types/dashboardSnapshot';

export const dashboardSnapshotQueryKey = (userId: string | null | undefined) => ['dashboard-snapshot-v1', userId] as const;

interface RankingResult {
  orderedCandidateKeys: string[];
  rationaleByKey: Record<string, string>;
}

interface DashboardDataContextValue {
  snapshot: DashboardSnapshotV1 | null;
  primaryAction: DashboardAction | null;
  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
  isOffline: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

function uniqueCandidates(snapshot: DashboardSnapshotV1 | null): DashboardAction[] {
  if (!snapshot) return [];
  const byKey = new Map<string, DashboardAction>();
  [
    snapshot.focus.primaryAction,
    ...snapshot.focus.secondaryActions,
    ...snapshot.people.followUps,
  ].forEach((candidate) => {
    if (candidate) byKey.set(candidate.key, candidate);
  });
  return [...byKey.values()].slice(0, 10);
}

function candidateHash(candidates: DashboardAction[], snapshot: DashboardSnapshotV1 | null) {
  const input = JSON.stringify({
    candidates: candidates.map(({ key, urgency, reasonCodes, estimatedMinutes, toolKey }) => ({
      key,
      urgency,
      reasonCodes,
      estimatedMinutes,
      toolKey,
    })),
    materialSignals: snapshot ? {
      stage: snapshot.journey.currentStage,
      overdue: snapshot.focus.overdueCount,
      unread: snapshot.people.unreadMessages,
      pmf: snapshot.business.pmfScore,
      traction: snapshot.business.tractionScore,
      demoSignups: snapshot.business.demoSignups,
      waitlistSignups: snapshot.business.waitlistSignups,
    } : null,
  });
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const aiRankingFlag = useFeatureFlagEnabled('dashboard-ai-ranking');
  const userId = user?.id ?? null;
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  const snapshotQuery = useQuery({
    queryKey: dashboardSnapshotQueryKey(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    queryFn: async () => {
      const startedAt = performance.now();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const { data, error } = await supabase.rpc('get_dashboard_snapshot_v1', { p_timezone: timezone });
      if (error) {
        captureEvent('dashboard_snapshot_failed', { duration_ms: Math.round(performance.now() - startedAt), error_code: error.code });
        throw error;
      }
      if (!isDashboardSnapshotV1(data)) {
        captureEvent('dashboard_snapshot_failed', { duration_ms: Math.round(performance.now() - startedAt), error_code: 'invalid_contract' });
        throw new Error('Dashboard snapshot returned an unsupported contract');
      }
      captureEvent('dashboard_snapshot_loaded', {
        duration_ms: Math.round(performance.now() - startedAt),
        payload_bytes: JSON.stringify(data).length,
        contract_version: data.version,
      });
      return data;
    },
  });

  const candidates = useMemo(() => uniqueCandidates(snapshotQuery.data ?? null), [snapshotQuery.data]);
  const rankableCandidates = useMemo(() => {
    const deterministicPrimary = snapshotQuery.data?.focus.primaryAction;
    if (!deterministicPrimary) return [];
    return candidates.filter((candidate) => candidate.urgency === deterministicPrimary.urgency);
  }, [candidates, snapshotQuery.data]);
  const snapshotHash = useMemo(
    () => candidateHash(rankableCandidates, snapshotQuery.data ?? null),
    [rankableCandidates, snapshotQuery.data],
  );
  const rankingQuery = useQuery({
    queryKey: ['dashboard-action-ranking', userId, snapshotHash],
    enabled: Boolean(userId) && isDashboardAiRankingEnabled(aiRankingFlag) && rankableCandidates.length > 1,
    staleTime: 24 * 60 * 60_000,
    retry: false,
    queryFn: async (): Promise<RankingResult | null> => {
      const { data, error } = await supabase.functions.invoke('rank-dashboard-actions', {
        body: {
          snapshotHash,
          candidates: rankableCandidates.map(({ key, urgency, reasonCodes, estimatedMinutes, toolKey }) => ({
            key,
            urgency,
            reasonCodes,
            estimatedMinutes,
            toolKey,
          })),
        },
      });
      if (error || !data || data.fallback) return null;
      return data as RankingResult;
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`dashboard-activity:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_activity_log', filter: `user_id=eq.${userId}` },
        () => void queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(userId) }),
      )
      .subscribe();

    const onToolMilestone = () => void queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(userId) });
    window.addEventListener('ct:tool-milestone', onToolMilestone);
    return () => {
      window.removeEventListener('ct:tool-milestone', onToolMilestone);
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  useEffect(() => {
    const updateConnection = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  const rankedPrimary = useMemo(() => {
    const key = rankingQuery.data?.orderedCandidateKeys?.[0];
    if (!key) return snapshotQuery.data?.focus.primaryAction ?? null;
    const ranked = rankableCandidates.find((candidate) => candidate.key === key);
    if (!ranked) return snapshotQuery.data?.focus.primaryAction ?? null;
    const explanation = rankingQuery.data?.rationaleByKey?.[key];
    return explanation ? { ...ranked, description: explanation } : ranked;
  }, [rankableCandidates, rankingQuery.data, snapshotQuery.data]);

  const value = useMemo<DashboardDataContextValue>(() => ({
    snapshot: snapshotQuery.data ?? null,
    primaryAction: rankedPrimary,
    isLoading: snapshotQuery.isLoading,
    isFetching: snapshotQuery.isFetching,
    isStale: snapshotQuery.isStale,
    isOffline,
    error: snapshotQuery.error instanceof Error ? snapshotQuery.error : null,
    refresh: async () => {
      await snapshotQuery.refetch();
    },
  }), [isOffline, rankedPrimary, snapshotQuery]);

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const value = useContext(DashboardDataContext);
  if (!value) throw new Error('useDashboardData must be used within DashboardDataProvider');
  return value;
}

export function useDashboardFocus() {
  const { snapshot, primaryAction, ...query } = useDashboardData();
  return { focus: snapshot?.focus ?? null, primaryAction, ...query };
}

export function useDashboardJourney() {
  const { snapshot, ...query } = useDashboardData();
  return { journey: snapshot?.journey ?? null, ...query };
}

export function useDashboardPeople() {
  const { snapshot, ...query } = useDashboardData();
  return { people: snapshot?.people ?? null, ...query };
}
