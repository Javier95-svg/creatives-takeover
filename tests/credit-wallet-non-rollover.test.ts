import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const migration = read('../supabase/migrations/20260715120000_credit_wallet_non_rollover_v1.sql');
const subscriptionCheck = read('../supabase/functions/check-subscription/index.ts');
const creditsHook = read('../src/hooks/useCredits.ts');
const creditDisplay = read('../src/components/CreditDisplay.tsx');
const stripeWebhook = read('../supabase/functions/stripe-webhook/index.ts');

test('wallet contract keeps plan quota and persistent credits as explicit pools', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_credit_wallet_v1\(\)/);
  assert.match(migration, /'persistentBalance', v_balance/);
  assert.match(migration, /'monthlyQuotaRemaining', v_monthly_quota/);
  assert.match(migration, /'totalAvailable', GREATEST\(0, v_balance \+ v_monthly_quota\)/);
  assert.doesNotMatch(migration, /v_balance \+ v_monthly_quota - v_held/);
});

test('renewal replaces monthly quota and never adds plan credits to balance', () => {
  assert.match(migration, /WHEN v_tier_changed OR v_boundary_crossed THEN v_tier_credits/);
  assert.match(migration, /ELSE v_previous_quota/);
  assert.doesNotMatch(migration, /balance\s*=\s*balance\s*\+\s*tier_credits/);
  assert.match(stripeWebhook, /monthly_quota: tierCredits/);
  assert.match(stripeWebhook, /balance: currentBalance/);
});

test('subscription checks cannot refill a partially spent quota', () => {
  assert.match(subscriptionCheck, /crossedBillingBoundary \? proCredits : currentQuota/);
  assert.match(subscriptionCheck, /balance: currentBalance/);
  assert.doesNotMatch(subscriptionCheck, /Math\.max\(creditRow\?\.balance \?\? 0, proCredits\)/);
  assert.doesNotMatch(subscriptionCheck, /Math\.max\(creditRow\?\.monthly_quota \?\? 0, proCredits\)/);
  assert.match(subscriptionCheck, /creditRow\?\.billing_anchor_at \?\? creditRow\?\.current_period_start/);
  assert.doesNotMatch(subscriptionCheck, /resolveMonthlyBillingWindow\(new Date\(\)\.toISOString\(\)\)/);
});

test('refunds restore original pools and cannot turn expired quota into persistent credits', () => {
  assert.match(migration, /original_deduction_id/);
  assert.match(migration, /v_restore_quota := CASE/);
  assert.match(migration, /v_restore_balance := v_used_balance/);
  assert.match(migration, /expiredMonthlyCreditsNotRestored/);
  assert.doesNotMatch(migration, /v_restore_balance := p_amount/);
});

test('admin correction is audited and preserves the confirmed 671 total', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.credit_wallet_reconciliation_audit/);
  assert.match(migration, /v_expected_total constant integer := 671/);
  assert.match(migration, /v_new_balance := GREATEST\(0, v_expected_total - v_quota\)/);
  assert.match(migration, /Wallet reconciliation: remove duplicated non-rollover plan credits/);
  assert.match(migration, /get_credit_wallet_reconciliation_candidates_v1/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_credit_wallet_reconciliation_candidates_v1\(\) FROM PUBLIC, anon, authenticated/);
});

test('frontend reads the canonical wallet RPC instead of assembling table state', () => {
  assert.match(creditsHook, /supabase\.rpc\('get_credit_wallet_v1'/);
  assert.match(creditsHook, /totalAvailable: balanceData\.total_available/);
  assert.doesNotMatch(creditsHook, /\.from\('user_credits'\)/);
  assert.doesNotMatch(creditsHook, /get_mvp_builder_held_credits/);
  assert.match(creditDisplay, /totalAvailable, loading/);
  assert.doesNotMatch(creditDisplay, /const totalAvailable = balance \+ monthlyQuota/);
});
