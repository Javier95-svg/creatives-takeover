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
  assert.doesNotMatch(builder, /!creditsLoading && creditsAvailable === 0/);
  assert.match(builder, /errCode === 'INSUFFICIENT_CREDITS'/);
  assert.match(dialog, /Upgrade your plan/);
  assert.match(dialog, /navigate\('\/pricing'\)/);
  assert.match(dialog, /pack_20/);
  assert.match(dialog, /pack_40/);
  assert.match(dialog, /pack_60/);
});

test('server-side MVP charging is authenticated and reservation-owned', () => {
  const generation = readFileSync(new URL('../supabase/functions/mvp-builder-generate/index.ts', import.meta.url), 'utf8');
  const deployment = readFileSync(new URL('../supabase/functions/mvp-builder-deploy/index.ts', import.meta.url), 'utf8');

  assert.match(generation, /getUserFromAuth\(req\)/);
  assert.match(generation, /const userId\s+= user\.id/);
  assert.doesNotMatch(generation, /typeof body\.userId === "string" \? body\.userId/);
  assert.match(generation, /reserveMVPBuilderCredits/);
  assert.match(generation, /finalizeMVPBuilderCredits/);
  assert.match(generation, /releaseMVPBuilderCredits/);
  assert.match(deployment, /reserveMVPBuilderCredits/);
  assert.match(deployment, /finalizeMVPBuilderCredits/);
  assert.match(deployment, /releaseMVPBuilderCredits/);
});

test('reservation migration holds the shared wallet quota-first and releases exact pools', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260531130000_mvp_builder_credit_reservations.sql', import.meta.url), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.mvp_builder_credit_reservations/);
  assert.match(migration, /status TEXT NOT NULL DEFAULT 'pending'\s+CHECK \(status IN \('pending', 'finalized', 'released', 'expired'\)\)/);
  assert.match(migration, /expires_at TIMESTAMPTZ NOT NULL DEFAULT now\(\) \+ interval '10 minutes'/);
  assert.match(migration, /p_action_feature NOT LIKE 'APP_BUILDER_%'/);
  assert.match(migration, /v_held := LEAST\(v_total, p_listed_price\)/);
  assert.match(migration, /v_from_quota := LEAST\(COALESCE\(v_quota, 0\), v_held\)/);
  assert.match(migration, /monthly_quota = COALESCE\(monthly_quota, 0\) - v_from_quota/);
  assert.match(migration, /monthly_quota = COALESCE\(monthly_quota, 0\) \+ v_reservation\.used_from_quota/);
  assert.match(migration, /A concurrent retry can pass the first lookup before this wallet lock is acquired/);
  assert.match(migration, /PERFORM public\.cleanup_expired_mvp_builder_credit_reservations\(\)/);
  assert.match(migration, /'\*\/5 \* \* \* \*'/);
});

test('reservation lifecycle emits success and release events for chat and code actions', () => {
  const generation = readFileSync(new URL('../supabase/functions/mvp-builder-generate/index.ts', import.meta.url), 'utf8');

  assert.match(generation, /"chat"/);
  assert.match(generation, /APP_BUILDER_CHAT/);
  assert.match(generation, /hasMaterialProjectChange/);
  assert.match(generation, /NO_MATERIAL_CHANGE/);
  assert.match(generation, /credit-reserved/);
  assert.match(generation, /credit-finalized/);
  assert.match(generation, /credit-released/);
  assert.match(generation, /readModelStreamChunk/);
  assert.match(generation, /MVP Builder model stream timed out/);
});

test('held credits appear in the shared wallet and builder processing state', () => {
  const credits = readFileSync(new URL('../src/hooks/useCredits.ts', import.meta.url), 'utf8');
  const display = readFileSync(new URL('../src/components/CreditDisplay.tsx', import.meta.url), 'utf8');
  const builder = readFileSync(new URL('../src/components/mvp-builder/MVPBuilder.tsx', import.meta.url), 'utf8');

  assert.match(credits, /get_mvp_builder_held_credits/);
  assert.match(credits, /heldCredits/);
  assert.match(display, /Temporarily Held/);
  assert.match(builder, /credits held while MVP Builder works/);
});

test('restore reserves before applying and unavailable GitHub AI edits remain charge-free', () => {
  const hook = readFileSync(new URL('../src/hooks/useMVPBuilder.ts', import.meta.url), 'utf8');
  const github = readFileSync(new URL('../supabase/functions/github-integration/index.ts', import.meta.url), 'utf8');

  assert.match(hook, /reserveMVPBuilderCredits\('APP_BUILDER_RESTORE'/);
  assert.match(hook, /finalizeMVPBuilderCredits\('APP_BUILDER_RESTORE'/);
  assert.match(hook, /releaseMVPBuilderCredits\(reservation\.reservationId/);
  assert.doesNotMatch(hook, /deductCredits\(creditFeature/);
  assert.match(github, /action === "ai_edit" \|\| action === "rollback_to_commit"/);
  assert.match(github, /\}, 501\)/);
});

test('legacy refunds use one atomic idempotent exact-pool RPC', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260531130000_mvp_builder_credit_reservations.sql', import.meta.url), 'utf8');
  const deduction = readFileSync(new URL('../supabase/functions/_shared/credit-deduction.ts', import.meta.url), 'utf8');

  assert.match(migration, /refund_platform_credits_atomic/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /refundedDeductionId/);
  assert.match(migration, /'replayed', true/);
  assert.match(migration, /'restoredToQuota', v_from_quota/);
  assert.match(migration, /'restoredToBalance', v_from_balance/);
  assert.match(deduction, /\.rpc\('refund_platform_credits_atomic'/);
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
