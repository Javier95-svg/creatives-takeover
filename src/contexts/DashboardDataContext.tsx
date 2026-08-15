/* eslint-disable react-refresh/only-export-components -- provider and selector hooks intentionally share one contract */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isDashboardAiRankingEnabled } from '@/lib/dashboardRollout';
import { captureEvent } from '@/lib/analytics';
import { isDashboardSnapshot, type DashboardAction, type DashboardSnapshot } from '@/types/dashboardSnapshot';
import { useFounderCycle } from '@/hooks/useFounderCycle';
import {
  recommendationDecisionKey,
  recordRecommendationDecision,
  type RecommendationAssignment,
} from '@/lib/recommendationLearning';
import { buildDashboardCandidateQueue, dashboardPriorityBand } from '@/lib/socialRecommendation';

export const dashboardSnapshotQueryKey = (userId: string | null | undefined) => ['dashboard-snapshot-v1', userId] as const;

interface RankingResult {
  orderedCandidateKeys: string[];
  rationaleByKey: Record<string, string>;
  model?: string | null;
  policyVersion?: string;
  assignment?: RecommendationAssignment;
  deterministicKey?: string;
  scoreDiagnostics?: Record<string, unknown>;
  contextSegments?: Record<string, unknown>;
  suppressedKeys?: string[];
}

