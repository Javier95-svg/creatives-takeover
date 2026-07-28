import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  deriveFounderLoop,
  evidenceEventForContactStage,
  isFounderCycleEligible,
  legacyStageToFounderLoop,
  loopProgress,
  parseContactCsv,
  type FounderCycleEvidenceCounts,
} from '../src/lib/founderCycle.ts';

const emptyEvidence: FounderCycleEvidenceCounts = {
  prospects: 0,
  qualifiedProspects: 0,
  outreachSent: 0,
  replies: 0,
  interviews: 0,
  commitments: 0,
  payingCustomers: 0,
  retentionSignals: 0,
  channelReviews: 0,
  thisWeek: 0,
};

test('external evidence takes precedence over the seven-stage compatibility mapping', () => {
  assert.deepEqual(
    deriveFounderLoop({ legacyStage: 'FUNDRAISING', payingCustomers: 0, costlyCommitments: 0, hasExternalEvidence: true }),
    { loop: 'PROVE', reason: 'No costly customer commitment is recorded yet.' },
  );
  assert.equal(deriveFounderLoop({ legacyStage: 'IDENTITY', costlyCommitments: 1 }).loop, 'SELL');
  assert.equal(deriveFounderLoop({ legacyStage: 'VALIDATING', payingCustomers: 3 }).loop, 'GROW');
  assert.equal(deriveFounderLoop({ legacyStage: 'TRACTION' }).loop, 'GROW');
});

test('legacy mapping remains a non-destructive fallback', () => {
  assert.equal(legacyStageToFounderLoop('IDENTITY'), 'PROVE');
  assert.equal(legacyStageToFounderLoop('BUILDING'), 'SELL');
  assert.equal(legacyStageToFounderLoop('FUNDRAISING'), 'SELL');
  assert.equal(legacyStageToFounderLoop('TRACTION'), 'GROW');
});

test('the beta is limited to B2B SaaS/services with zero to three customers unless cohort-enrolled', () => {
  assert.equal(isFounderCycleEligible('b2b_saas', 0), true);
  assert.equal(isFounderCycleEligible('service', 3), true);
  assert.equal(isFounderCycleEligible('b2b_saas', 4), false);
  assert.equal(isFounderCycleEligible('ecommerce', 1), false);
  assert.equal(isFounderCycleEligible('ecommerce', 12, true), true);
});

test('documents cannot complete PROVE; conversations and a costly commitment can', () => {
  assert.equal(loopProgress('PROVE', emptyEvidence), 0);
  assert.equal(loopProgress('PROVE', { ...emptyEvidence, prospects: 100 }), 0);
  assert.equal(loopProgress('PROVE', { ...emptyEvidence, interviews: 3 }), 60);
  assert.equal(loopProgress('PROVE', { ...emptyEvidence, interviews: 3, commitments: 1 }), 100);
  assert.equal(loopProgress('SELL', { ...emptyEvidence, payingCustomers: 2 }), 67);
  assert.equal(loopProgress('SELL', { ...emptyEvidence, payingCustomers: 3 }), 100);
});

test('contact pipeline changes map to external evidence', () => {
  assert.equal(evidenceEventForContactStage('qualified'), 'prospect_qualified');
  assert.equal(evidenceEventForContactStage('replied'), 'reply_received');
  assert.equal(evidenceEventForContactStage('commitment'), 'commitment_received');
  assert.equal(evidenceEventForContactStage('customer'), 'payment_received');
});

test('CSV import accepts common headers and quoted commas without importing unknown fields', () => {
  const rows = parseContactCsv([
    'name,company,role,profile_url,email',
    '"Ada Lovelace","Analytical, Inc","Founder","https://example.com/ada","private@example.com"',
  ].join('\n'));
  assert.deepEqual(rows, [{
    displayName: 'Ada Lovelace',
    company: 'Analytical, Inc',
    role: 'Founder',
    profileUrl: 'https://example.com/ada',
  }]);
});

test('migration is additive, user-scoped, idempotent, and keeps analytics PII separate', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260727170000_founder_execution_cycle_v1.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /founder_cycle_state/);
  assert.match(migration, /founder_customer_contacts/);
  assert.match(migration, /customer_evidence_events/);
  assert.match(migration, /UNIQUE \(user_id, idempotency_key\)/);
  assert.match(migration, /founder_customer_contacts_creation_uidx/);
  assert.match(migration, /A stable contact creation key is required/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /get_founder_cycle_snapshot_v1/);
  assert.match(migration, /record_founder_cycle_action_feedback_v1/);
  assert.match(migration, /sync_demo_signup_to_founder_cycle_v1/);
  assert.match(migration, /sync_revenue_metric_to_founder_cycle_v1/);
  assert.match(migration, /sync_traction_log_to_founder_cycle_v1/);
  assert.match(migration, /NEW\.seven_day_active_users > 0 OR NEW\.thirty_day_active_users > 0/);
  assert.doesNotMatch(migration, /ALTER TYPE public\.bizmap_stage/);
});
