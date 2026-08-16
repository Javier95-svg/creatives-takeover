import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildFirstCustomerMentorBrief,
  canCompleteFirstCustomerSprint,
  deriveFirstCustomerStep,
  deterministicMessageVariants,
  personalizeSprintMessage,
  qualifyFirstCustomerSprintApplication,
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

test('V2 qualification accepts pre-product founders and applies only execution-fit filters', () => {
  const qualified = qualifyFirstCustomerSprintApplication({
    founderOwnsSales: true, customerCount: 0, weeklyCapacityHours: 3,
    productStage: 'idea', targetOutcome: 'qualified_conversations',
  });
  assert.deepEqual(qualified, { qualified: true, reasons: [] });

  const unqualified = qualifyFirstCustomerSprintApplication({
    founderOwnsSales: false, customerCount: 4, weeklyCapacityHours: 1,
    productStage: 'idea', targetOutcome: 'payment',
  });
  assert.equal(unqualified.qualified, false);
  assert.equal(unqualified.reasons.length, 3);
});

test('pre-product intake requires an offer, buyer, problem, and two weekly hours but treats proof and value as hypotheses', () => {
  assert.equal(validateFirstCustomerIntake({ offer: '', targetSegment: '', problemHypothesis: '', estimatedCustomerValueUsd: 0, weeklyCapacityHours: 1 }).length, 4);
  assert.deepEqual(validateFirstCustomerIntake({
    offer: 'A fixed-scope onboarding audit', targetSegment: 'B2B SaaS operations leads',
    problemHypothesis: 'Manual onboarding loses expansion opportunities', estimatedCustomerValueUsd: 0, weeklyCapacityHours: 3,
  }), []);
});

test('fallback generation creates three distinct, founder-grounded variants', () => {
  const variants = deterministicMessageVariants({ offer: 'an onboarding audit', targetSegment: 'SaaS teams', problemHypothesis: 'slow onboarding' });
  assert.deepEqual(variants.map((item) => item.key), ['discovery', 'problem', 'offer']);
  assert.equal(new Set(variants.map((item) => item.body)).size, 3);
  assert.match(personalizeSprintMessage(variants[0].body, { display_name: 'Ada Lovelace', company: 'Analytical', role: 'Founder' }), /^Hi Ada,/);
});

test('next action follows the weakest target and overdue work is preserved for final review', () => {
  const base = { status: 'active' as const, endsAt: '2026-09-02T00:00:00.000Z', selectedMessage: null, checkpointComplete: false, evidence: evidence() };
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
  assert.doesNotMatch(serialized, /PRIVATE NOTE|private\.example|secret\.example|Ada|Analytical/);
  assert.match(serialized, /Prospect 1|qualified/);
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

test('checkpoint contract is admin-coordinated, redacted, and never deducts credits', () => {
  const page = readFileSync(new URL('../src/pages/FirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../src/pages/AdminFirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  const evidenceWorkspace = readFileSync(new URL('../src/components/founder-cycle/CustomerEvidenceWorkspace.tsx', import.meta.url), 'utf8');
  const booking = readFileSync(new URL('../src/pages/community/MentorBookingPage.tsx', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../supabase/migrations/20260805120000_first_customer_sprint_admin_checkpoint.sql', import.meta.url), 'utf8');
  const assistant = readFileSync(new URL('../supabase/functions/first-customer-sprint-assistant/index.ts', import.meta.url), 'utf8');
  assert.match(page, /Request mentor checkpoint/);
  assert.match(page, /requestCheckpoint/);
  assert.doesNotMatch(page, /\/mentorship\/book|10-credit/i);
  assert.match(admin, /admin_update_first_customer_sprint_checkpoint_v1/);
  assert.match(admin, /Schedule checkpoint/);
  assert.match(admin, /Verify complete/);
  assert.match(evidenceWorkspace, /Mark sent/);
  assert.match(evidenceWorkspace, /sprintId[\s\S]*messageVariantKey/);
  assert.match(booking, /Navigate/);
  assert.doesNotMatch(booking, /confirmBooking|createIntent|discovery-call-service/);
  assert.match(migration, /request_first_customer_sprint_checkpoint_v1/);
  assert.match(migration, /admin_update_first_customer_sprint_checkpoint_v1/);
  assert.match(migration, /checkpoint_status IN \('not_requested', 'requested', 'scheduled', 'completed', 'cancelled'\)/);
  assert.match(migration, /'creditsDeducted', 0/);
  assert.match(migration, /NEW\.checkpoint_status = 'completed'[\s\S]*NEW\.mentor_recommendation_summary[\s\S]*NEW\.checkpoint_verified_at IS NOT NULL/);
  assert.doesNotMatch(migration, /deduct_credits_atomic/);
  assert.match(assistant, /fallback/);
  assert.match(assistant, /message_generation_count >= 2/);
});

test('V2 contract supports pre-product paid enrollment, structured review, and one verified rerun credit', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260815180000_competitive_hardening_v1.sql', import.meta.url), 'utf8');
  const application = readFileSync(new URL('../src/pages/FirstCustomerSprintApplicationPage.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../src/pages/AdminFirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  const sprint = readFileSync(new URL('../src/pages/FirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  const checkout = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8');
  const webhook = readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');

  assert.match(migration, /submit_first_customer_sprint_application_v2/);
  assert.match(migration, /'idea','concept_demo','working_product'/);
  assert.doesNotMatch(migration, /p_estimated_annual_customer_value_usd < 1000/);
  assert.match(migration, /A reason is required to override qualification/);
  assert.match(migration, /JOIN public\.referral_codes code ON code\.user_id=mentor\.user_id/);
  assert.match(migration, /review_submitted_at IS NULL/);
  assert.match(migration, /first_customer_sprint_service_purchases/);
  assert.match(migration, /first_customer_sprint_service_credits/);
  assert.match(migration, /amount_cents = 29900/);
  assert.match(migration, /continuation_from_sprint_id/);
  assert.match(migration, /status='redeemed'/);
  assert.match(application, /Capacity-screened concierge sprint/);
  assert.match(application, /purchaseType: 'service_offer'/);
  assert.match(admin, /rolling cohort of ten paid founders/);
  assert.match(sprint, /Attach a published proof demo/);
  assert.match(checkout, /service_offer/);
  assert.match(webhook, /first_customer_sprint_offer_purchased/);
});
