import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';
import { supabase } from '@/integrations/supabase/client';
import { isFirstCustomerSprintSnapshot } from '@/lib/firstCustomerSprint';
import type {
  FirstCustomerContinuation,
  FirstCustomerDecision,
  FirstCustomerMessageVariant,
  FirstCustomerSprintReviewInput,
  FirstCustomerSprintSnapshot,
} from '@/types/firstCustomerSprint';

// Generated types follow the additive migration deployment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

export const firstCustomerSprintQueryKey = (userId?: string | null) => ['first-customer-sprint-v1', userId] as const;

export function isFirstCustomerSprintKillSwitchEnabled(posthogFlag?: boolean): boolean {
  if (import.meta.env.VITE_FIRST_CUSTOMER_SPRINT_V1 === 'false') return false;
  return posthogFlag === true || import.meta.env.VITE_FIRST_CUSTOMER_SPRINT_V1 === 'true';
}

export function useFirstCustomerSprint() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const posthogFlag = useFeatureFlagEnabled('first-customer-sprint-v1');
  const enabled = isFirstCustomerSprintKillSwitchEnabled(posthogFlag);

  const query = useQuery({
    queryKey: firstCustomerSprintQueryKey(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 10_000,
    retry: 1,
    queryFn: async (): Promise<FirstCustomerSprintSnapshot> => {
      const { data, error } = await client.rpc('get_first_customer_sprint_snapshot_v1');
      if (error) throw error;
      if (!isFirstCustomerSprintSnapshot(data)) throw new Error('Invalid first customer sprint snapshot');
      if (!data.sprint || data.sprint.status !== 'completed') return data;
      const continuation = await client.rpc('get_first_customer_sprint_continuation_v1', { p_sprint_id: data.sprint.id });
      if (continuation.error) throw continuation.error;
      return { ...data, continuation: (continuation.data ?? { paid: false }) as FirstCustomerContinuation };
    },
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: firstCustomerSprintQueryKey(user?.id) }),
      queryClient.invalidateQueries({ queryKey: ['founder-customer-contacts', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['founder-cycle-v1', user?.id] }),
    ]);
  }, [queryClient, user?.id]);

  const run = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: refresh,
  });

  const start = useCallback(async (input: {
    offer: string; targetSegment: string; problemHypothesis: string; proofUrl?: string;
    proofDescription?: string; estimatedCustomerValueUsd: number; weeklyCapacityHours: number;
    mentorDecisionQuestion?: string;
  }) => run.mutateAsync(async () => {
    const { data, error } = await client.rpc('start_first_customer_sprint_v1', {
      p_offer: input.offer, p_target_segment: input.targetSegment,
      p_problem_hypothesis: input.problemHypothesis, p_proof_url: input.proofUrl || null,
      p_proof_description: input.proofDescription || null,
      p_estimated_customer_value_usd: input.estimatedCustomerValueUsd,
      p_weekly_capacity_hours: input.weeklyCapacityHours,
      p_mentor_decision_question: input.mentorDecisionQuestion || null,
    });
    if (error) throw error;
    return data;
  }), [run]);

  const update = useCallback(async (sprintId: string, patch: Record<string, unknown>) => run.mutateAsync(async () => {
    const { data, error } = await client.rpc('update_first_customer_sprint_v1', { p_sprint_id: sprintId, p_patch: patch });
    if (error) throw error;
    return data;
  }), [run]);

  const attachContact = useCallback(async (sprintId: string, contactId: string, messageVariantKey?: string | null) => run.mutateAsync(async () => {
    const { data, error } = await client.rpc('attach_first_customer_sprint_contact_v1', {
      p_sprint_id: sprintId, p_contact_id: contactId, p_message_variant_key: messageVariantKey ?? null,
    });
    if (error) throw error;
    return data;
  }), [run]);

  const generateMessages = useCallback(async (sprintId: string) => run.mutateAsync(async () => {
    const { data, error } = await client.functions.invoke('first-customer-sprint-assistant', {
      body: { action: 'generate_messages', sprintId },
    });
    if (error) throw error;
    return data as { variants: FirstCustomerMessageVariant[]; fallback: boolean };
  }), [run]);

  const requestCheckpoint = useCallback(async (
    sprintId: string,
    mentorId: string,
    redactedBrief: Record<string, unknown>,
  ) => run.mutateAsync(async () => {
    const { data, error } = await client.rpc('request_first_customer_sprint_checkpoint_v1', {
      p_sprint_id: sprintId,
      p_mentor_id: mentorId,
      p_redacted_brief: redactedBrief,
    });
    if (error) throw error;
    return data;
  }), [run]);

  const complete = useCallback(async (sprintId: string, decision: FirstCustomerDecision, notes: string) => run.mutateAsync(async () => {
    const { data, error } = await client.rpc('complete_first_customer_sprint_v1', {
      p_sprint_id: sprintId, p_final_decision: decision, p_final_notes: notes || null,
    });
    if (error) throw error;
    return data;
  }), [run]);

  const submitReview = useCallback(async (sprintId: string, input: FirstCustomerSprintReviewInput) => run.mutateAsync(async () => {
    const { data, error } = await client.rpc('submit_first_customer_sprint_review_v1', {
      p_sprint_id: sprintId,
      p_value_score: input.valueScore,
      p_primary_value: input.primaryValue,
      p_primary_friction: input.primaryFriction,
      p_would_recommend: input.wouldRecommend,
      p_review_note: input.reviewNote || null,
    });
    if (error) throw error;
    return data;
  }), [run]);

  return useMemo(() => ({
    enabled,
    enrolled: Boolean(query.data?.enrolled),
    snapshot: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    isSaving: run.isPending,
    refresh, start, update, attachContact, generateMessages, requestCheckpoint, complete, submitReview,
  }), [attachContact, complete, enabled, generateMessages, query.data, query.error, query.isLoading, refresh, requestCheckpoint, run.isPending, start, submitReview, update]);
}
