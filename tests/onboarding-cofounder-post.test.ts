import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { CREDIT_COSTS as CLIENT_CREDIT_COSTS } from '../src/config/constants.ts';
import { CREDIT_COSTS as EDGE_CREDIT_COSTS } from '../supabase/functions/_shared/credit-constants.ts';
import { resolveEntitlement } from '../src/config/planPermissions.ts';

const read = async (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('co-founder post costs five credits on every plan', () => {
  assert.equal(CLIENT_CREDIT_COSTS.COFOUNDER_POST, 5);
  assert.equal(EDGE_CREDIT_COSTS.COFOUNDER_POST, 5);

  for (const plan of ['rookie', 'starter', 'rising', 'pro'] as const) {
    const entitlement = resolveEntitlement('cofounder_posts', plan);
    assert.equal(entitlement.state, 'full');
    assert.equal(entitlement.monetizationModel, 'credit_metered');
    assert.equal(entitlement.creditFeature, 'COFOUNDER_POST');
    assert.equal(entitlement.creditCost, 5);
  }
});

test('onboarding asks and persists the required co-founder situation', async () => {
  const source = await read('../src/components/OnboardingForm.tsx');
  assert.match(source, /What(?:'|&apos;)s your co-founder situation\?/);
  assert.match(source, /I'm actively looking for a co-founder\./);
  assert.match(source, /I'm a solo founder and I'm OK with that\./);
  assert.match(source, /case 'cofounder':[\s\S]*cofounderSituation/);
  assert.match(source, /cofounderSituation: formData\.cofounderSituation/);
  assert.match(source, /QUIZ_VERSION = 5/);
});

test('database seeds and completes the dashboard task from the onboarding answer', async () => {
  const sql = await read('../supabase/migrations/20260711190000_onboarding_cofounder_task_and_post_credits.sql');
  assert.match(sql, /sync_onboarding_cofounder_task/);
  assert.match(sql, /v_situation = 'actively_looking'/);
  assert.match(sql, /'Find a co-founder'/);
  assert.match(sql, /'onboarding:find_cofounder'/);
  assert.match(sql, /source_tool,[\s\S]*'find_cofounder'/);
  assert.match(sql, /'platform',[\s\S]*'high',[\s\S]*'find_cofounder',[\s\S]*'\/co-founder',[\s\S]*'accountability'/);
  assert.match(sql, /'accepted'/);
  assert.match(sql, /complete_onboarding_cofounder_task/);
  assert.match(sql, /is_completed = true/);
});

test('co-founder insert and five-credit charge share one database transaction', async () => {
  const sql = await read('../supabase/migrations/20260711190000_onboarding_cofounder_task_and_post_credits.sql');
  assert.match(sql, /BEFORE INSERT[\s\S]*cofounder_posts/);
  assert.match(sql, /deduct_credits_atomic\([\s\S]*NEW\.user_id,[\s\S]*5,[\s\S]*'Co-founder post'/);
  assert.match(sql, /NEW\.user_id <> auth\.uid\(\)/);
  assert.match(sql, /'idempotencyKey', 'cofounder-post:' \|\| NEW\.id::text/);
  assert.match(sql, /DROP TRIGGER IF EXISTS trg_cofounder_posts_quota_guard/);
  assert.match(sql, /Publishing a co-founder post requires 5 credits/);
});

test('create-post UI preflights and discloses the database-enforced charge', async () => {
  const source = await read('../src/pages/community/CreateCoFounderPost.tsx');
  assert.match(source, /ensureCredits\('COFOUNDER_POST'/);
  assert.match(source, /Create Post · \{CREDIT_COSTS\.COFOUNDER_POST\} credits/);
  assert.match(source, /database trigger charges and inserts in one transaction/i);
  assert.doesNotMatch(source, /getQuotaStatus\('cofounder_posts'/);
});
