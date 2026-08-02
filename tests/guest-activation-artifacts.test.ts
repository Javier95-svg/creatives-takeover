import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260802120000_guest_activation_artifacts.sql', import.meta.url),
  'utf8',
);
const icpFunction = readFileSync(new URL('../supabase/functions/icp-analyzer/index.ts', import.meta.url), 'utf8');
const demoFunction = readFileSync(
  new URL('../supabase/functions/guest-activation-artifacts/index.ts', import.meta.url),
  'utf8',
);

test('guest activation artifacts are service-only, token-hashed, and expire after seven days', () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]*FROM anon, authenticated/i);
  assert.match(migration, /resume_token_hash/i);
  assert.match(migration, /interval '7 days'/i);
  assert.match(migration, /prune_expired_guest_activation_artifacts/i);
  assert.match(migration, /cron\.schedule/i);
  assert.match(migration, /claim_guest_icp_artifact/i);
  assert.match(migration, /FOR UPDATE/i);
  assert.match(migration, /INSERT INTO public\.icp_analysis_results[\s\S]*UPDATE public\.guest_activation_artifacts/i);
  assert.doesNotMatch(migration, /CREATE POLICY/i);

  for (const source of [icpFunction, demoFunction]) {
    assert.match(source, /sha-?256/i);
    assert.match(source, /resume_token_hash/);
    assert.match(source, /assert_rate_limit/);
  }
});

test('claim operations require authentication and are idempotent', () => {
  assert.match(icpFunction, /claim_guest_artifact/);
  assert.match(icpFunction, /claimed_by/);
  assert.match(icpFunction, /native_artifact_id/);
  assert.match(icpFunction, /Authentication required/i);
  assert.match(icpFunction, /rpc\("claim_guest_icp_artifact"/);

  assert.match(demoFunction, /claim_demo/);
  assert.match(demoFunction, /claimed_by/);
  assert.match(demoFunction, /nativeArtifactId/);
  assert.match(demoFunction, /Authentication required/i);
  assert.match(demoFunction, /\.select\("id, claimed_by, native_artifact_id"\)/);
});

test('publishing links only an authenticated claimed artifact to its existing public slug', () => {
  assert.match(demoFunction, /operation === "publish"/);
  assert.match(demoFunction, /guest_artifact_publish/);
  assert.match(demoFunction, /Authentication required/i);
  assert.match(demoFunction, /\.eq\("claimed_by", user\.id\)/);
  assert.match(demoFunction, /\.eq\("claim_state", "claimed"\)/);
  assert.match(demoFunction, /\.eq\("native_artifact_id", nativeArtifactId\)/);
  assert.match(demoFunction, /share_slug: shareSlug/);
});
