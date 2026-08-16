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

test('standalone sprint commerce is retired and invitations unlock the existing workflow', () => {
  const migration = read('../supabase/migrations/20260816180000_remove_first_customer_sprint_service_offer.sql');
  const checkout = read('../supabase/functions/create-checkout/index.ts');
  const webhook = read('../supabase/functions/stripe-webhook/index.ts');
  assert.match(migration, /set_founder_cycle_beta_cohort_v1\(v_application\.founder_id, true\)/);
  assert.match(migration, /DROP TABLE IF EXISTS public\.first_customer_sprint_service_purchases/);
  assert.match(migration, /DROP TABLE IF EXISTS public\.first_customer_sprint_service_credits/);
  assert.match(migration, /DROP COLUMN IF EXISTS payment_status/);
  assert.match(migration, /Experiment Pack purchase is required for the continuation/);
  assert.doesNotMatch(checkout, /service_offer|FIRST_CUSTOMER_SPRINT_OFFER/);
  assert.doesNotMatch(webhook, /service_offer|FIRST_CUSTOMER_SPRINT_OFFER|fulfill_first_customer_sprint_offer_v1/);
});

test('every competitive hardening surface has an independent rollback switch', () => {
  const flags = read('../src/config/competitiveHardeningFlags.ts');
  for (const key of ['categoryPositioningV2','firstCustomerSprintV2','proofPublishing','externalEvidenceImport','projectPackPriceVariant']) {
    assert.match(flags, new RegExp(key));
  }
  assert.doesNotMatch(flags, /paidSprintCheckout|VITE_PAID_SPRINT_CHECKOUT/);
});
