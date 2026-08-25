import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type {
  OutcomeEvidenceInventory,
  OutcomeJourneySnapshot,
  OutcomeJourneyStageKey,
} from '@/lib/outcomeJourney';
import { assessOutcomeJourneyEntry } from '@/lib/outcomeJourney';
import { captureEvent } from '@/lib/analytics';

// Generated Supabase types follow the additive production migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

export type JourneyEvidenceType = 'buyer_response' | 'completed_conversation' | 'commitment' | 'payment';

export interface JourneyEvidenceSubmission {
  id: string;
  user_id: string;
  stage_run_id: string;
  sprint_id: string | null;
  experiment_id: string;
  customer_evidence_event_id: string | null;
  evidence_type: JourneyEvidenceType;
  object_path: string | null;
  safe_summary: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export const outcomeJourneyQueryKey = (userId?: string | null) => ['outcome-journey-v1', userId] as const;

export function useOutcomeJourney() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: outcomeJourneyQueryKey(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 10_000,
    retry: 1,
    queryFn: async (): Promise<OutcomeJourneySnapshot> => {
      const { data, error } = await client.rpc('get_my_outcome_journey_v1');
      if (error) throw error;
      return data as OutcomeJourneySnapshot;
    },
  });
  const evidence = useQuery({
    queryKey: ['journey-evidence-submissions-v1', user?.id],
    enabled: Boolean(user?.id),
    staleTime: 10_000,
    queryFn: async (): Promise<JourneyEvidenceSubmission[]> => {
      const { data, error } = await client.from('journey_evidence_submissions')
        .select('id,user_id,stage_run_id,sprint_id,experiment_id,customer_evidence_event_id,evidence_type,object_path,safe_summary,status,rejection_reason,submitted_at,reviewed_at')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as JourneyEvidenceSubmission[];
    },
  });
  const run = useMutation({ mutationFn: async (operation: () => Promise<unknown>) => operation() });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: outcomeJourneyQueryKey(user?.id) }),
      queryClient.invalidateQueries({ queryKey: ['journey-evidence-submissions-v1', user?.id] }),
    ]);
  }, [queryClient, user?.id]);

  const start = useCallback(async (input: {
    stage?: OutcomeJourneyStageKey;
    evidence?: OutcomeEvidenceInventory;
    cohortKey?: string;
    acquisitionSource?: string;
  }) => run.mutateAsync(async () => {
    const stage = input.stage ?? (input.evidence ? assessOutcomeJourneyEntry(input.evidence) : 'target');
    const { data, error } = await client.rpc('start_outcome_journey_v1', {
      p_entry_stage: stage,
      p_entry_evidence: input.evidence ?? {},
      p_cohort_key: input.cohortKey ?? 'organic',
      p_acquisition_source: input.acquisitionSource ?? null,
    });
    if (error) throw error;
    const journeyId = typeof data === 'object' && data && 'journey' in data
      ? (data as { journey?: { id?: string } }).journey?.id
      : null;
    const stageRunId = typeof data === 'object' && data && 'stageRun' in data
      ? (data as { stageRun?: { id?: string } }).stageRun?.id
      : null;
    captureEvent('outcome_stage_entered', {
      journey_id: journeyId ?? null,
      stage_run_id: stageRunId ?? null,
      stage,
      cohort_key: input.cohortKey ?? 'organic',
      acquisition_source: input.acquisitionSource ?? null,
    });
    await refresh();
    return data;
  }), [refresh, run]);

  const submitEvidence = useCallback(async (input: {
    file: File;
    stageRunId: string;
    sprintId: string;
    experimentId: string;
    customerEvidenceEventId?: string | null;
    evidenceType: JourneyEvidenceType;
    safeSummary: string;
    redactionAttested: boolean;
  }) => run.mutateAsync(async () => {
    if (!user) throw new Error('Sign in to submit evidence.');
    if (!input.redactionAttested) throw new Error('Confirm that the file is redacted.');
    if (input.file.size > 10 * 1024 * 1024) throw new Error('Evidence files must be 10 MB or smaller.');
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(input.file.type)) {
      throw new Error('Upload a PNG, JPEG, WebP, or PDF file.');
    }
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(input.safeSummary)
      || /(full transcript|unredacted|crm export)/i.test(input.safeSummary)) {
      throw new Error('Remove emails, transcripts, and CRM-export details from the summary.');
    }
    const extension = input.file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const objectPath = `${user.id}/${input.stageRunId}/${crypto.randomUUID()}.${extension}`;
    const upload = await client.storage.from('journey-evidence-private').upload(objectPath, input.file, {
      cacheControl: '3600', upsert: false, contentType: input.file.type,
    });
    if (upload.error) throw upload.error;
    const submitted = await client.rpc('submit_journey_evidence_v1', {
      p_stage_run_id: input.stageRunId,
      p_sprint_id: input.sprintId,
      p_experiment_id: input.experimentId,
      p_customer_evidence_event_id: input.customerEvidenceEventId ?? null,
      p_evidence_type: input.evidenceType,
      p_object_path: objectPath,
      p_safe_summary: input.safeSummary,
      p_redaction_attested: input.redactionAttested,
    });
    if (submitted.error) {
      await client.storage.from('journey-evidence-private').remove([objectPath]);
      throw submitted.error;
    }
    captureEvent('journey_evidence_submitted', {
      journey_id: query.data?.journey?.id ?? null,
      stage_run_id: input.stageRunId,
      sprint_id: input.sprintId,
      experiment_id: input.experimentId,
      evidence_type: input.evidenceType,
      review_status: 'pending',
    });
    await refresh();
    return submitted.data as JourneyEvidenceSubmission;
  }), [query.data?.journey?.id, refresh, run, user]);

  return useMemo(() => ({
    snapshot: query.data ?? null,
    evidenceSubmissions: evidence.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    isSaving: run.isPending,
    refresh,
    start,
    submitEvidence,
  }), [evidence.data, query.data, query.error, query.isLoading, refresh, run.isPending, start, submitEvidence]);
}
