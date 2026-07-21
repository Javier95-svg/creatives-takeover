import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { evaluateOutcomeContract } from '../supabase/functions/_shared/outcome-contracts.ts';
import { assessPmfEvidence } from '../supabase/functions/_shared/pmf-evidence.ts';
import { calculateConsecutiveLoggedWeeks, recommendTractionDecision } from '../src/lib/tractionEngine.ts';
import { evaluateGTMKillRule } from '../src/lib/gtmV2.ts';

const allTrue = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, true]));

test('server-authoritative contracts never promote an incomplete artifact', () => {
  const icp = evaluateOutcomeContract({ tool: 'icp_builder', qualityChecks: allTrue([
    'primary_segment', 'non_fit_segment', 'three_ranked_pains', 'buying_trigger', 'current_alternative',
    'reachable_channels', 'confidence_level', 'assumptions_registered', 'five_interview_plan',
  ]) });
  assert.equal(icp.status, 'draft');
  assert.equal(icp.nextAction, 'Add at least one valid, non-placeholder market citation.');

  const demo = evaluateOutcomeContract({ tool: 'demo_studio', qualityChecks: allTrue([
    'interactive_steps', 'working_hotspots', 'captions_complete', 'single_cta', 'lead_capture', 'analytics',
    'mobile_ready', 'published', 'no_unresolved_placeholders',
  ]) });
  assert.equal(demo.status, 'draft');
  assert.equal(demo.nextAction, 'Repair every broken interaction.');
});

test('ready and verified have consistent meanings across the contracts', () => {
  const ready = evaluateOutcomeContract({ tool: 'traction_engine', qualityChecks: allTrue([
    'six_consecutive_weeks', 'three_distinct_decision_weeks', 'source_badges', 'acquisition_efficiency',
    'retention', 'revenue_where_available', 'decision_recommendations', 'exportable_report',
  ]), verificationMode: 'founder_reported' });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.verificationMode, 'founder_reported');

  const verified = evaluateOutcomeContract({
    tool: 'traction_engine',
    qualityChecks: { ...Object.fromEntries(ready.checks.map((check) => [check.id, true])), three_verified_weeks: true },
    verificationMode: 'platform_verified',
  });
  assert.equal(verified.status, 'verified');
  assert.equal(verified.verificationMode, 'platform_verified');
});

test('PMF deduplicates participants and discounts thin interview records', () => {
  const rich = {
    sourceLeadId: 'lead-1', intervieweeName: 'A', segment: 'Founder',
    mainFeedback: 'A sufficiently detailed explanation of the recurring customer problem.',
    objections: 'A sufficiently detailed objection about switching from the current workflow.',
    missingFeatures: 'A sufficiently detailed feature request grounded in their workflow.',
  };
  const assessment = assessPmfEvidence({
    interviews: [rich, { ...rich, id: 'duplicate' }, { intervieweeName: 'B', segment: 'Founder', mainFeedback: 'Short' }],
    surveyResponses: 0,
    verifiedDemoBehaviors: 0,
    researchSources: 5,
  });
  assert.equal(assessment.independentInterviewCount, 2);
  assert.equal(assessment.duplicateEvidenceCount, 1);
  assert.deepEqual(assessment.interviewWeights, [1, 0.25]);
  assert.equal(assessment.grade, 'insufficient');
});

test('traction readiness requires consecutive weeks and generates evidence-based decisions', () => {
  assert.equal(calculateConsecutiveLoggedWeeks(['2026-07-13', '2026-07-06', '2026-06-29', '2026-06-15']), 3);
  assert.equal(calculateConsecutiveLoggedWeeks(['2026-07-13', '2026-07-06', '2026-06-29', '2026-06-22', '2026-06-15', '2026-06-08']), 6);
  assert.equal(recommendTractionDecision({ pass: true, efficiencyScore: 70, retentionHealthScore: 65, sampleSize: 10 }), 'double_down');
  assert.equal(recommendTractionDecision({ pass: false, efficiencyScore: 20, retentionHealthScore: 20, sampleSize: 10 }), 'kill');
  assert.equal(recommendTractionDecision({ pass: false, efficiencyScore: 50, retentionHealthScore: 60, sampleSize: 3 }), 'iterate');
});

