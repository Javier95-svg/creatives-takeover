import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildEvidenceBuildBrief,
  buildFiveInterviewPlan,
  buildUntestedAssumptions,
  buildValidationHypothesis,
  nextEvidenceThreshold,
  resolveEvidenceGrade,
  type CustomerDecisionBrief,
  type ValidationEvidenceRow,
  type ValidationSprintRow,
} from '../src/lib/validationSprint.ts';
import { isFounderOutcomeSnapshot } from '../src/lib/founderOutcomeSnapshot.ts';

const customer: CustomerDecisionBrief = {
  idea: 'decide what startup feature to build',
  primarySegment: 'first-time nontechnical founders',
  currentAlternative: 'spreadsheets and disconnected AI chats',
  urgencyTrigger: 'a build budget must be committed',
  decisionNeeded: 'whether to build within 30 days',
};

test('customer step produces a specific hypothesis, assumptions, and five-conversation plan', () => {
  assert.match(buildValidationHypothesis(customer), /first-time nontechnical founders/);
  assert.match(buildValidationHypothesis(customer), /spreadsheets and disconnected AI chats/);
  assert.equal(buildUntestedAssumptions(customer).length, 3);
  assert.equal(buildFiveInterviewPlan(customer).length, 5);
  assert.ok(buildFiveInterviewPlan(customer).every((item) => item.includes('last time')));
});

test('evidence thresholds distinguish directional, emerging, and decision-grade reports', () => {
  assert.equal(resolveEvidenceGrade(0), 'insufficient');
  assert.equal(resolveEvidenceGrade(4), 'insufficient');
  assert.equal(resolveEvidenceGrade(5), 'directional');
  assert.equal(resolveEvidenceGrade(10), 'emerging');
  assert.equal(resolveEvidenceGrade(25), 'decision_grade');
  assert.deepEqual([nextEvidenceThreshold(0), nextEvidenceThreshold(5), nextEvidenceThreshold(10), nextEvidenceThreshold(25)], [5, 10, 25, null]);
});

test('external-builder export keeps the decision, evidence provenance, and next experiment', () => {
  const sprint = {
    id: 'sprint-1',
    customer_brief: customer,
    primary_segment: customer.primarySegment,
    hypothesis: buildValidationHypothesis(customer),
    decision: 'build',
    evidence_grade: 'decision_grade',
    next_experiment: 'Test one instrumented activation flow.',
  } as ValidationSprintRow;
  const evidence = [{
    signal: 'supports',
    summary: 'The founder paid for a manual workaround last week.',
    source_label: 'Interview',
    verification_mode: 'founder_reported',
  }] as ValidationEvidenceRow[];

  const exported = buildEvidenceBuildBrief(sprint, evidence);
  assert.match(exported, /Decision: BUILD/);
  assert.match(exported, /Evidence grade: decision_grade/);
  assert.match(exported, /founder_reported/);
  assert.match(exported, /Lovable, Bolt, v0, or a developer/);
  assert.match(exported, /Test one instrumented activation flow/);
});

test('database contract protects evidence ownership, deduplication, and the verified Build gate', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260722170000_outcome_led_validation_sprint.sql', import.meta.url),
    'utf8',
  );
  const outcomeService = readFileSync(
    new URL('../supabase/functions/journey-outcome-service/index.ts', import.meta.url),
    'utf8',
  );
  const mvpEvidence = readFileSync(
    new URL('../src/lib/mvp-builder/journeyEvidence.ts', import.meta.url),
    'utf8',
  );
  const mvpChat = readFileSync(
    new URL('../src/components/mvp-builder/MVPBuilderChat.tsx', import.meta.url),
    'utf8',
  );

  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /validation_sprint_evidence\(sprint_id, participant_fingerprint\)/);
  assert.match(migration, /v_signal_count >= 25 AND NOT v_override/);
  assert.match(migration, /v_status = 'verified' AND v_decision = 'build'/);
  assert.match(migration, /response\.created_at >= sprint\.started_at/);
  assert.match(migration, /invalidate_validation_sprint_decision_v1/);
  assert.match(migration, /Evidence changed after the last decision/);
  assert.match(migration, /status = 'failed'/);
  assert.match(outcomeService, /outcome\.status !== 'verified'/);
  assert.match(outcomeService, /checks\.decision !== 'build'/);
  assert.match(outcomeService, /checks\.decision_grade !== true/);
  assert.match(mvpEvidence, /validation_sprints/);
  assert.match(mvpEvidence, /source_version_id/);
  assert.match(mvpEvidence, /journey_handoff:validation_sprint/);
  assert.match(mvpChat, /searchParams\.get\('source'\) !== 'validation-sprint'/);
});

test('malformed outcome RPC responses cannot crash the dashboard journey', () => {
  assert.equal(isFounderOutcomeSnapshot([]), false);
  assert.equal(isFounderOutcomeSnapshot({ version: 1, stages: {} }), false);
  assert.equal(isFounderOutcomeSnapshot({
    version: 1,
    generatedAt: '2026-07-22T00:00:00.000Z',
    outcomes: {},
    stages: {},
    validationSprint: null,
    recommendedNextRoute: '/validation-sprint',
    currentStage: 'IDENTITY',
    handoffs: {},
    capitalOptional: true,
  }), true);
});
