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
    'primary_segment', 'non_fit_segment', 'buying_trigger', 'current_alternative',
    'reachable_channels', 'assumptions_registered',
  ]) });
  assert.equal(icp.status, 'draft');
  assert.equal(icp.nextAction, 'Choose the one urgent pain you will test first.');

  const demo = evaluateOutcomeContract({ tool: 'demo_studio', qualityChecks: allTrue([
    'buyer_promise', 'interactive_proof', 'single_cta', 'analytics', 'published', 'no_unresolved_placeholders',
  ]) });
  assert.equal(demo.status, 'draft');
  assert.equal(demo.nextAction, 'Repair every broken interaction.');
});

test('ready and verified have consistent meanings across the contracts', () => {
  const ready = evaluateOutcomeContract({ tool: 'traction_engine', qualityChecks: allTrue([
    'first_cycle_decision', 'two_comparable_cycles', 'buyer_signal_each_cycle', 'source_badges',
  ]), verificationMode: 'founder_reported' });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.verificationMode, 'founder_reported');

  const verified = evaluateOutcomeContract({
    tool: 'traction_engine',
    qualityChecks: { ...Object.fromEntries(ready.checks.map((check) => [check.id, true])), one_verified_buyer_signal: true },
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
  assert.match(service, /loadAuthoritativeChecks\(supabase, user\.id, tool, artifactId, artifactType\)/);
  assert.match(service, /record_assumption_signal/);
  assert.match(service, /participant_fingerprint/);
  assert.match(service, /five_interview_signals: independentSignals >= 5/);
  assert.match(service, /source_version_id/);
  assert.match(service, /provenance: `journey_handoff:/);
  assert.match(service, /consumed_artifact_id: artifactId/);
  assert.match(service, /MVP handoff requires a Build decision backed by three independent buyer signals and one documented objection/);
  assert.match(service, /checks\.decision !== 'build'/);
  assert.match(service, /checks\.three_independent_signals !== true/);
  assert.match(service, /checks\.documented_objection !== true/);
});

test('MVP Builder starts empty and imports only a scoped handoff under the completion flag', () => {
  const builder = readFileSync(new URL('../src/components/mvp-builder/MVPBuilderChat.tsx', import.meta.url), 'utf8');

  assert.match(builder, /const \[input, setInput\] = useState\(''\)/);
  assert.match(builder, /isCompletionChainEnabled\(\)/);
  assert.match(builder, /setupInput\.customPrompt\?\.trim\(\)/);
  assert.match(builder, /messages\.length > 0/);
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

/*
 * The ICP handoff must be creatable at draft-save time.
 *
 * The ICP contract requires five completed interviews, those interviews are
 * logged in PMF Lab, and a founder only reaches PMF Lab by following this
 * handoff. Gating the row on 'ready' therefore made the first link in the chain
 * unreachable and journey_handoffs held no rows at all. The contract itself is
 * unchanged: these tests pin the exception narrow and the stamping honest.
 */

const journeyService = readFileSync(
  new URL('../supabase/functions/journey-outcome-service/index.ts', import.meta.url),
  'utf8',
);
const icpBuilder = readFileSync(new URL('../src/components/icp/ICPBuilder.tsx', import.meta.url), 'utf8');

test('a complete falsifiable ICP can reach ready without pretending AI research is buyer evidence', () => {
  const atSaveTime = evaluateOutcomeContract({ tool: 'icp_builder', qualityChecks: allTrue([
    'primary_segment', 'non_fit_segment', 'urgent_pain', 'buying_trigger', 'current_alternative',
    'reachable_channels', 'three_reachable_accounts', 'assumptions_registered',
  ]) });
  assert.equal(atSaveTime.status, 'ready');
  assert.equal(atSaveTime.verificationMode, 'unverified');
});

test('create_handoff admits a draft ICP, and only for the demo_studio destination', () => {
  const block = journeyService.slice(journeyService.indexOf("action === 'create_handoff'"));
  const body = block.slice(0, block.indexOf("action === 'find_handoff'"));

  assert.match(body, /isProvisionalPair/, 'the exception must be named, not inlined');
  assert.match(
    body,
    /outcome\.tool === 'icp_builder' && destinationTool === 'demo_studio'/,
    'the exception must be pinned to exactly one source and destination pair',
  );
  assert.match(body, /!isProvisionalPair/, 'every other pair must still be gated on ready/verified');
  // The evidence-backed Build gate on the MVP handoff is a separate rule and
  // must not have been loosened alongside this one.
  assert.match(body, /MVP handoff requires a Build decision backed by three independent buyer signals/);
});

test('a handoff records the source status it was actually created at', () => {
  const block = journeyService.slice(journeyService.indexOf("action === 'create_handoff'"));
  const body = block.slice(0, block.indexOf("action === 'find_handoff'"));

  assert.match(body, /sourceStatus: outcome\.status/, 'the status must be stamped from the row');
  assert.match(body, /sourceCompletionScore: outcome\.completion_score/);
  // Taking it from the request body would let a client claim its own provenance.
  assert.doesNotMatch(body, /sourceStatus: (textValue\(body|body\.)/);
});

test('the qualified payload overwrites the provisional row instead of being ignored', () => {
  const signalBlock = journeyService.slice(journeyService.indexOf('assumptionsTested: true'));
  const upsert = signalBlock.slice(0, signalBlock.indexOf('Could not create ICP handoff'));

  assert.match(upsert, /idempotency_key: `icp:\$\{assumption\.source_artifact_id\}:demo`/);
  assert.match(
    upsert,
    /ignoreDuplicates: false/,
    'ignoreDuplicates:true would silently discard the better-evidenced payload',
  );
});

test('the ICP builder no longer returns early before creating the handoff', () => {
  const block = icpBuilder.slice(icpBuilder.indexOf('Record the handoff at save time'));
  const body = block.slice(0, block.indexOf('trackPrebuildLineageEvent'));

  assert.doesNotMatch(
    body,
    /if \(!\['ready', 'verified'\]\.includes\(saved\.evaluation\.status\)\) return;/,
    'the status gate that made the handoff unreachable must stay removed',
  );
  assert.match(body, /idempotencyKey: `icp:\$\{analysisId\}:demo`/, 'the key must match the signal path exactly');
});

/*
 * The proof loop.
 *
 * The platform's one defensible property is that it hosts the artifacts founders
 * put in front of buyers, so it witnesses the market's response rather than being
 * told about it. That is worth nothing if a founder's own pageviews count as
 * market evidence, so owner exclusion is what these pin hardest.
 */

const proofMigration = readFileSync(
  new URL('../supabase/migrations/20260823120000_proof_loop_funnel.sql', import.meta.url),
  'utf8',
);
const demoEventFn = readFileSync(
  new URL('../supabase/functions/demo-studio-event/index.ts', import.meta.url),
  'utf8',
);
const demoLeadFn = readFileSync(
  new URL('../supabase/functions/demo-studio-lead/index.ts', import.meta.url),
  'utf8',
);

test('owner views are resolved from the token, never from the request body', () => {
  for (const [name, source] of [['event', demoEventFn], ['lead', demoLeadFn]] as const) {
    assert.match(source, /getUserFromAuth\(req\)/, `${name} must resolve the caller server-side`);
    assert.match(source, /owner_view: ownerView/, `${name} must stamp the resolved value`);
    // A body-supplied flag would be trivially omitted by the one party with a
    // motive to inflate their own numbers.
    assert.doesNotMatch(source, /ownerView\s*=\s*(Boolean\()?body\./, `${name} must not trust the body`);
  }
});

test('owner traffic is marked rather than discarded', () => {
  // Dropping the row would make the endpoint impossible to debug from its own
  // data, and would quietly hide a founder's preview from them entirely.
  assert.match(demoEventFn, /const ownerView = Boolean\(/);
  assert.doesNotMatch(demoEventFn, /if \(ownerView\) return json/);
});

test('the evidence triggers refuse owner previews and unverified beacons', () => {
  const block = proofMigration.slice(proofMigration.indexOf('sync_demo_event_to_customer_evidence_v1()'));
  const body = block.slice(0, block.indexOf('CREATE TRIGGER'));
  assert.match(body, /NEW\.owner_view IS TRUE OR NEW\.verified IS NOT TRUE/);

  // The pre-existing signup sync predated owner_view and would have counted a
  // founder's own test submission as demand.
  const signupBlock = proofMigration.slice(proofMigration.indexOf('sync_demo_signup_to_founder_cycle_v1()'));
  assert.match(signupBlock, /IF NEW\.owner_view IS TRUE THEN RETURN NEW/);
});

test('a single stranger cannot be counted twice at the identified step', () => {
  const block = proofMigration.slice(proofMigration.indexOf('sync_demo_event_to_customer_evidence_v1()'));
  const body = block.slice(0, block.indexOf('CREATE TRIGGER'));
  // demo-studio-lead writes BOTH a signup row and a 'signup' event. If the event
  // trigger also mapped 'signup', one lead would produce two identified rows.
  assert.doesNotMatch(body, /WHEN NEW\.type = 'signup'/);
  assert.match(body, /'signup' is deliberately absent/);
  assert.match(body, /ON CONFLICT \(user_id, idempotency_key\) DO NOTHING/);
});

test('the north-star event fires once per founder, not once per lead', () => {
  const block = demoLeadFn.slice(demoLeadFn.indexOf('external_proof_received') - 1200);
  assert.match(block, /eq\("event_type", "stranger_identified"\)/);
  assert.match(block, /count === 1/, 'must fire only when this is the first identified event');
  assert.match(block, /if \(!ownerView\)/, 'a founder testing their own form is not proof');
  // A stranger's email must never reach analytics.
  const propsLine = block.slice(block.indexOf('properties:'), block.indexOf('properties:') + 200);
  assert.doesNotMatch(propsLine, /email/);
});

test('the funnel is admin-only and headlines the identified step', () => {
  const fn = proofMigration.slice(proofMigration.indexOf('get_proof_loop_funnel_v1()'));
  assert.match(fn, /has_role\(auth\.uid\(\), 'admin'::app_role\)/, 'must reuse the established admin guard');
  for (const key of ['reachedIdentified', 'reachedActed', 'reachedViewed']) {
    assert.ok(fn.includes(key), `${key} must be reported so a bad headline is diagnosable`);
  }
});