interface DashboardDataContextValue {
  snapshot: DashboardSnapshot | null;
  primaryAction: DashboardAction | null;
  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
  isOffline: boolean;
  error: Error | null;
  recommendationPolicy: {
    decisionKey: string;
    policyVersion: string;
    assignment: RecommendationAssignment;
  } | null;
  refresh: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

function uniqueCandidates(snapshot: DashboardSnapshot | null): DashboardAction[] {
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

function isCustomerUrgent(action: DashboardAction | null | undefined) {
  if (!action) return false;
  const reasonText = action.reasonCodes.join(' ').toLowerCase();
  return action.kind === 'human_reply'
    || (
      action.urgency === 'high'
      && ['messages', 'pmf_lab', 'gtm_strategist'].includes(action.toolKey)
      && /(reply|follow.?up|interview|meeting|overdue|customer)/.test(reasonText)
    );
}

function candidateHash(candidates: DashboardAction[], snapshot: DashboardSnapshot | null) {
  const input = JSON.stringify({
    candidates: candidates.map(({ key, urgency, reasonCodes, estimatedMinutes, toolKey, priorityBand }) => ({
      key,
      urgency,
      reasonCodes,
      estimatedMinutes,
      toolKey,
      priorityBand,
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
  const founderCycle = useFounderCycle();
  const queryClient = useQueryClient();
  const aiRankingFlag = useFeatureFlagEnabled('dashboard-ai-ranking');
  const socialRecommendationsFlag = useFeatureFlagEnabled('dashboard-social-recommendations');
  const userId = user?.id ?? null;
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const recordedDecisionKeys = useRef(new Set<string>());

  useEffect(() => {
    recordedDecisionKeys.current.clear();
  }, [userId]);

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
      let { data, error } = await supabase.rpc('get_dashboard_snapshot_v3' as never, { p_timezone: timezone } as never);
      if (error?.code === '42883' || error?.message?.includes('get_dashboard_snapshot_v3')) {
        const v2Fallback = await supabase.rpc('get_dashboard_snapshot_v2' as never, { p_timezone: timezone } as never);
        data = v2Fallback.data;
        error = v2Fallback.error;
      }
      if (error?.code === '42883' || error?.message?.includes('get_dashboard_snapshot_v2')) {
        const v1Fallback = await supabase.rpc('get_dashboard_snapshot_v1', { p_timezone: timezone });
        data = v1Fallback.data;
        error = v1Fallback.error;
      }
      if (error) {
        captureEvent('dashboard_snapshot_failed', { duration_ms: Math.round(performance.now() - startedAt), error_code: error.code });
        throw error;
      }
      if (!isDashboardSnapshot(data)) {
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

  const cyclePrimary = useMemo<DashboardAction | null>(() => {
    const action = founderCycle.snapshot?.primaryAction;
    if (!founderCycle.showCycle || !action) return null;
    const routeTool = action.route.startsWith('/pmf-lab')
      ? 'pmf_lab'
      : action.route.startsWith('/go-to-market')
        ? 'gtm_strategist'
        : action.route.startsWith('/traction-engine')
          ? 'traction_engine'
          : action.route.startsWith('/core-metrics')
            ? 'core_metrics'
          : action.route.startsWith('/icp-builder')
            ? 'icp_builder'
            : 'founder_cycle';
    return {
      key: `cycle:${action.key}`,
      kind: 'journey',
      toolKey: routeTool,
      entityId: null,
      title: action.title,
      description: `${action.description} Expected evidence: ${action.expectedEvidence.replaceAll('_', ' ')}.`,
      urgency: 'high',
      reasonCodes: ['external_customer_evidence', action.reason],
      estimatedMinutes: 20,
      dueAt: null,
      actionKind: 'open_tool',
    };
  }, [founderCycle.showCycle, founderCycle.snapshot?.primaryAction]);

  const candidates = useMemo(() => {
    const snapshotCandidates = uniqueCandidates(snapshotQuery.data ?? null);
    const socialCandidates = socialRecommendationsFlag === true && snapshotQuery.data?.version === 3
      ? snapshotQuery.data.social.candidates
      : [];
    const baseCandidates = !cyclePrimary || isCustomerUrgent(snapshotQuery.data?.focus.primaryAction)
      ? snapshotCandidates
      : [
          cyclePrimary,
          ...snapshotCandidates.filter((candidate) => candidate.key !== cyclePrimary.key),
        ].slice(0, 10);
    return buildDashboardCandidateQueue(baseCandidates, socialCandidates);
  }, [cyclePrimary, snapshotQuery.data, socialRecommendationsFlag]);
  const rankableCandidates = candidates;
  const snapshotHash = useMemo(
    () => candidateHash(rankableCandidates, snapshotQuery.data ?? null),
    [rankableCandidates, snapshotQuery.data],
  );
  const aiRankingEnabled = isDashboardAiRankingEnabled(aiRankingFlag);
  const rankingSnapshotHash = `${snapshotHash}:${aiRankingEnabled ? 'ai' : 'rules'}`;
  const rankingQuery = useQuery({
    queryKey: ['dashboard-action-ranking', userId, rankingSnapshotHash],
    enabled: Boolean(userId) && rankableCandidates.length > 0,
    staleTime: 24 * 60 * 60_000,
    retry: false,
    queryFn: async (): Promise<RankingResult | null> => {
      const { data, error } = await supabase.functions.invoke('rank-dashboard-actions', {
        body: {
          snapshotHash: rankingSnapshotHash,
          allowAi: aiRankingEnabled,
          candidates: rankableCandidates.map((action) => ({
            key: action.key,
            urgency: action.urgency,
            reasonCodes: action.reasonCodes,
            estimatedMinutes: action.estimatedMinutes,
            toolKey: action.toolKey,
            priorityBand: dashboardPriorityBand(action),
          })),
        },
      });
      if (error || !data || data.fallback) return null;
      return data as RankingResult;
    },
  });

  useEffect(() => {
    if (!userId) return;
    const onSocialChange = () => void queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(userId) });
    const channel = supabase
      .channel(`dashboard-activity:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_activity_log', filter: `user_id=eq.${userId}` },
        () => void queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(userId) }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_interaction_events', filter: `actor_user_id=eq.${userId}` }, onSocialChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onSocialChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, onSocialChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cofounder_interests' }, onSocialChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discovery_calls' }, onSocialChange)
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
    if (!key) return rankableCandidates[0] ?? snapshotQuery.data?.focus.primaryAction ?? null;
    const ranked = rankableCandidates.find((candidate) => candidate.key === key);
    if (!ranked) return rankableCandidates[0] ?? snapshotQuery.data?.focus.primaryAction ?? null;
    const explanation = rankingQuery.data?.rationaleByKey?.[key];
    return explanation ? { ...ranked, description: explanation } : ranked;
  }, [rankableCandidates, rankingQuery.data, snapshotQuery.data]);

  const effectivePrimary = rankedPrimary;
  const effectiveSecondary = useMemo(
    () => candidates.filter((candidate) => candidate.key !== effectivePrimary?.key).slice(0, 3),
    [candidates, effectivePrimary?.key],
  );
  const effectiveSnapshot = useMemo<DashboardSnapshot | null>(() => {
    if (!snapshotQuery.data) return null;
    return {
      ...snapshotQuery.data,
      focus: {
        ...snapshotQuery.data.focus,
        primaryAction: effectivePrimary,
        secondaryActions: effectiveSecondary,
      },
    } as DashboardSnapshot;
  }, [effectivePrimary, effectiveSecondary, snapshotQuery.data]);

  const decision = useMemo(() => {
    if (!effectivePrimary || !snapshotQuery.data) return null;
    const rankingSelectedKey = rankingQuery.data?.orderedCandidateKeys?.[0];
    const selectedByRanker = effectivePrimary.key === rankingSelectedKey;
    const deterministicKey = candidates[0]?.key ?? snapshotQuery.data.focus.primaryAction?.key ?? effectivePrimary.key;
    const policyVersion = selectedByRanker
      ? rankingQuery.data?.policyVersion ?? 'collective_v1'
      : effectivePrimary.key === cyclePrimary?.key
        ? 'founder_cycle_v1'
        : 'deterministic_v1';
    const assignment: RecommendationAssignment = selectedByRanker
      ? rankingQuery.data?.assignment ?? 'learned'
      : 'baseline';
    const exposureCandidates = [...candidates];
    if (!exposureCandidates.some((candidate) => candidate.key === effectivePrimary.key)) {
      exposureCandidates.push(effectivePrimary);
    }
    const decisionKey = recommendationDecisionKey(
      'command_center',
      effectivePrimary.key,
      rankingSnapshotHash || 'snapshot',
    );

    return {
      decisionKey,
      policyVersion,
      assignment,
      deterministicKey: selectedByRanker
        ? rankingQuery.data?.deterministicKey ?? deterministicKey
        : deterministicKey,
      model: selectedByRanker ? rankingQuery.data?.model ?? null : null,
      scoreDiagnostics: selectedByRanker ? rankingQuery.data?.scoreDiagnostics ?? {} : {},
      candidates: exposureCandidates,
      selected: effectivePrimary,
    };
  }, [
    candidates,
    cyclePrimary?.key,
    effectivePrimary,
    rankingQuery.data,
    rankingSnapshotHash,
    snapshotQuery.data,
  ]);

  useEffect(() => {
    if (!decision || recordedDecisionKeys.current.has(decision.decisionKey)) return;
    recordedDecisionKeys.current.add(decision.decisionKey);
    void recordRecommendationDecision({
      decisionKey: decision.decisionKey,
      surface: 'command_center',
      snapshotHash: rankingSnapshotHash,
      candidates: decision.candidates.map((candidate) => ({
        key: candidate.key,
        toolKey: candidate.toolKey,
        urgency: candidate.urgency,
        reasonCodes: candidate.reasonCodes,
        estimatedMinutes: candidate.estimatedMinutes,
      })),
      selectedKey: decision.selected.key,
      selectedToolKey: decision.selected.toolKey,
      deterministicKey: decision.deterministicKey,
      policyVersion: decision.policyVersion,
      assignment: decision.assignment,
      model: decision.model,
      scoreDiagnostics: decision.scoreDiagnostics,
    }).catch(() => {
      // The dashboard remains fully usable while the additive learning migration rolls out.
      recordedDecisionKeys.current.delete(decision.decisionKey);
    });
  }, [decision, rankingSnapshotHash]);

  const value = useMemo<DashboardDataContextValue>(() => ({
    snapshot: effectiveSnapshot,
    primaryAction: effectivePrimary,
    isLoading: snapshotQuery.isLoading,
    isFetching: snapshotQuery.isFetching,
    isStale: snapshotQuery.isStale,
    isOffline,
    error: snapshotQuery.error instanceof Error ? snapshotQuery.error : null,
    recommendationPolicy: decision ? {
      decisionKey: decision.decisionKey,
      policyVersion: decision.policyVersion,
      assignment: decision.assignment,
    } : null,
    refresh: async () => {
      await snapshotQuery.refetch();
    },
  }), [decision, effectivePrimary, effectiveSnapshot, isOffline, snapshotQuery]);

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
