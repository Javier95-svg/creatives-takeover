import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveMVPBuilderChargeAmount } from '../src/lib/mvpBuilderCredits.ts';

test('MVP Builder final spend consumes only the available account total', () => {
  assert.equal(resolveMVPBuilderChargeAmount('APP_BUILDER_GENERATE', 15, 714, true), 15);
  assert.equal(resolveMVPBuilderChargeAmount('APP_BUILDER_GENERATE', 15, 15, true), 15);
  assert.equal(resolveMVPBuilderChargeAmount('APP_BUILDER_GENERATE', 15, 4, true), 4);
  assert.equal(resolveMVPBuilderChargeAmount('APP_BUILDER_GENERATE', 15, 0, true), 15);
});

test('non-MVP tools keep strict listed credit costs', () => {
  assert.equal(resolveMVPBuilderChargeAmount('WAITLIST_GENERATION', 3, 1, true), 3);
  assert.equal(resolveMVPBuilderChargeAmount('APP_BUILDER_GENERATE', 15, 4, false), 15);
});

test('MVP Builder uses its own dismissible exhaustion dialog', () => {
  const legacyGate = readFileSync(new URL('../src/contexts/CreditGateContext.tsx', import.meta.url), 'utf8');
  const builder = readFileSync(new URL('../src/hooks/useMVPBuilder.ts', import.meta.url), 'utf8');
  const dialog = readFileSync(new URL('../src/components/mvp-builder/MVPBuilderCreditExhaustedDialog.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(legacyGate, /"\/mvp-builder"/);
  assert.match(builder, /isCreditExhaustedModalOpen/);
  assert.match(builder, /!creditsLoading && creditsAvailable === 0/);
  assert.match(dialog, /Upgrade your plan/);
  assert.match(dialog, /navigate\('\/pricing'\)/);
  assert.match(dialog, /pack_20/);
  assert.match(dialog, /pack_40/);
  assert.match(dialog, /pack_60/);
});

test('server-side MVP charging is authenticated and partial-spend guarded', () => {
  const generation = readFileSync(new URL('../supabase/functions/mvp-builder-generate/index.ts', import.meta.url), 'utf8');
  const deployment = readFileSync(new URL('../supabase/functions/mvp-builder-deploy/index.ts', import.meta.url), 'utf8');
  const deduction = readFileSync(new URL('../supabase/functions/_shared/credit-deduction.ts', import.meta.url), 'utf8');

  assert.match(generation, /getUserFromAuth\(req\)/);
  assert.match(generation, /const userId\s+= user\.id/);
  assert.doesNotMatch(generation, /typeof body\.userId === "string" \? body\.userId/);
  assert.match(generation, /allowPartialMvpSpend: true/);
  assert.match(deployment, /allowPartialMvpSpend: true/);
  assert.match(deduction, /metadata\?\.allowPartialMvpSpend === true/);
  assert.match(deduction, /entitlementFeature\?\.startsWith\('APP_BUILDER_'\)/);
  assert.match(deduction, /Math\.min\(listedChargeAmount, totalAvailableBeforeDeduction\)/);
});

test('platform top-up catalog restores the requested Stripe payment links', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260531120000_restore_platform_top_up_packs.sql', import.meta.url), 'utf8');
  const checkout = readFileSync(new URL('../supabase/functions/create-checkout/index.ts', import.meta.url), 'utf8');
  const webhook = readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');

  assert.match(migration, /pack_20[\s\S]*dRm5kE4Gl9Kv8746zF0VO0h/);
  assert.match(migration, /pack_40[\s\S]*aFa4gAegV8Grafc3nt0VO0i/);
  assert.match(migration, /pack_60[\s\S]*8x29AUc8N1dZevsgaf0VO0j/);
  assert.match(checkout, /pack_20: \{ amount: 800, credits: 20, name: "Starter Pack" \}/);
  assert.match(webhook, /pack_20: 20/);
  assert.match(webhook, /increment_credit_balance/);
});
