import { supabase } from '@/integrations/supabase/client';
import {
  buildGTMActionPacket,
  mapVerificationClaim,
  normalizeAcquisitionMetric,
  type ExperimentDecision,
  type ExperimentObservation,
  type GTMActionPacket,
  type PublishedDemoReference,
  type VerificationClaim,
} from '@/lib/marketExperiment';
import type { GTMPlanV2, GTMPlay } from '@/lib/gtmV2';

export async function findLatestPublishedDemo(userId: string): Promise<PublishedDemoReference | null> {
  const { data, error } = await (supabase as any)
    .from('demo_studio_demos')
    .select('id,public_id,title,updated_at')
    .eq('owner_id', userId)
    .eq('status', 'published')
    .not('public_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.id || !data.public_id) return null;
  return {
    id: data.id,
    publicId: data.public_id,
    title: data.title || 'Published demo',
    url: `${window.location.origin}/demo/${data.public_id}`,
  };
}

export async function preregisterGTMMarketExperiment(input: {
  userId: string;
  planId: string;
  play: GTMPlay;
  plan: GTMPlanV2;
  tractionSprintId: string;
  demo?: PublishedDemoReference | null;
  sourceOutcomeVersions?: Record<string, string>;
}): Promise<{ id: string; actionPacket: GTMActionPacket }> {
  const actionPacket = buildGTMActionPacket(input.plan, input.play, input.demo ?? null);
  const row = {
    user_id: input.userId,
    execution_loop: 'SELL',
    status: 'preregistered',
    hypothesis: input.play.hypothesis,
    audience: input.play.audience || input.plan.intake.targetSegment,
    problem: input.plan.intake.problem,
    buying_trigger: input.play.buyingTrigger || input.plan.intake.buyingTrigger || null,
    offer: input.play.offer,
    message: input.play.message,
    channel: input.play.channelName,
    asset_type: input.demo ? 'demo_studio' : 'gtm_asset',
    asset_id: input.demo?.id ?? (input.plan.assets ?? []).find((asset) => asset.playId === input.play.id)?.id ?? null,
    source_demo_id: input.demo?.id ?? null,
    cta: input.plan.messaging.ctaCopy,
    target_metric: actionPacket.targetMetric,
    target_operator: 'gte',
    target_value: actionPacket.targetValue,
    minimum_sample_size: actionPacket.minimumSampleSize,
    observation_window_days: actionPacket.observationWindowDays,
    kill_rule: input.play.structuredKillRule ?? {},
    action_packet: actionPacket,
    source_outcome_versions: input.sourceOutcomeVersions ?? { gtm: input.plan.generatedAt },
    source_gtm_plan_id: input.planId,
    source_gtm_play_id: input.play.id,
    source_traction_sprint_id: input.tractionSprintId,
    idempotency_key: `gtm:${input.planId}:${input.play.id}:v1`,
    preregistered_at: new Date().toISOString(),
  };
  const { data, error } = await (supabase as any)
    .from('market_experiments')
    .upsert(row, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: false })
    .select('id')
    .single();
  if (error || !data?.id) throw error ?? new Error('Could not pre-register the acquisition experiment.');
  return { id: data.id, actionPacket };
}

export async function recordFounderObservation(input: ExperimentObservation & { userId: string; idempotencyKey: string }): Promise<void> {
  if (input.verificationMode !== 'founder_reported') {
    throw new Error('Founder clients can only record founder-reported observations.');
  }
  const { error } = await (supabase as any).from('market_experiment_observations').upsert({
    experiment_id: input.experimentId,
    user_id: input.userId,
    metric: normalizeAcquisitionMetric(input.metric),
    value: input.value,
    denominator: input.denominator ?? null,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    source_event_ids: input.sourceEventIds ?? [],
    verification_mode: 'founder_reported',
    provenance: input.provenance ?? {},
    idempotency_key: input.idempotencyKey,
    captured_at: input.capturedAt ?? new Date().toISOString(),
  }, { onConflict: 'experiment_id,idempotency_key' });
  if (error) throw error;
}

export async function recordExperimentDecision(input: ExperimentDecision & { userId: string }): Promise<void> {
  const { error } = await (supabase as any).from('market_experiment_decisions').upsert({
    experiment_id: input.experimentId,
    user_id: input.userId,
    decision: input.decision,
    result: input.result,
    changed_variable: input.changedVariable ?? null,
    rationale: input.rationale,
    next_experiment_id: input.nextExperimentId ?? null,
    decided_at: input.decidedAt ?? new Date().toISOString(),
  }, { onConflict: 'experiment_id' });
  if (error) throw error;
}

export async function evaluateMarketExperiment(experimentId: string): Promise<VerificationClaim | null> {
  const { data, error } = await (supabase as any).rpc('evaluate_market_experiment_v1', {
    p_experiment_id: experimentId,
  });
  if (error || !data) throw error ?? new Error('Could not evaluate the experiment evidence.');
  return mapVerificationClaim(data as Record<string, unknown>);
}

export async function createNextMarketExperimentVersion(input: {
  experimentId: string;
  changedVariable: NonNullable<ExperimentDecision['changedVariable']>;
  newValue: string;
}): Promise<{ id: string; version: number }> {
  const { data, error } = await (supabase as any).rpc('create_next_market_experiment_version_v1', {
    p_experiment_id: input.experimentId,
    p_changed_variable: input.changedVariable,
    p_new_value: input.newValue.trim(),
  });
  if (error || !data?.id) throw error ?? new Error('Could not create the next experiment version.');
  return { id: data.id, version: Number(data.version ?? 1) };
}
