import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { CREDIT_COSTS as CLIENT_CREDIT_COSTS } from '../src/config/constants.ts';
import { CREDIT_COSTS as EDGE_CREDIT_COSTS } from '../supabase/functions/_shared/credit-constants.ts';
import { resolveEntitlement } from '../src/config/planPermissions.ts';

const read = async (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('co-founder posting is a free social action on every plan', () => {
  assert.equal(CLIENT_CREDIT_COSTS.COFOUNDER_POST, 0);
  assert.equal(EDGE_CREDIT_COSTS.COFOUNDER_POST, 0);

  for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
    const entitlement = resolveEntitlement('cofounder_posts', plan);
    assert.equal(entitlement.state, 'full');
    assert.equal(entitlement.monetizationModel, 'quota_limited');
    assert.equal(entitlement.creditFeature, undefined);
    assert.equal(entitlement.creditCost, undefined);
  }
});

test('onboarding asks and persists the required co-founder situation', async () => {
  const source = await read('../src/components/OnboardingForm.tsx');
  assert.match(source, /What(?:'|&apos;)s your co-founder situation\?/);
  assert.match(source, /I'm actively looking for a co-founder\./);
  assert.match(source, /I'm a solo founder and I'm OK with that\./);
  assert.match(source, /case 'cofounder':[\s\S]*cofounderSituation/);
  assert.match(source, /cofounderSituation: formData\.cofounderSituation/);
  assert.match(source, /QUIZ_VERSION = 6/);
});

test('database seeds and completes the dashboard task from the onboarding answer', async () => {
  const sql = await read('../supabase/migrations/20260711190000_onboarding_cofounder_task_and_post_credits.sql');
  assert.match(sql, /sync_onboarding_cofounder_task/);
  assert.match(sql, /v_situation = 'actively_looking'/);
  assert.match(sql, /'Find a co-founder'/);
  assert.match(sql, /'onboarding:find_cofounder'/);
  assert.match(sql, /complete_onboarding_cofounder_task/);
  assert.match(sql, /is_completed = true/);
});

test('co-founder inserts retain validation while future deductions are removed', async () => {
  const sql = await read('../supabase/migrations/20260814130000_free_social_loops.sql');
  const triggerFunction = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.enforce_cofounder_post_credit_charge'));
  assert.match(triggerFunction, /NEW\.user_id <> auth\.uid\(\)/);
  assert.match(triggerFunction, /Listing content is invalid/);
  assert.doesNotMatch(triggerFunction, /deduct_credits_atomic/);
});

test('create-post UI identifies publishing as free', async () => {
  const source = await read('../src/pages/community/CreateCoFounderPost.tsx');
  assert.match(source, /ensureCredits\('COFOUNDER_POST'/);
  assert.match(source, /Create free post/);
  assert.match(source, /database validates and publishes the free social action/i);
  assert.doesNotMatch(source, /getQuotaStatus\('cofounder_posts'/);
});
