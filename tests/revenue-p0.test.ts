import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('all six post-auth plan intervals resolve to server Checkout intents', () => {
  const source = read('../src/lib/checkoutRedirect.ts');
  for (const intent of [
    'starter-monthly', 'starter-yearly',
    'rising-monthly', 'rising-yearly',
    'pro-monthly', 'pro-yearly',
  ]) {
    assert.match(source, new RegExp(`"${intent}"`));
  }
  assert.match(source, /JSON\.stringify\(resolvedIntent\)/);
  assert.match(source, /purchaseType: 'subscription'/);
  assert.doesNotMatch(source, /buy\.stripe\.com|PAYMENT_LINK/i);
});

test('the authenticated client has one retryable server-checkout service and no redirect fallback', () => {
  const service = read('../src/services/checkoutService.ts');
  const subscription = read('../src/hooks/useSubscription.ts');
  assert.match(service, /getAccessTokenSafely/);
  assert.match(service, /functions\.invoke\('create-checkout'/);
  assert.match(service, /checkout_start_failed/);
  assert.match(subscription, /await startCheckout\(/);
  assert.match(subscription, /createCreditPackCheckout/);
  assert.doesNotMatch(`${service}\n${subscription}`, /buy\.stripe\.com|payment.?link/i);
});

test('subscription checkout fails closed on the canonical plan and interval Price ID', () => {
  const source = read('../supabase/functions/create-checkout/index.ts');
  const subscriptionBranch = source.slice(source.indexOf('if (!isPaidPlan(requestedTier))'));
  assert.match(source, /stripe_price_id_monthly/);
  assert.match(source, /stripe_price_id_yearly/);
  assert.match(source, /CHECKOUT_PRICE_NOT_CONFIGURED/);
  assert.match(source, /CHECKOUT_PRICE_MISMATCH/);
  assert.match(source, /price: canonicalPrice\.priceId/);
  assert.match(source, /stripe_checkout_sessions/);
  assert.match(source, /checkout_session_created/);
  assert.doesNotMatch(subscriptionBranch, /price_data|payment.?link|buy\.stripe\.com/i);
});

test('webhook delivery is durable and unresolved revenue events stay unprocessed', () => {
  const source = read('../supabase/functions/stripe-webhook/index.ts');
  for (const eventType of [
    'checkout.session.completed',
    'checkout.session.expired',
    'invoice.payment_failed',
    'payment_intent.payment_failed',
    'invoice.paid',
  ]) {
    assert.match(source, new RegExp(eventType.replaceAll('.', '\\.')));
  }
  assert.ok(source.indexOf('.from("stripe_webhook_events").insert') < source.indexOf('switch (event.type)'));
  assert.match(source, /UNKNOWN_STRIPE_PRICE/);
  assert.match(source, /UNRESOLVED_(?:CHECKOUT|SUBSCRIPTION|PAYMENT)_USER/);
  assert.match(source, /error_message: err\.message,[\s\S]*processed: false/);
  assert.match(source, /checkout_session_expired/);
  assert.match(source, /payment_failed/);
});

test('public mentor surfaces expose Message and Save without booking actions', () => {
  const card = read('../src/components/mentor-marketplace/MentorCard.tsx');
  const profile = read('../src/components/mentor-marketplace/MentorProfile.tsx');
  const legacyProfile = read('../src/pages/Profile.tsx');
  const app = read('../src/App.tsx');
  const saves = read('../src/hooks/useMentorSaves.ts');
  for (const surface of [card, profile]) {
    assert.match(surface, /\bMessage\b/);
    assert.match(surface, /saveButton\.label/);
    assert.doesNotMatch(surface, /Book Discovery Call|Unavailable for Calls|createIntent|confirmBooking/i);
  }
  assert.match(saves, /'Save Mentor'/);
  assert.doesNotMatch(legacyProfile, /Book Discovery Call|createIntent|confirmBooking/i);
  assert.match(app, /path="\/mentorship\/book\/:id"[\s\S]*Navigate to="\/mentorship"/);
});

test('discovery-call creation is paused while historical attempts expire with audit history', () => {
  const service = read('../supabase/functions/discovery-call-service/index.ts');
  const enumMigration = read('../supabase/migrations/20260805110000_add_discovery_call_expired_status.sql');
  const expiryMigration = read('../supabase/migrations/20260805111000_expire_stale_discovery_call_intents.sql');
  const refundMigration = read('../supabase/migrations/20260805112000_refund_unverified_self_confirmed_calls.sql');
  assert.match(service, /action === "createIntent"[\s\S]*FEATURE_PAUSED/);
  assert.match(service, /action === "confirmBooking"[\s\S]*FEATURE_PAUSED/);
  assert.match(enumMigration, /ADD VALUE IF NOT EXISTS 'expired'/);
  assert.match(expiryMigration, /status = 'intent_created'[\s\S]*interval '24 hours'/);
  assert.match(expiryMigration, /INSERT INTO public\.discovery_call_events/);
  assert.match(refundMigration, /credits_refunded = true/);
  assert.match(refundMigration, /'refund'/);
});

test('sprint checkpoints are founder-requested, admin-verified, and zero-credit', () => {
  const migration = read('../supabase/migrations/20260805120000_first_customer_sprint_admin_checkpoint.sql');
  assert.match(migration, /request_first_customer_sprint_checkpoint_v1/);
  assert.match(migration, /founder_id = auth\.uid\(\)/);
  assert.match(migration, /admin_update_first_customer_sprint_checkpoint_v1/);
  assert.match(migration, /public\.has_role\(auth\.uid\(\), 'admin'::app_role\)/);
  assert.match(migration, /checkpoint_verified_at IS NOT NULL/);
  assert.match(migration, /mentor_recommendation_summary/);
  assert.match(migration, /discovery_call_id = NULL/);
  assert.match(migration, /'creditsDeducted', 0/);
  assert.doesNotMatch(migration, /deduct_credits_atomic/);
});
