import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { evaluateOutcomeContract } from '../supabase/functions/_shared/outcome-contracts.ts';
import { getLaunchPublishMissing } from '../src/lib/demoStudio/vsl.ts';
import { buildBuyerInterviewScript } from '../src/lib/gtmInterview.ts';

const conceptChecks = { concept_page: true, buyer_promise: true, single_cta: true, lead_capture: true, analytics: true, published: true, external_activity: false };
test('a published concept is usable without screenshots or a VSL and is not verified demand', () => {
  assert.deepEqual(getLaunchPublishMissing({ conceptTest: true, hasPublishedDemo: false, hasVsl: false }), []);
  const result = evaluateOutcomeContract({ tool: 'demo_studio', qualityChecks: conceptChecks });
  assert.equal(result.status, 'ready');
  assert.equal(result.verificationMode, 'unverified');
});
test('each missing concept prerequisite prevents readiness', () => {
  for (const key of ['buyer_promise', 'single_cta', 'lead_capture', 'analytics', 'published']) {
    assert.equal(evaluateOutcomeContract({ tool: 'demo_studio', qualityChecks: { ...conceptChecks, [key]: false } }).status, 'draft', key);
  }
});
test('existing interactive demos retain their structural requirements', () => {
  assert.equal(getLaunchPublishMissing({ hasPublishedDemo: false, hasVsl: false }).length, 2);
  assert.equal(evaluateOutcomeContract({ tool: 'demo_studio', qualityChecks: { ...conceptChecks, concept_page: false } }).status, 'draft');
});
test('prebuild interview prompts ask for experience rather than inventing responses', () => {
  const script = buildBuyerInterviewScript('invoices went unpaid', 'a reminder service');
  assert.match(script, /last time invoices went unpaid/);
  assert.match(script, /Do not pitch until the interview is complete/);
});

test('concept creation is owner scoped, retry safe, and preserves existing work', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260909120000_completion_concept_pages.sql', import.meta.url), 'utf8');
  assert.match(migration, /SECURITY INVOKER/);
  assert.match(migration, /user_id = actor/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /IF FOUND THEN RETURN to_jsonb\(project\)/);
  assert.doesNotMatch(migration, /ON CONFLICT[\s\S]*DO UPDATE/);
});

test('only verified non-owner concept activity counts as independent interest', () => {
  const service = readFileSync(new URL('../supabase/functions/journey-outcome-service/index.ts', import.meta.url), 'utf8');
  assert.match(service, /eq\('project_id', artifactId\)\.eq\('verified', true\)\.eq\('owner_view', false\)/);
  assert.match(service, /Interest alone does not validate willingness to pay|still not payment evidence/);
});
