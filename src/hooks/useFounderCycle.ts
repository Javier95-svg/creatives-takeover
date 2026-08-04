import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  deriveFounderLoop,
  isFounderCycleSnapshot,
  type CustomerEvidenceEventType,
  type EvidenceVerificationMode,
  type FounderBusinessModel,
  type FounderCycleSnapshot,
  type FounderLoop,
} from '@/lib/founderCycle';
import { isFounderCycleRolloutEnabled } from '@/lib/founderCycleRollout';

// Generated database types are refreshed after the additive migration is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;
export const founderCycleQueryKey = (userId: string | null | undefined) => ['founder-cycle-v1', userId] as const;

async function legacyFallbackSnapshot(userId: string): Promise<FounderCycleSnapshot> {
  const [{ data: progress }, { data: profile }] = await Promise.all([
    client.from('user_progress').select('current_stage').eq('user_id', userId).maybeSingle(),
    client.from('profiles').select('user_preferences').eq('id', userId).maybeSingle(),
  ]);
  const preferences = profile?.user_preferences && typeof profile.user_preferences === 'object'
    ? profile.user_preferences as Record<string, unknown>
    : {};
  const customerCount = Number(preferences.customerCount ?? 0);
  const businessModel = typeof preferences.businessModel === 'string'
    ? preferences.businessModel as FounderBusinessModel
    : null;
  const derived = deriveFounderLoop({ legacyStage: progress?.current_stage });
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    eligible: false,
    betaCohort: false,
    businessModel,
    customerCount: Number.isFinite(customerCount) ? customerCount : 0,
    recommendedLoop: derived.loop,
    selectedLoop: derived.loop,
    assignmentReason: derived.reason,
    primaryGoal: null,
    raiseActive: progress?.current_stage === 'FUNDRAISING',
    strongestEvidence: 'No external customer evidence recorded yet.',
    missingEvidence: ['Record qualified customer conversations', 'Ask for a costly commitment'],
    evidence: {
      prospects: 0,
      qualifiedProspects: 0,
      outreachSent: 0,
      replies: 0,
      interviews: 0,
      commitments: 0,
      payingCustomers: 0,
      retentionSignals: 0,
      channelReviews: 0,
      thisWeek: 0,
    },
    primaryAction: {
      key: 'add-first-prospects',
      title: 'Add your first 10 qualified prospects',
      description: 'Start with named people who match the customer problem you want to prove.',
      route: '/bizmap-ai#customer-evidence',
      expectedEvidence: 'prospect_added',
      reason: 'External evidence starts with a concrete list of reachable customers.',
      priority: 3,
    },
    secondaryActions: [],
  };
}

export function useFounderCycle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const posthogFlag = useFeatureFlagEnabled('founder-execution-cycle-v1');
  const betaQuery = useQuery({
    queryKey: ['founder-cycle-beta-access', user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await client
        .from('founder_cycle_state')
        .select('beta_cohort')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data?.beta_cohort === true;
    },
  });
  const betaOverride = import.meta.env.VITE_FOUNDER_CYCLE_V1 !== 'false' && betaQuery.data === true;
  const rolloutEnabled = betaOverride || isFounderCycleRolloutEnabled(user?.id, posthogFlag);

  const query = useQuery({
    queryKey: founderCycleQueryKey(user?.id),
    enabled: Boolean(user?.id) && rolloutEnabled,
    staleTime: 15_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await client.rpc('get_founder_cycle_snapshot_v1');
      if (!error && isFounderCycleSnapshot(data)) return data;
      if (error?.code !== '42883' && error?.code !== 'PGRST202') throw error ?? new Error('Invalid founder cycle snapshot');
      return legacyFallbackSnapshot(user!.id);
    },
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: founderCycleQueryKey(user?.id) });
  }, [queryClient, user?.id]);

  const saveCycleState = useCallback(async (input: {
    businessModel: FounderBusinessModel;
    customerCount: number;
    primaryGoal: string;
    selectedLoop?: FounderLoop;
    raiseActive?: boolean;
    weeklyCapacityHours?: number;
  }) => {
    if (!user) throw new Error('Sign in to save your founder cycle');
    const { error } = await client.rpc('upsert_founder_cycle_state_v1', {
      p_business_model: input.businessModel,
      p_customer_count: input.customerCount,
      p_primary_goal: input.primaryGoal,
      p_selected_loop: input.selectedLoop ?? null,
      p_raise_active: input.raiseActive ?? false,
      p_weekly_capacity_hours: input.weeklyCapacityHours ?? null,
    });
    if (error) throw error;
    await refresh();
  }, [refresh, user]);

  const recordEvidence = useCallback(async (input: {
    eventType: CustomerEvidenceEventType;
    loop?: FounderLoop;
    contactId?: string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
    verificationMode?: EvidenceVerificationMode;
    amount?: number | null;
    currency?: string | null;
    metadata?: Record<string, unknown>;
    idempotencyKey: string;
  }) => {
    if (!user) throw new Error('Sign in to record customer evidence');
    const { data, error } = await client.rpc('record_customer_evidence_event_v1', {
      p_event_type: input.eventType,
      p_active_loop: input.loop ?? query.data?.selectedLoop ?? 'PROVE',
      p_contact_id: input.contactId ?? null,
      p_source_entity_type: input.sourceEntityType ?? null,
      p_source_entity_id: input.sourceEntityId ?? null,
      p_verification_mode: input.verificationMode ?? 'founder_reported',
      p_amount: input.amount ?? null,
      p_currency: input.currency ?? null,
      p_metadata: input.metadata ?? {},
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) throw error;
    await refresh();
    return data;
  }, [query.data?.selectedLoop, refresh, user]);

  const recordActionFeedback = useCallback(async (
    actionKey: string,
    feedbackStatus: 'remind_later' | 'not_relevant',
  ) => {
    if (!user) throw new Error('Sign in to update a cycle recommendation');
    const { error } = await client.rpc('record_founder_cycle_action_feedback_v1', {
      p_action_key: actionKey,
      p_feedback_status: feedbackStatus,
    });
    if (error) throw error;
    await refresh();
  }, [refresh, user]);

  const showCycle = rolloutEnabled
    && Boolean(query.data?.eligible || query.data?.betaCohort || import.meta.env.DEV);

  return useMemo(() => ({
    snapshot: query.data ?? null,
    rolloutEnabled,
    showCycle,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refresh,
    saveCycleState,
    recordEvidence,
    recordActionFeedback,
  }), [
    query.data,
    query.error,
    query.isLoading,
    recordActionFeedback,
    recordEvidence,
    refresh,
    rolloutEnabled,
    saveCycleState,
    showCycle,
  ]);
}
