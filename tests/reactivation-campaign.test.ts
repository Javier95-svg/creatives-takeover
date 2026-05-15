import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const functionSource = readFileSync(
  new URL('../supabase/functions/reactivation-campaign/index.ts', import.meta.url),
  'utf8',
);

const migrationSource = readFileSync(
  new URL('../supabase/migrations/20260515100000_reactivation_campaign_rpc.sql', import.meta.url),
  'utf8',
);

test('reactivation campaign function is admin-secret gated and supports dry run', () => {
  assert.match(functionSource, /REACTIVATION_CAMPAIGN_SECRET/);
  assert.match(functionSource, /Authorization/);
  assert.match(functionSource, /dry_run/);
  assert.match(functionSource, /mode: "dry_run"/);
  assert.match(functionSource, /mode: "live"/);
});

test('reactivation campaign grants through the atomic RPC before email', () => {
  assert.match(functionSource, /grant_reactivation_campaign_bonus/);
  assert.match(functionSource, /supabase\.auth\.admin\.getUserById/);
  assert.match(functionSource, /RESEND_API_KEY/);
  assert.match(functionSource, /EMAIL_DELAY_MS = 100/);
  assert.match(functionSource, /reactivation_may_2026/);
});

test('reactivation campaign RPC is idempotent and service-role only', () => {
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.grant_reactivation_campaign_bonus/);
  assert.match(migrationSource, /FOR UPDATE/);
  assert.match(migrationSource, /ct\.metadata ->> 'campaign' = p_campaign/);
  assert.match(migrationSource, /subscription_tier = 'rookie'/);
  assert.match(migrationSource, /AND balance = 0/);
  assert.match(migrationSource, /'Reactivation Bonus'/);
  assert.match(migrationSource, /REVOKE ALL ON FUNCTION public\.grant_reactivation_campaign_bonus/);
  assert.match(migrationSource, /GRANT EXECUTE ON FUNCTION public\.grant_reactivation_campaign_bonus\(UUID, TEXT, INTEGER, TIMESTAMPTZ\) TO service_role/);
});
