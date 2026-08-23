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
import { icpArtifactToFirstCustomerSprint } from '../src/lib/icpToFirstCustomerSprint.ts';
import type { FirstCustomerEvidenceCounts, FirstCustomerSprint } from '../src/types/firstCustomerSprint.ts';

const evidence = (patch: Partial<FirstCustomerEvidenceCounts> = {}): FirstCustomerEvidenceCounts => ({
  attachedProspects: 0, contactedProspects: 0, replies: 0, conversations: 0,
  commitments: 0, payments: 0, ...patch,
});

test('a sprint lasts exactly 30 UTC days', () => {
  const start = new Date('2026-08-03T12:00:00.000Z');
  assert.equal(sprintEndDate(start).toISOString(), '2026-09-02T12:00:00.000Z');
});

test('pilot qualification applies the same demand filters to both acquisition sources', () => {
  const qualified = qualifyFirstCustomerSprintApplication({
    businessModel: 'b2b_saas', founderOwnsSales: true, hasSellableProduct: true,
    customerCount: 1, estimatedAnnualCustomerValueUsd: 1200, weeklyCapacityHours: 3,
    canNameTenProspects: true, recentOutreach: 'last_30_days',
  });
  assert.deepEqual(qualified, { qualified: true, reasons: [] });

  const unqualified = qualifyFirstCustomerSprintApplication({
    businessModel: 'service', founderOwnsSales: false, hasSellableProduct: false,
    customerCount: 4, estimatedAnnualCustomerValueUsd: 500, weeklyCapacityHours: 1,
    canNameTenProspects: false, recentOutreach: 'never',
  });
  assert.equal(unqualified.qualified, false);
  assert.equal(unqualified.reasons.length, 8);
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

test('demand-validation contract supports a balanced cohort, structured review, and paid continuation', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260804120000_first_customer_sprint_demand_validation.sql', import.meta.url), 'utf8');
  const application = readFileSync(new URL('../src/pages/FirstCustomerSprintApplicationPage.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../src/pages/AdminFirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  const sprint = readFileSync(new URL('../src/pages/FirstCustomerSprintPage.tsx', import.meta.url), 'utf8');
  const checkout = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8');
  const webhook = readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.first_customer_sprint_applications/);
  assert.match(migration, /p_business_model <> 'b2b_saas'/);
  assert.match(migration, /p_estimated_annual_customer_value_usd < 1000/);
  assert.match(migration, /p_recent_outreach <> 'last_30_days'/);
  assert.match(migration, /A reason is required to override qualification/);
  assert.match(migration, /JOIN public\.referral_codes code ON code\.user_id=mentor\.user_id/);
  assert.match(migration, /review_submitted_at IS NULL/);
  assert.match(migration, /purchaseContextId/);
  assert.match(migration, /continuation_from_sprint_id/);
  assert.match(migration, /one paid continuation only/);
  assert.match(migration, /'mentorInvited'/);
  assert.match(application, /mentor referrals and public applicants/);
  assert.match(admin, /Mentor referrals/);
  assert.match(admin, /Public\/current audience/);
  assert.match(sprint, /Unlock sprint two for \$8/);
  assert.match(checkout, /Complete and review the sprint before purchasing the continuation/);
  assert.match(checkout, /continuation_from_sprint_id/);
  assert.match(webhook, /first_customer_sprint_continuation_purchased/);
});

/*
 * ICP handoff into the sprint intake.
 *
 * The governing rule is that nothing the generator backfilled may be seeded.
 * Backfill prose reads perfectly well in an input box, so a founder would accept
 * it as their own finding and then send outreach built on it. This is the surface
 * where that costs real prospect contacts, which is why the guard lives here and
 * not only in the scorer.
 */

const icpArtifact = (patch: { document?: Record<string, any>; provenance?: Record<string, string> } = {}) => ({
  version: 3,
  generatedAt: '2026-08-22T10:00:00.000Z',
  draftDocument: {
    gatePreview: { personaName: 'Priya', roleLine: 'Ops lead', painLine: 'L' },
    customer: { personaName: 'Priya', roleLine: 'Ops lead at a 40-person SaaS', summary: 'S' },
    pain: { quote: 'q', rootCause: 'r', whyItHurts: 'Invoices go unchased for weeks' },
    build: { valueProposition: 'Chase every overdue invoice automatically', outcome: 'o', coreFeatures: [] },
    decisionBrief: {
      primarySegment: 'Ops leads at 20 to 100 person B2B SaaS companies',
      currentAlternative: 'a shared spreadsheet and calendar reminders',
      rankedPains: [
        { rank: 1, pain: 'Chasing invoices eats a full day every month', evidence: 'e' },
        { rank: 2, pain: 'Secondary pain 2 still needs interview evidence.', evidence: 'e' },
      ],
    },
    pricing: { hypothesis: 'h', anchor: 'They pay about $2,400 a year for a bookkeeper to do this', budgetOwner: 'b', model: 'm' },
    risks: [{ rank: 1, type: 'demand', risk: 'Ops leads may not own this budget', disprovedBy: 'Three ops leads confirm they can sign off' }],
    // Every path the mapper can read, declared. An unrecorded path falls through
    // to the legacy string check and reads as answered, so a partial fixture would
    // quietly let a fallback candidate through and the guard below would pass for
    // the wrong reason.
    fieldProvenance: {
      'decisionBrief.primarySegment': 'model',
      'decisionBrief.currentAlternative': 'model',
      'decisionBrief.rankedPains.0': 'model',
      'decisionBrief.rankedPains.1': 'fallback',
      'build.valueProposition': 'model',
      'build.outcome': 'model',
      'pricing.anchor': 'model',
      'pricing.hypothesis': 'model',
      'customer.personaName': 'model',
      'customer.roleLine': 'model',
      'customer.summary': 'model',
      'pain.whyItHurts': 'model',
      'pain.quote': 'model',
      'pain.rootCause': 'model',
      'risks.0': 'model',
      ...patch.provenance,
    },
    ...patch.document,
  },
} as any);

test('the sprint intake is seeded from the ICP rather than left blank', () => {
  const mapped = icpArtifactToFirstCustomerSprint(icpArtifact());

  assert.equal(mapped.intake.targetSegment, 'Ops leads at 20 to 100 person B2B SaaS companies');
  assert.equal(mapped.intake.offer, 'Chase every overdue invoice automatically');
  assert.match(mapped.intake.problemHypothesis, /Chasing invoices eats a full day every month/);
  assert.match(mapped.intake.problemHypothesis, /Today they work around it with a shared spreadsheet/);
  assert.match(mapped.intake.mentorDecisionQuestion, /Ops leads may not own this budget/);
  assert.equal(mapped.intake.estimatedCustomerValueUsd, '2400');
  assert.equal(mapped.personaName, 'Priya');
  assert.equal(mapped.seededFieldCount, 5);
});

test('a backfilled field is never seeded into the intake', () => {
  const mapped = icpArtifactToFirstCustomerSprint(
    icpArtifact({
      provenance: {
        // Each field and its fallback candidates, so the guard is what stops the
        // seed rather than the mapper simply running out of places to look.
        'decisionBrief.primarySegment': 'fallback',
        'customer.roleLine': 'fallback',
        'customer.summary': 'fallback',
        'build.valueProposition': 'fallback',
        'build.outcome': 'fallback',
        'decisionBrief.rankedPains.0': 'fallback',
        'pain.whyItHurts': 'fallback',
        'pain.quote': 'fallback',
        'pain.rootCause': 'fallback',
        'risks.0': 'fallback',
      },
    }),
  );

  // The strings are still present on the document; the guard is provenance, not emptiness.
  assert.equal(mapped.intake.targetSegment, '', 'a backfilled segment must not reach the intake');
  assert.equal(mapped.intake.mentorDecisionQuestion, '', 'a backfilled risk must not reach the intake');
  assert.doesNotMatch(mapped.intake.problemHypothesis, /Chasing invoices eats a full day/);
});

test('the top ranked pain is skipped when only the lower-ranked one is real', () => {
  const mapped = icpArtifactToFirstCustomerSprint(
    icpArtifact({
      provenance: { 'decisionBrief.rankedPains.0': 'fallback', 'decisionBrief.rankedPains.1': 'model' },
    }),
  );

  assert.match(mapped.intake.problemHypothesis, /Secondary pain 2/);
});

test('an unparseable pricing anchor yields no number rather than a guess', () => {
  // The sprint weighs the founder's hours against this figure, so a wrong guess
  // is worse than an empty field the founder has to fill in deliberately.
  const mapped = icpArtifactToFirstCustomerSprint(
    icpArtifact({ document: { pricing: { hypothesis: 'h', anchor: 'roughly what a part-time hire costs', budgetOwner: 'b', model: 'm' } } }),
  );

  assert.equal(mapped.intake.estimatedCustomerValueUsd, '');
});

test('shorthand pricing anchors are read at the right magnitude', () => {
  const k = icpArtifactToFirstCustomerSprint(
    icpArtifact({ document: { pricing: { anchor: 'about $18k a year today', hypothesis: 'h', budgetOwner: 'b', model: 'm' } } }),
  );
  assert.equal(k.intake.estimatedCustomerValueUsd, '18000');
});

test('a draft that answered nothing seeds nothing, so the form asks rather than invents', () => {
  const mapped = icpArtifactToFirstCustomerSprint(
    icpArtifact({
      provenance: Object.fromEntries(
        Object.keys(icpArtifact().draftDocument.fieldProvenance).map((path) => [path, 'fallback']),
      ),
    }),
  );

  assert.equal(mapped.seededFieldCount, 0);
});
