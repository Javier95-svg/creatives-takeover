import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('1. every recommendation decision persists its complete choice and policy context', async () => {
  const [migration, provider] = await Promise.all([
    read('../supabase/migrations/20260730180000_collective_recommendation_learning_v1.sql'),
    read('../src/contexts/DashboardDataContext.tsx'),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_decisions/);
  assert.match(migration, /candidate_set jsonb NOT NULL/);
  assert.match(migration, /selected_key text NOT NULL/);
  assert.match(migration, /deterministic_key text NOT NULL/);
  assert.match(migration, /context_segments jsonb NOT NULL/);
  assert.match(migration, /UNIQUE \(user_id, decision_key\)/);
  assert.match(provider, /recordRecommendationDecision/);
  assert.match(provider, /candidates: decision\.candidates\.map/);
});

test('2. outcomes are idempotent and attributed only inside explicit activation and return windows', async () => {
  const migration = await read('../supabase/migrations/20260730180000_collective_recommendation_learning_v1.sql');

  assert.match(migration, /UNIQUE \(decision_id, outcome_type\)/);
  assert.match(migration, /'artifact_24h'/);
  assert.match(migration, /'tool_milestone_completed', 'dashboard_inline_action_completed'/);
  assert.match(migration, /'tool_completion_7d'/);
  assert.match(migration, /d\.shown_at \+ interval '24 hours'/);
  assert.match(migration, /'24h-48h'/);
  assert.match(migration, /'144h-192h'/);
  assert.match(migration, /ON CONFLICT \(decision_id, outcome_type\) DO NOTHING/);
});

test('3. privacy-safe hierarchical segment priors use minimum samples and Bayesian smoothing', async () => {
  const migration = await read('../supabase/migrations/20260730180000_collective_recommendation_learning_v1.sql');
  const contextFunction = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION public.get_recommendation_context_v1'),
    migration.indexOf('CREATE OR REPLACE FUNCTION public.recommendation_segment_keys_v1'),
  );

  for (const segment of ['stage', 'goal', 'blocker', 'capacityBand', 'plan', 'confidenceBand']) {
    assert.match(contextFunction, new RegExp(`'${segment}'`));
  }
  assert.doesNotMatch(contextFunction, /startupBrief|country|full_name|email/);
  assert.match(migration, /a\.exposures >= v_min_samples/);
  assert.match(migration, /\(a\.reward_sum \+ 20 \* g\.mean_reward\) \/ \(a\.exposures \+ 20\)/);
});

test('4. the ranker combines eligible collective priors with a bounded base score', async () => {
  const [ranker, policy] = await Promise.all([
    read('../supabase/functions/rank-dashboard-actions/index.ts'),
    read('../supabase/functions/_shared/recommendation-policy-v2.ts'),
  ]);

  assert.match(ranker, /recommendation_segment_priors/);
  assert.match(ranker, /assignment === "control" \|\| !allowAi/);
  assert.match(ranker, /bayesian_lower_bound/);
  assert.match(ranker, /rankWithCollectiveEvidence/);
  assert.match(policy, /collectiveScore \* evidenceWeight/);
  assert.match(policy, /evidence\.uniqueUsers \/ \(evidence\.uniqueUsers \+ 12\)/);
  assert.match(ranker, /bestPriorByFamily/);
  assert.match(policy, /rowSpecificity > currentSpecificity/);
});

test('5. structured negative feedback suppresses bad repeats without storing free text', async () => {
  const [migration, feedback] = await Promise.all([
    read('../supabase/migrations/20260730180000_collective_recommendation_learning_v1.sql'),
    read('../src/components/dashboard/RecommendationFeedback.tsx'),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_user_suppressions/);
  assert.match(migration, /WHEN 'already_completed' THEN now\(\) \+ interval '365 days'/);
  assert.match(migration, /WHEN 'too_much_time' THEN now\(\) \+ interval '7 days'/);
  assert.match(feedback, /recordRecommendationFeedback/);
  assert.match(feedback, /invalidateQueries\(\{ queryKey: \['dashboard-action-ranking'\] \}\)/);
  for (const reason of ['already_completed', 'wrong_stage', 'wrong_goal', 'too_much_time']) {
    assert.match(feedback, new RegExp(reason));
  }
});

test('6. exploration and control are deterministic, capped, and never invent actions', async () => {
  const [ranker, policy] = await Promise.all([
    read('../supabase/functions/rank-dashboard-actions/index.ts'),
    read('../supabase/functions/_shared/recommendation-policy-v2.ts'),
  ]);

  assert.match(ranker, /stableHash\(`\$\{userId\}:\$\{config\.active_policy_version\}:holdout`\)/);
  assert.match(ranker, /config\.exploration_percent/);
  assert.match(ranker, /selectSafeExploration/);
  assert.match(policy, /\.slice\(1, 4\)/);
  assert.match(policy, /familyHealth\?\.status === "critical"/);
  assert.match(ranker, /urgencyWeight/);
  assert.match(ranker, /urgencyWeight\[candidate\.urgency\] === highestUrgency/);
  assert.match(ranker, /const allowed = new Set\(candidates\.map/);
  assert.match(ranker, /allowed\.has\(key\)/);
});

test('7. offline evaluation requires matured cohorts and can pause unsafe learning', async () => {
  const migration = await read('../supabase/migrations/20260730180000_collective_recommendation_learning_v1.sql');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.recommendation_policy_evaluations/);
  assert.match(migration, /v_matured_d7 < v_config\.min_matured_d7/);
  assert.match(migration, /negative_feedback_guardrail/);
  assert.match(migration, /artifact_rate_guardrail/);
  assert.match(migration, /SET status = 'paused'/);
});

test('8. attribution and policy recalibration run automatically and remain observable', async () => {
  const [migration, admin] = await Promise.all([
    read('../supabase/migrations/20260730180000_collective_recommendation_learning_v1.sql'),
    read('../src/pages/AdminAnalytics.tsx'),
  ]);

  assert.match(migration, /recommendation-outcome-attribution-hourly/);
  assert.match(migration, /recommendation-policy-recalibration-weekly/);
  assert.match(migration, /get_recommendation_learning_report_v1/);
  assert.match(admin, /Collective recommendation learning/);
  assert.match(admin, /get_recommendation_learning_report_v2/);
});

test('visible command center uses learned actions while preserving safe fallbacks', async () => {
  const [shell, journey, feedback, mission, firstAction, learningClient] = await Promise.all([
    read('../src/components/dashboard/DashboardShell.tsx'),
    read('../src/components/dashboard/FounderJourneyPanel.tsx'),
    read('../src/components/dashboard/RecommendationFeedback.tsx'),
    read('../src/hooks/useDailyMission.ts'),
    read('../src/components/dashboard/FirstResultActivationCard.tsx'),
    read('../src/lib/recommendationLearning.ts'),
  ]);

  assert.match(shell, /<DashboardDataProvider>/);
  assert.match(shell, /DashboardFrameWithData/);
  assert.match(journey, /useDashboardFocus/);
  assert.match(journey, /recordRecommendationOutcome/);
  assert.match(journey, /recordExposure=\{false\}/);
  assert.match(feedback, /surface_baseline_v1/);
  assert.match(mission, /outcomeType: 'completed'/);
  assert.match(firstAction, /outcomeType: 'opened'/);
  assert.match(learningClient, /error\?\.code === 'P0002'/);
  assert.match(learningClient, /waitForExposure\(300\)/);
});
