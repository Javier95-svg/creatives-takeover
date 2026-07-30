import { supabase } from '@/integrations/supabase/client';

export type RecommendationSurface = 'command_center' | 'daily_mission' | 'first_action';
export type RecommendationAssignment = 'control' | 'learned' | 'explore' | 'baseline';
export type RecommendationFeedbackReason =
  | 'already_completed'
  | 'wrong_stage'
  | 'wrong_goal'
  | 'too_much_time';

export interface RecommendationCandidateExposure {
  key: string;
  toolKey: string;
  urgency?: string;
  reasonCodes?: string[];
  estimatedMinutes?: number;
}

export interface RecommendationDecisionInput {
  decisionKey: string;
  surface: RecommendationSurface;
  snapshotHash?: string;
  candidates: RecommendationCandidateExposure[];
  selectedKey: string;
  selectedToolKey: string;
  deterministicKey: string;
  policyVersion: string;
  assignment: RecommendationAssignment;
  model?: string | null;
  scoreDiagnostics?: Record<string, unknown>;
}

// Generated database types are refreshed after the additive migration is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

async function waitForExposure(delayMs: number) {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export function recommendationDecisionKey(
  surface: RecommendationSurface,
  recommendationKey: string,
  snapshotHash = 'surface',
) {
  const localDate = new Intl.DateTimeFormat('en-CA').format(new Date());
  return `${surface}:${snapshotHash}:${recommendationKey}:${localDate}`.slice(0, 180);
}

export async function recordRecommendationDecision(input: RecommendationDecisionInput) {
  const { data, error } = await client.rpc('record_recommendation_decision_v1', {
    p_decision_key: input.decisionKey,
    p_surface: input.surface,
    p_snapshot_hash: input.snapshotHash ?? null,
    p_candidate_set: input.candidates.map((candidate) => ({
      key: candidate.key,
      toolKey: candidate.toolKey,
      urgency: candidate.urgency ?? null,
      reasonCodes: candidate.reasonCodes ?? [],
      estimatedMinutes: candidate.estimatedMinutes ?? null,
    })),
    p_selected_key: input.selectedKey,
    p_selected_tool_key: input.selectedToolKey,
    p_deterministic_key: input.deterministicKey,
    p_policy_version: input.policyVersion,
    p_assignment: input.assignment,
    p_model: input.model ?? null,
    p_score_diagnostics: input.scoreDiagnostics ?? {},
  });
  if (error) throw error;
  return data;
}

export async function recordRecommendationOutcome(input: {
  recommendationKey: string;
  surface: RecommendationSurface;
  outcomeType: 'opened' | 'completed';
  source?: string;
}) {
  const payload = {
    p_recommendation_key: input.recommendationKey,
    p_surface: input.surface,
    p_outcome_type: input.outcomeType,
    p_metadata: { source: input.source ?? input.surface },
  };
  let { data, error } = await client.rpc('record_recommendation_outcome_v1', payload);
  if (error?.code === 'P0002') {
    await waitForExposure(300);
    ({ data, error } = await client.rpc('record_recommendation_outcome_v1', payload));
  }
  if (error) throw error;
  return data;
}

export async function recordRecommendationFeedback(input: {
  recommendationKey: string;
  surface: RecommendationSurface;
  relevance: 'helpful' | 'not_relevant';
  reason?: RecommendationFeedbackReason;
}) {
  const payload = {
    p_recommendation_key: input.recommendationKey,
    p_surface: input.surface,
    p_relevance: input.relevance,
    p_reason: input.reason ?? null,
  };
  let { data, error } = await client.rpc('record_recommendation_feedback_v1', payload);
  if (error?.code === 'P0002') {
    await waitForExposure(300);
    ({ data, error } = await client.rpc('record_recommendation_feedback_v1', payload));
  }
  if (error) throw error;
  return data;
}
