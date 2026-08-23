import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  B2B_ACQUISITION_FUNNEL,
  DEMO_ACQUISITION_FUNNEL,
  STARTUP_STAGE_EXECUTION_LOOPS,
  buildGTMActionPacket,
  evaluateDecisionReadiness,
  normalizeAcquisitionMetric,
  selectExecutableGTMPlays,
} from '../src/lib/marketExperiment.ts';
import type { GTMPlanV2, GTMPlay } from '../src/lib/gtmV2.ts';

const primary: GTMPlay = {
  id: 'primary-play', channelId: 'outreach', channelName: 'Founder outreach', status: 'active',
  audience: 'VP Revenue at 20–100 person SaaS companies', buyingTrigger: 'Pipeline falls below target',
  offer: 'A 20-minute signal audit', message: 'I noticed your pipeline coverage changed. Worth comparing notes?',
  hypothesis: 'Twenty named prospects will produce three qualified meetings.', actions: ['Build 20 named prospects', 'Send the approved message', 'Follow up once'],
  metric: 'Qualified meetings', target: 3, weeklyTimeHours: 5, weeklyBudget: 0, requiredAssets: ['Demo'], recommendedDirectoryIds: [],
  structuredKillRule: { metric: 'Qualified meetings', operator: 'lt', threshold: 2, observationWindowWeeks: 2, minSampleSize: 20 },
};
const fallback: GTMPlay = { ...primary, id: 'fallback-play', channelId: 'linkedin', channelName: 'LinkedIn', status: 'backlog' };
const deferred: GTMPlay = { ...primary, id: 'deferred-play', channelId: 'paid', channelName: 'Paid ads', status: 'backlog' };

const plan = {
  messaging: { ctaCopy: 'Book the signal audit' },
  channels: [
    { id: 'outreach', role: 'primary' },
    { id: 'linkedin', role: 'secondary' },
    { id: 'paid', role: 'deferred' },
  ],
  plays: [primary, fallback, deferred],
} as unknown as GTMPlanV2;

test('overlays PROVE, SELL, GROW, and RAISE without changing the seven stages', () => {
  assert.deepEqual(Object.keys(STARTUP_STAGE_EXECUTION_LOOPS), [
    'IDENTITY', 'PROTOTYPE', 'VALIDATING', 'BUILDING', 'LAUNCH', 'TRACTION', 'FUNDRAISING',
  ]);
  assert.equal(STARTUP_STAGE_EXECUTION_LOOPS.IDENTITY, 'PROVE');
  assert.equal(STARTUP_STAGE_EXECUTION_LOOPS.LAUNCH, 'SELL');
  assert.equal(STARTUP_STAGE_EXECUTION_LOOPS.TRACTION, 'GROW');
  assert.equal(STARTUP_STAGE_EXECUTION_LOOPS.FUNDRAISING, 'RAISE');
});

test('founder-reported evidence can pass a target but cannot become CT Verified', () => {
  const founderOnly = evaluateDecisionReadiness({
    targetValue: 3, observedValue: 4, minimumSampleSize: 20, sampleSize: 20,
    verificationModes: ['founder_reported'],
  });
  assert.equal(founderOnly.result, 'passed');
  assert.equal(founderOnly.evidenceLevel, 'founder_reported');
  assert.equal(founderOnly.ctVerified, false);
  assert.match(founderOnly.missingEvidence.join(' '), /platform-recorded|reviewer-verified/);
});

test('both passed and failed externally observed experiments can be CT Verified', () => {
  const passed = evaluateDecisionReadiness({
    targetValue: 3, observedValue: 4, minimumSampleSize: 20, sampleSize: 20,
    verificationModes: ['platform_verified'],
  });
  const failed = evaluateDecisionReadiness({
    targetValue: 3, observedValue: 0, minimumSampleSize: 20, sampleSize: 20,
    verificationModes: ['reviewer_verified'],
  });
  assert.equal(passed.result, 'passed');
  assert.equal(failed.result, 'failed');
  assert.equal(passed.ctVerified, true);
  assert.equal(failed.ctVerified, true);
  assert.equal(failed.recommendedDecision, 'kill');
});

