import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildFirstCustomerMentorBrief,
  canCompleteFirstCustomerSprint,
  deriveFirstCustomerStep,
  deterministicMessageVariants,
  personalizeSprintMessage,
  sprintEndDate,
  validateFirstCustomerIntake,
} from '../src/lib/firstCustomerSprint.ts';
import type { FirstCustomerEvidenceCounts, FirstCustomerSprint } from '../src/types/firstCustomerSprint.ts';

const evidence = (patch: Partial<FirstCustomerEvidenceCounts> = {}): FirstCustomerEvidenceCounts => ({
  attachedProspects: 0, contactedProspects: 0, replies: 0, conversations: 0,
  commitments: 0, payments: 0, ...patch,
});

test('a sprint lasts exactly 30 UTC days', () => {
  const start = new Date('2026-08-03T12:00:00.000Z');
  assert.equal(sprintEndDate(start).toISOString(), '2026-09-02T12:00:00.000Z');
});

test('intake requires an offer, buyer, problem, proof, customer value, and two weekly hours', () => {
  assert.equal(validateFirstCustomerIntake({ offer: '', targetSegment: '', problemHypothesis: '', estimatedCustomerValueUsd: 0, weeklyCapacityHours: 1 }).length, 6);
  assert.deepEqual(validateFirstCustomerIntake({
    offer: 'A fixed-scope onboarding audit', targetSegment: 'B2B SaaS operations leads',
    problemHypothesis: 'Manual onboarding loses expansion opportunities', proofDescription: 'Clickable prototype',
    estimatedCustomerValueUsd: 2500, weeklyCapacityHours: 3,
  }), []);
});

test('fallback generation creates three distinct, founder-grounded variants', () => {
  const variants = deterministicMessageVariants({ offer: 'an onboarding audit', targetSegment: 'SaaS teams', problemHypothesis: 'slow onboarding' });
  assert.deepEqual(variants.map((item) => item.key), ['discovery', 'problem', 'offer']);
  assert.equal(new Set(variants.map((item) => item.body)).size, 3);
  assert.match(personalizeSprintMessage(variants[0].body, { display_name: 'Ada Lovelace', company: 'Analytical', role: 'Founder' }), /^Hi Ada,/);
});

test('next action follows the weakest target and overdue work is preserved for final review', () => {
  const base = { status: 'active' as const, endsAt: '2026-09-02T00:00:00.000Z', selectedMessage: null, linkedCall: false, evidence: evidence() };
  assert.equal(deriveFirstCustomerStep(base, new Date('2026-08-10')), 'target_list');
  assert.equal(deriveFirstCustomerStep({ ...base, evidence: evidence({ attachedProspects: 10 }) }, new Date('2026-08-10')), 'message_preparation');
  assert.equal(deriveFirstCustomerStep({ ...base, selectedMessage: 'problem', evidence: evidence({ attachedProspects: 10 }) }, new Date('2026-08-10')), 'mentor_checkpoint');
  assert.equal(deriveFirstCustomerStep(base, new Date('2026-09-03')), 'awaiting_final_review');
});

test('all three completion paths are evidence-backed', () => {
  assert.equal(canCompleteFirstCustomerSprint(evidence({ conversations: 3 })), true);
  assert.equal(canCompleteFirstCustomerSprint(evidence({ commitments: 1 })), true);
  assert.equal(canCompleteFirstCustomerSprint(evidence({ payments: 1 })), true);
  assert.equal(canCompleteFirstCustomerSprint(evidence({ contactedProspects: 10 }), 'pivot', 'Segment was too broad.'), true);
  assert.equal(canCompleteFirstCustomerSprint(evidence({ contactedProspects: 10 }), 'continue', 'Keep going.'), false);
  assert.equal(canCompleteFirstCustomerSprint(evidence({ contactedProspects: 9 }), 'pause', 'Insufficient signal.'), false);
});

test('mentor brief redacts contact notes, profile URLs, and other private fields', () => {
  const sprint = {
    id: 'sprint-1', offer: 'Audit', target_segment: 'SaaS teams', problem_hypothesis: 'Slow onboarding',
    proof_description: 'Prototype', proof_url: 'https://secret.example', estimated_customer_value_usd: 2500,
    weekly_capacity_hours: 3, mentor_decision_question: 'Which segment?', message_variants: [],
  } as unknown as FirstCustomerSprint;
  const brief = buildFirstCustomerMentorBrief(sprint, [{
    id: 'contact-1', display_name: 'Ada', company: 'Analytical', role: 'Founder', source: 'manual',
    stage: 'qualified', last_activity_at: '', notes: 'PRIVATE NOTE', profile_url: 'https://private.example',
  }], evidence({ attachedProspects: 1 }), '2026-08-03T00:00:00Z');
  const serialized = JSON.stringify(brief);
  assert.doesNotMatch(serialized, /PRIVATE NOTE|private\.example|secret\.example/);
  assert.match(serialized, /Ada|Analytical|qualified/);
});

test('database contract enforces invitation, ownership, idempotency, call/contact validation, and completion', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260803120000_first_customer_sprint_v1.sql', import.meta.url), 'utf8');
  assert.match(migration, /first_customer_sprints_one_open_per_founder/);
  assert.match(migration, /WHERE status IN \('draft', 'active', 'paused'\)/);
  assert.match(migration, /first_customer_sprint_contacts[\s\S]*UNIQUE \(sprint_id, contact_id\)/);
  assert.match(migration, /beta_cohort/);
  assert.match(migration, /public\.has_role\(auth\.uid\(\), 'admin'::app_role\)/);
  assert.match(migration, /founder_id=auth\.uid\(\)/);
  assert.match(migration, /founder_customer_contacts WHERE id=p_contact_id AND user_id=auth\.uid\(\)/);
  assert.match(migration, /discovery_calls[\s\S]*founder_id=auth\.uid\(\)[\s\S]*mentor_id=p_mentor_id/);
  assert.match(migration, /metadata->>'sprintId'=p_sprint_id::text/);
  assert.match(migration, /v_conversations>=3 OR v_commitments>0 OR v_payments>0/);
  assert.match(migration, /p_final_decision IN \('pivot','pause'\)/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /GRANT EXECUTE[\s\S]*TO authenticated/);
});

test('UI contract keeps sending manual, uses existing booking route, and handles provider fallback', () => {
  const page = readFileSync(new URL('../src/pages/FirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  const evidenceWorkspace = readFileSync(new URL('../src/components/founder-cycle/CustomerEvidenceWorkspace.tsx', import.meta.url), 'utf8');
  const booking = readFileSync(new URL('../src/pages/community/MentorBookingPage.tsx', import.meta.url), 'utf8');
  const assistant = readFileSync(new URL('../supabase/functions/first-customer-sprint-assistant/index.ts', import.meta.url), 'utf8');
  assert.match(page, /\/mentorship\/book\/\$\{mentor\.id\}\?sprint=\$\{sprint\.id\}/);
  assert.match(page, /The existing 10-credit call policy applies/);
  assert.match(evidenceWorkspace, /Mark sent/);
  assert.match(evidenceWorkspace, /sprintId[\s\S]*messageVariantKey/);
  assert.match(booking, /Invalid, foreign, or completed sprint IDs deliberately degrade to ordinary booking/);
  assert.match(assistant, /fallback/);
  assert.match(assistant, /message_generation_count >= 2/);
});
