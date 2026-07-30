import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  bestPriorByFamily,
  fatigueForFamily,
  rankWithCollectiveEvidence,
  selectSafeExploration,
  type FamilyHealth,
  type LearningCandidate,
  type LearningPrior,
  type LearningTuning,
} from '../supabase/functions/_shared/recommendation-policy-v2.ts';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');
const migrationPath = '../supabase/migrations/20260730210000_recommendation_learning_hardening_v2.sql';

const candidates: LearningCandidate[] = [
  { key: 'first', toolKey: 'icp_builder', urgency: 'high', reasonCodes: [], estimatedMinutes: 10 },
  { key: 'second', toolKey: 'pmf_lab', urgency: 'high', reasonCodes: [], estimatedMinutes: 10 },
  { key: 'third', toolKey: 'gtm_strategist', urgency: 'high', reasonCodes: [], estimatedMinutes: 10 },
];

const tuning: LearningTuning = {
  explorationPercent: 5,
  explorationMinSamples: 3,
  maxExplorationNegativeRate: 0.2,
  frequencyWindowDays: 7,
  frequencyCap: 3,
  diversityWindowDays: 3,
  repeatPenalty: 0.08,
};

function prior(
  family: string,
  lowerBound: number,
  samples = 30,
  negativeRate = 0.05,
): LearningPrior {
  return {
    segment_key: 'stage:2|goal:validate',
    recommendation_family: family,
    matured_exposures: samples,
    unique_users: Math.max(5, Math.floor(samples / 2)),
    bayesian_mean: Math.min(1, lowerBound + 0.1),
    bayesian_lower_bound: lowerBound,
    posterior_variance: 0.01,
    negative_rate: negativeRate,
  };
}

test('1. Bayesian evidence uses conservative posterior bounds and unique-user thresholds', async () => {
  const migration = await read(migrationPath);
  assert.match(migration, /bayesian_prior_strength/);
  assert.match(migration, /bayesian_alpha/);
  assert.match(migration, /bayesian_beta/);
  assert.match(migration, /bayesian_lower_bound/);
  assert.match(migration, /posterior_mean - 1\.64 \* sqrt/);
  assert.match(migration, /unique_users >= v_config\.min_unique_users/);

  const evidence = bestPriorByFamily(
    [prior('icp_builder', 0.2), prior('pmf_lab', 0.8)],
    ['global', 'stage:2|goal:validate'],
  );
  const ranked = rankWithCollectiveEvidence({
    candidates,
    baseOrder: candidates.map((candidate) => candidate.key),
    priors: evidence,
    recentExposures: [],
    tuning,
  });
  assert.equal(ranked.orderedCandidateKeys[0], 'second');
});

test('2. exploration is uncertainty-aware, deterministic, and rejects unsafe families', async () => {
  const ranker = await read('../supabase/functions/rank-dashboard-actions/index.ts');
  assert.match(ranker, /selectSafeExploration/);
  assert.match(ranker, /uncertainty_safe_v2/);
  assert.match(ranker, /no_safe_alternative/);
  assert.match(ranker, /selectionProbability/);

  const priors = bestPriorByFamily(
    [prior('pmf_lab', 0.5, 2), prior('gtm_strategist', 0.6, 2)],
    ['global', 'stage:2|goal:validate'],
  );
  const health = new Map<string, FamilyHealth>([
    ['pmf_lab', {
      recommendation_family: 'pmf_lab',
      status: 'critical',
      current_negative_rate: 0.4,
      reward_drift: -0.6,
    }],
    ['gtm_strategist', {
      recommendation_family: 'gtm_strategist',
      status: 'healthy',
      current_negative_rate: 0.02,
      reward_drift: 0.1,
    }],
  ]);
  assert.equal(selectSafeExploration({
    orderedCandidateKeys: ['first', 'second', 'third'],
    candidates,
    priors,
    health,
    recentExposures: [],
    tuning,
    seed: 'stable',
  }), 'third');
});

test('3. artifact and business outcome attribution requires explicit provenance and last touch', async () => {
  const migration = await read(migrationPath);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_attributions/);
  assert.match(migration, /UNIQUE \(source_event_id, outcome_type\)/);
  assert.match(migration, /explicit_last_touch_v2/);
  assert.match(migration, /a\.source_tool = d\.selected_tool_key/);
  assert.match(migration, /a\.activity_data->>'recommendation_key' = d\.selected_key/);
  assert.match(migration, /business_milestone/);
});

test('4. delayed outcomes have an idempotent maturation queue through D30', async () => {
  const migration = await read(migrationPath);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_maturation_queue/);
  assert.match(migration, /artifact_24h_due_at/);
  assert.match(migration, /completion_7d_due_at/);
  assert.match(migration, /d30_due_at/);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(migration, /recommendation-delayed-outcomes-hourly-v2/);
});

test('5. per-user weekly contribution caps prevent highly active users dominating priors', async () => {
  const migration = await read(migrationPath);
  assert.match(migration, /PARTITION BY user_id, policy_version, recommendation_family, exposure_week/);
  assert.match(migration, /WHERE contribution_rank = 1/);
  assert.match(migration, /count\(DISTINCT user_id\)/);
  assert.match(migration, /d\.assignment <> 'control'/);
});

test('6. offline replay logs propensity, coverage, agreement, and a capped estimator', async () => {
  const migration = await read(migrationPath);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_policy_replays/);
  assert.match(migration, /selection_probability/);
  assert.match(migration, /capped_inverse_propensity_v2/);
  assert.match(migration, /least\(10, 1 \/ greatest/);
  assert.match(migration, /min_replay_coverage/);
});

test('7. drift monitoring detects reward, feedback, replay, and pipeline failures', async () => {
  const migration = await read(migrationPath);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_family_health/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_quality_alerts/);
  for (const alert of ['reward_drift', 'negative_feedback', 'pipeline_delay', 'replay_coverage']) {
    assert.match(migration, new RegExp(alert));
  }
  assert.match(migration, /auto_pause_critical_drift/);
  assert.match(migration, /recommendation-quality-monitor-daily-v2/);
});

test('8. frequency caps and diversity penalties reduce fatigue without blocking urgent alternatives', async () => {
  const now = new Date('2026-07-30T12:00:00.000Z');
  const recent = [
    { selected_tool_key: 'icp_builder', shown_at: '2026-07-30T10:00:00.000Z' },
    { selected_tool_key: 'icp_builder', shown_at: '2026-07-29T10:00:00.000Z' },
    { selected_tool_key: 'icp_builder', shown_at: '2026-07-28T10:00:00.000Z' },
  ];
  const fatigue = fatigueForFamily('icp_builder', recent, tuning, now);
  assert.equal(fatigue.capped, true);
  assert.ok(fatigue.penalty > 0);

  const ranked = rankWithCollectiveEvidence({
    candidates,
    baseOrder: candidates.map((candidate) => candidate.key),
    priors: new Map(),
    recentExposures: recent,
    tuning,
    now,
  });
  assert.notEqual(ranked.orderedCandidateKeys[0], 'first');
});