test('GTM exposes one primary play, one fallback, and an executable B2B action packet', () => {
  assert.deepEqual(selectExecutableGTMPlays(plan).map((play) => play.id), ['primary-play', 'fallback-play']);
  const packet = buildGTMActionPacket(plan, primary, { id: 'demo-1', publicId: 'proof', title: 'Signal demo', url: 'https://example.com/demo/proof' });
  assert.equal(packet.targetMetric, 'meetings');
  assert.equal(packet.minimumSampleSize, 20);
  assert.equal(packet.dailyQuota, 4);
  assert.equal(packet.demo?.id, 'demo-1');
  assert.match(packet.prospectCriteria, /VP Revenue/);
  assert.equal(normalizeAcquisitionMetric('Positive replies'), 'positive_replies');
  assert.equal(normalizeAcquisitionMetric('demo_completions'), 'demo_completions');
  assert.deepEqual(B2B_ACQUISITION_FUNNEL.slice(0, 4), ['prospects', 'sent', 'delivered', 'replies']);
  assert.ok(DEMO_ACQUISITION_FUNNEL.includes('cta_clicks'));
});

test('migration enforces immutable versions, metric-level evidence, Demo de-duplication, RLS, and mentor access', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260823160000_ct_verified_acquisition_loop.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.market_experiments/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.market_experiment_observations/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.market_experiment_decisions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.verification_claims/);
  assert.match(migration, /Pre-registered experiment inputs are immutable/);
  assert.match(migration, /verification_mode = 'founder_reported'/);
  assert.match(migration, /UNIQUE \(experiment_id, idempotency_key\)/);
  assert.match(migration, /ON CONFLICT \(experiment_id, idempotency_key\) DO NOTHING/);
  assert.match(migration, /COALESCE\(NEW\.owner_view, false\) IS TRUE/);
  assert.match(migration, /create_next_market_experiment_version_v1/);
  assert.match(migration, /v_parent\.id, v_parent\.version \+ 1/);
  assert.match(migration, /v_external_sample > 0/);
  assert.match(migration, /v_has_external_target OR v_result_value = 0/);
  assert.match(migration, /'legacy', 'legacy_pre_ct_v1'/);
  assert.match(migration, /outcome\.status = 'verified'/);
  assert.match(migration, /sync_first_customer_contact_to_market_experiment_v1/);
  assert.match(migration, /sync_first_customer_event_to_market_experiment_v1/);
  assert.match(migration, /'first_customer_sprint_event'.*'founder_reported'/s);
  assert.match(migration, /successor\.parent_experiment_id = experiment\.id/);
  assert.match(migration, /result IN \('passed', 'failed', 'inconclusive'\)/);
  assert.match(migration, /ct_access_unlocks/);
  assert.match(migration, /consumed_at = now\(\)/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
});

test('tool readiness and claim verification stay separate in GTM and Traction', () => {
  const outcome = readFileSync(new URL('../src/lib/gtmOutcome.ts', import.meta.url), 'utf8');
  const traction = readFileSync(new URL('../src/pages/TractionEnginePage.tsx', import.meta.url), 'utf8');
  const sprint = readFileSync(new URL('../src/pages/FirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(outcome, /tractionSprintCreated \? "verified"/);
  assert.match(outcome, /status: planReady \? "ready" : "draft"/);
  assert.match(traction, /artifactType: 'traction_decision_ledger'/);
  assert.match(traction, /verificationMode: 'founder_reported'/);
  assert.match(traction, /retention snapshot cannot upgrade this signal/);
  assert.match(sprint, /sprintApi\.ctMentorUnlocked/);
});
