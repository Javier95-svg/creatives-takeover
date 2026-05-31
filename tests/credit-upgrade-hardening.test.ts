import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('subscription checkout RPC preserves bonus balance and grants only quota delta', () => {
  const source = readFileSync(
    new URL('../supabase/migrations/20260516090000_fix_subscription_upgrade_credit_allocation.sql', import.meta.url),
    'utf8',
  );

  assert.match(source, /v_previous_monthly_quota INTEGER := 0/);
  assert.match(source, /v_preserved_balance INTEGER := 0/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /v_quota_grant_amount := GREATEST\(v_monthly_credits - v_previous_monthly_quota, 0\)/);
  assert.match(source, /credit_balance = v_preserved_balance/);
  assert.match(source, /balance = v_preserved_balance/);
  assert.match(source, /v_quota_grant_amount,[\s\S]*'grant'/);
  assert.match(source, /'previous_monthly_quota', v_previous_monthly_quota/);
  assert.match(source, /'new_monthly_quota', v_monthly_credits/);
  assert.match(source, /'preserved_balance', v_preserved_balance/);
  assert.match(source, /metadata ->> 'stripe_event_id' = p_stripe_event_id/);
});

test('waitlist and PMF scoring deductions pass idempotency keys with entitlement features', () => {
  const waitlistSource = readFileSync(new URL('../supabase/functions/waitlist-generator/index.ts', import.meta.url), 'utf8');
  const pmfScoringSource = readFileSync(new URL('../supabase/functions/pmf-evidence-scorer/index.ts', import.meta.url), 'utf8');

  assert.match(waitlistSource, /resolveCreditIdempotencyKey/);
  assert.match(waitlistSource, /feature: "WAITLIST_GENERATION"/);
  assert.match(waitlistSource, /idempotencyKey, entitlementFeature: 'WAITLIST_GENERATION'/);
  assert.match(waitlistSource, /idempotency-key/);

  assert.match(pmfScoringSource, /resolveCreditIdempotencyKey/);
  assert.match(pmfScoringSource, /feature: 'PMF_SCORING'/);
  assert.match(pmfScoringSource, /idempotencyKey, entitlementFeature: 'PMF_SCORING'/);
});

test('MVP Builder reservations and GTM refunds use actual charged credits', () => {
  const mvpSource = readFileSync(new URL('../supabase/functions/mvp-builder-generate/index.ts', import.meta.url), 'utf8');
  const gtmSource = readFileSync(new URL('../supabase/functions/gtm-analyzer/index.ts', import.meta.url), 'utf8');

  assert.match(mvpSource, /reserveMVPBuilderCredits/);
  assert.match(mvpSource, /finalizeMVPBuilderCredits/);
  assert.match(mvpSource, /releaseMVPBuilderCredits/);
  assert.match(mvpSource, /credit-finalized/);
  assert.match(mvpSource, /credit-released/);
  assert.doesNotMatch(mvpSource, /checkAndDeductCredits/);
  assert.doesNotMatch(mvpSource, /refundCredits/);

  assert.match(gtmSource, /const chargedCredits = \(creditResult\.usedFromQuota \?\? 0\) \+ \(creditResult\.usedFromBalance \?\? 0\)/);
  assert.match(gtmSource, /creditsUsed: chargedCredits/);
  assert.doesNotMatch(gtmSource, /refundCredits\(user\.id, creditCost/);
  assert.match(gtmSource, /refundCredits\(user\.id, chargedCredits/);
});