test('structured GTM kill rules wait for the sample and evaluate measured windows', () => {
  const rule = { metric: 'Replies', operator: 'lt' as const, threshold: 3, observationWindowWeeks: 3, minSampleSize: 12 };
  assert.equal(evaluateGTMKillRule(rule, [{ value: 1, sampleSize: 4 }]), 'collecting');
  assert.equal(evaluateGTMKillRule(rule, [{ value: 1, sampleSize: 4 }, { value: 2, sampleSize: 4 }, { value: 1, sampleSize: 4 }]), 'triggered');
  assert.equal(evaluateGTMKillRule(rule, [{ value: 4, sampleSize: 4 }, { value: 2, sampleSize: 4 }, { value: 5, sampleSize: 4 }]), 'on_track');
});

test('migration provides immutable versions, idempotent handoffs, and atomic GTM activation', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260719150000_journey_outcome_enforcement.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.journey_outcome_versions/);
  assert.match(migration, /snapshot_journey_outcome_version/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.journey_handoffs/);
  assert.match(migration, /UNIQUE \(user_id, idempotency_key\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.activate_gtm_play_v2/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.journey_assumption_signals/);
  assert.match(migration, /BEFORE UPDATE OF statement, status, latest_source_tool/);
});

test('the outcome service reloads owned artifacts and versions attributed assumption evidence', () => {
  const service = readFileSync(new URL('../supabase/functions/journey-outcome-service/index.ts', import.meta.url), 'utf8');
  assert.match(service, /loadAuthoritativeChecks\(supabase, user\.id, tool, artifactId\)/);
  assert.match(service, /record_assumption_signal/);
  assert.match(service, /participant_fingerprint/);
  assert.match(service, /five_interview_signals: independentSignals >= 5/);
  assert.match(service, /source_version_id/);
  assert.match(service, /provenance: `journey_handoff:/);
  assert.match(service, /consumed_artifact_id: artifactId/);
});

test('MVP Builder opens with an empty typing bar and never auto-loads evidence into it', () => {
  const builder = readFileSync(new URL('../src/components/mvp-builder/MVPBuilderChat.tsx', import.meta.url), 'utf8');

  assert.match(builder, /const \[input, setInput\] = useState\(''\)/);
  assert.doesNotMatch(builder, /automatic_evidence_prefill/);
  assert.doesNotMatch(builder, /handleBuildFromEvidence\(\{\s*quiet:\s*true\s*\}\)/);
});

test('Demo and MVP publication paths enforce structural checks before publishing', () => {
  const demoApi = readFileSync(new URL('../src/lib/demoStudio/api.ts', import.meta.url), 'utf8');
  const mvpPublish = readFileSync(new URL('../supabase/functions/mvp-builder-publish/index.ts', import.meta.url), 'utf8');
  assert.match(demoApi, /Complete at least two captioned steps and fix every hotspot before publishing/);
  assert.match(mvpPublish, /PUBLICATION_CONTRACT_FAILED/);
  assert.match(mvpPublish, /smokeTest\.runtimeErrors\.length === 0/);
  assert.match(mvpPublish, /lastPublishValidation/);
});

test('PMF interviews and Traction weeks can append attributed ICP confidence signals', () => {
  const pmfForm = readFileSync(new URL('../src/components/pmf/PMFEvidenceForm.tsx', import.meta.url), 'utf8');
  const traction = readFileSync(new URL('../src/pages/TractionEnginePage.tsx', import.meta.url), 'utf8');
  assert.match(pmfForm, /Which ICP assumption did this interview test/);
  assert.match(traction, /ICP assumption tested/);
  assert.match(traction, /recordJourneyAssumptionSignal/);
  assert.match(traction, /It never rewrites the original customer decision/);
});
