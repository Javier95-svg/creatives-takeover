import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('proof publishing exposes a sanitized projection and keeps base mutations admin-only', () => {
  const migration = read('../supabase/migrations/20260815180000_competitive_hardening_v1.sql');
  assert.match(migration, /DROP POLICY IF EXISTS proof_cases_public_read/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.published_proof_cases_v1/);
  assert.match(migration, /GRANT SELECT ON public\.published_proof_cases_v1,public\.published_proof_metrics_v1 TO anon,authenticated/);
  assert.match(migration, /proof_cases_admin_all/);
  assert.match(migration, /denominator>=10/);
});

test('external evidence ingestion hashes credentials, enforces idempotency, and preserves verification semantics', () => {
  const migration = read('../supabase/migrations/20260815180000_competitive_hardening_v1.sql');
  const edge = read('../supabase/functions/external-evidence/index.ts');
  assert.match(migration, /UNIQUE\(connection_id,external_id\)/);
  assert.match(migration, /CHECK \(verification_mode='imported'\)/);
  assert.match(migration, /'corroborated','platform_verified'/);
  assert.match(migration, /evidence_imports_owner_insert/);
  assert.match(migration, /storage\.foldername\(name\).*auth\.uid\(\)::text/s);
  assert.match(edge, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(edge, /MAX_CSV_BYTES = 2 \* 1024 \* 1024/);
  assert.match(edge, /MAX_CSV_ROWS = 10_000/);
  assert.match(edge, /bodyAction/);
  assert.match(edge, /csvRowCount > MAX_CSV_ROWS/);
  assert.match(edge, /method === "webhook" \? "corroborated" : "imported"/);
  assert.match(edge, /duplicate/);
  assert.match(edge, /storage\.from\("evidence-imports"\)\.remove/);
  assert.doesNotMatch(edge, /posthog|amplitude/i);
});

test('paid sprint enrollment and refund are server-authoritative and idempotent', () => {
  const migration = read('../supabase/migrations/20260815180000_competitive_hardening_v1.sql');
  const webhook = read('../supabase/functions/stripe-webhook/index.ts');
  assert.match(migration, /stripe_checkout_session_id text NOT NULL UNIQUE/);
  assert.match(migration, /UNIQUE \(application_id, offer_id\)/);
  assert.match(migration, /set_founder_cycle_beta_cohort_v1\(p_founder_id,true\)/);
  assert.match(migration, /refund_first_customer_sprint_offer_v1/);
  assert.match(migration, /set_founder_cycle_beta_cohort_v1\(v_purchase\.founder_id,false\)/);
  assert.match(migration, /offer_version<>'concierge_299'/);
  assert.match(migration, /review_submitted_at>v_sprint\.ends_at/);
  assert.match(webhook, /fulfill_first_customer_sprint_offer_v1/);
  assert.match(webhook, /refund_first_customer_sprint_offer_v1/);
});

test('every competitive hardening surface has an independent rollback switch', () => {
  const flags = read('../src/config/competitiveHardeningFlags.ts');
  for (const key of ['categoryPositioningV2','firstCustomerSprintV2','paidSprintCheckout','proofPublishing','externalEvidenceImport','projectPackPriceVariant']) {
    assert.match(flags, new RegExp(key));
  }
});
