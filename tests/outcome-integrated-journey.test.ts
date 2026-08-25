import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assessOutcomeJourneyEntry,
  evaluateAcquisitionCycle,
  evaluateRepeatableDemand,
  OUTCOME_JOURNEY_CONTRACTS,
  OUTCOME_JOURNEY_STAGE_KEYS,
  stageForLegacyActivationIntent,
} from '../src/lib/outcomeJourney.ts';

test('the seven contracts each promise one observable business outcome', () => {
  assert.deepEqual(OUTCOME_JOURNEY_STAGE_KEYS, ['target', 'proof', 'validate', 'deliver', 'acquire', 'repeat', 'capital']);
  for (const stage of OUTCOME_JOURNEY_STAGE_KEYS) {
    assert.equal(OUTCOME_JOURNEY_CONTRACTS[stage].stage, stage);
    assert.ok(OUTCOME_JOURNEY_CONTRACTS[stage].observableMinimum.length >= 3);
    assert.ok(OUTCOME_JOURNEY_CONTRACTS[stage].outcome.length > 30);
  }
});

test('stage assessment chooses the earliest missing outcome but lets the qualified pilot enter Acquire', () => {
  assert.equal(assessOutcomeJourneyEntry({ specificTarget: false, liveBuyerProof: false, qualifiedBuyerEvidence: false, measurableSuccessEvent: false, completedAcquisitionCycle: false, repeatedDemand: false }), 'target');
  assert.equal(assessOutcomeJourneyEntry({ specificTarget: true, liveBuyerProof: true, qualifiedBuyerEvidence: false, measurableSuccessEvent: false, completedAcquisitionCycle: false, repeatedDemand: false }), 'validate');
  assert.equal(assessOutcomeJourneyEntry({ eligibleForFirstCustomerSprint: true, specificTarget: false, liveBuyerProof: false, qualifiedBuyerEvidence: false, measurableSuccessEvent: false, completedAcquisitionCycle: false, repeatedDemand: false }), 'acquire');
  assert.equal(assessOutcomeJourneyEntry({ specificTarget: true, liveBuyerProof: true, qualifiedBuyerEvidence: true, measurableSuccessEvent: true, completedAcquisitionCycle: true, repeatedDemand: true, verifiedRepeatableDemand: true, wantsToRaise: true }), 'capital');
});

test('Launch requires the full sample and routes from buyer evidence', () => {
  const partial = evaluateAcquisitionCycle({ prospects: 10, messagesSent: 9, replies: 1, conversations: 0, commitments: 0, payments: 0 });
  assert.equal(partial.outcomeState, 'in_progress');
  const positive = evaluateAcquisitionCycle({ prospects: 10, messagesSent: 10, replies: 1, conversations: 0, commitments: 0, payments: 0 });
  assert.deepEqual([positive.decision, positive.nextStage], ['advance', 'repeat']);
  const invalidated = evaluateAcquisitionCycle({ prospects: 10, messagesSent: 10, replies: 0, conversations: 0, commitments: 0, payments: 0, finalDecision: 'narrow_segment', decisionNotes: 'No buyer recognized the problem.' });
  assert.deepEqual([invalidated.decision, invalidated.nextStage], ['loop_back', 'target']);
  const iterate = evaluateAcquisitionCycle({ prospects: 10, messagesSent: 10, replies: 0, conversations: 0, commitments: 0, payments: 0, finalDecision: 'change_offer', decisionNotes: 'The offer did not earn a reply.' });
  assert.deepEqual([iterate.decision, iterate.nextStage], ['repeat', 'acquire']);
});

test('Repeat requires two comparable signal cycles and one verified signal', () => {
  const one = evaluateRepeatableDemand([{ audience: 'Ops leads', offer: 'Audit', channel: 'Email', qualifiedBuyerSignals: 1, verificationModes: ['reviewer_verified'] }]);
  assert.equal(one.achieved, false);
  const unverified = evaluateRepeatableDemand([
    { audience: 'Ops leads', offer: 'Audit', channel: 'Email', qualifiedBuyerSignals: 1, verificationModes: ['founder_reported'] },
    { audience: ' ops  leads ', offer: 'audit', channel: 'email', qualifiedBuyerSignals: 1, verificationModes: ['founder_reported'] },
  ]);
  assert.equal(unverified.patternDetected, true);
  assert.equal(unverified.achieved, false);
  assert.match(unverified.missingEvidence ?? '', /verification/i);
  const verified = evaluateRepeatableDemand([
    { audience: 'Ops leads', offer: 'Audit', channel: 'Email', qualifiedBuyerSignals: 1, verificationModes: ['reviewer_verified'] },
    { audience: 'Ops leads', offer: 'Audit', channel: 'Email', qualifiedBuyerSignals: 1, verificationModes: ['founder_reported'] },
  ]);
  assert.equal(verified.achieved, true);
  assert.equal(verified.verified, true);
});

test('legacy intents remain parseable while fundraising maps to the conditional Capital contract', () => {
  assert.equal(stageForLegacyActivationIntent('publish_proof'), 'proof');
  assert.equal(stageForLegacyActivationIntent('first_customer_sprint'), 'acquire');
  assert.equal(stageForLegacyActivationIntent('analyze_pitch_deck'), 'capital');
});

test('the database spine keeps execution artifacts from advancing outcomes and makes review immutable', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260824120000_outcome_integrated_founder_journey.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.founder_journeys/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.journey_stage_runs/);
  assert.match(sql, /v_execution_only := NEW\.tool IN \('gtm_strategist','traction_engine'\)/);
  assert.match(sql, /'reviewer_verified'/);
  assert.match(sql, /originalFounderEventId/);
  assert.match(sql, /now\(\)\+interval '90 days'/);
  assert.match(sql, /journey-evidence-private/);
  assert.match(sql, /v_cycles>=2 AND v_verified/);
  assert.match(sql, /current_stage='capital'/);
  assert.match(sql, /repeat-cycle:/);
  assert.match(sql, /first-customer-cycle:/);
});

test('release applies only an attested, reviewed dry-run and leaves flags off', () => {
  const workflow = readFileSync(new URL('../.github/workflows/supabase-production-deploy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /workflow_run:/);
  assert.match(workflow, /schema_backup_reference/);
  assert.match(workflow, /ledger_reconciliation_record/);
  assert.match(workflow, /--dry-run/);
  assert.match(workflow, /verify-pilot-release\.mjs/);
  assert.match(workflow, /get_outcome_journey_release_health_v1/);
  assert.match(workflow, /market-provider-health/);
  assert.match(workflow, /pilotFlagsEnabled:false/);
});

test('GTM market conclusions expose retrieval health and clamp AI-only claims', () => {
  const service = readFileSync(new URL('../supabase/functions/gtm-analyzer/index.ts', import.meta.url), 'utf8');
  assert.match(service, /researchProviderStatus/);
  assert.match(service, /researchRetrievedAt/);
  assert.match(service, /researchSourceCount/);
  assert.match(service, /confidenceBasis: externalCount > 0 \? 'external_sources' : 'hypothesis_only'/);
  assert.match(service, /externalCount === 0/);
});
