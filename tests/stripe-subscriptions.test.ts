import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildApplyStripeSubscriptionCheckoutRpcPayload,
  buildDowngradeStripeSubscriptionToRookieRpcPayload,
  getStripeInvoiceSubscriptionId,
  getStripeSubscriptionBillingCycle,
  getStripeSubscriptionPeriodEnd,
  getStripeSubscriptionPeriodStart,
  getStripeSubscriptionPriceId,
} from '../supabase/functions/_shared/stripe-subscriptions.ts';

const subscription = {
  id: 'sub_123',
  current_period_start: 1_771_000_000,
  current_period_end: 1_773_592_000,
  billing_cycle_anchor: 1_771_000_000,
  items: {
    data: [
      {
        price: {
          id: 'price_starter_monthly',
          recurring: { interval: 'month' },
        },
      },
    ],
  },
};

test('subscription helper extracts Stripe price id for tier lookup', () => {
  assert.equal(getStripeSubscriptionPriceId(subscription), 'price_starter_monthly');
  assert.equal(getStripeSubscriptionBillingCycle(subscription), 'monthly');
});

// The webhook endpoint delivers event.data.object in ITS OWN API version
// (2026-01-28.clover), while the SDK is pinned to 2023-10-16. Stripe's 2025
// "Basil" releases moved the billing period onto subscription items and the
// invoice's subscription pointer under `parent`. Reading only the legacy path
// fails silently — undefined, not an error — so renewals get skipped and
// monthly credits are never refreshed. Both shapes must keep working.
test('subscription period reads legacy and Basil-era field locations', () => {
  assert.equal(getStripeSubscriptionPeriodStart(subscription), 1_771_000_000);
  assert.equal(getStripeSubscriptionPeriodEnd(subscription), 1_773_592_000);

  const basilSubscription = {
    id: 'sub_123',
    items: {
      data: [{
        price: { id: 'price_starter_monthly', recurring: { interval: 'month' } },
        current_period_start: 1_771_000_000,
        current_period_end: 1_773_592_000,
      }],
    },
  };
  assert.equal(getStripeSubscriptionPeriodStart(basilSubscription), 1_771_000_000);
  assert.equal(getStripeSubscriptionPeriodEnd(basilSubscription), 1_773_592_000);
  assert.equal(getStripeSubscriptionPeriodEnd({}), null);
});

test('invoice subscription id reads legacy and Basil-era field locations', () => {
  assert.equal(getStripeInvoiceSubscriptionId({ subscription: 'sub_legacy' }), 'sub_legacy');
  assert.equal(getStripeInvoiceSubscriptionId({ subscription: { id: 'sub_expanded' } }), 'sub_expanded');
  assert.equal(
    getStripeInvoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_basil' } } }),
    'sub_basil',
  );
  assert.equal(
    getStripeInvoiceSubscriptionId({
      lines: { data: [{ parent: { subscription_item_details: { subscription: 'sub_line' } } }] },
    }),
    'sub_line',
  );
  // A genuine one-off invoice must still be skipped rather than misread.
  assert.equal(getStripeInvoiceSubscriptionId({ id: 'in_oneoff' }), null);
});

test('checkout subscription helper builds apply RPC payload', () => {
  assert.deepEqual(
    buildApplyStripeSubscriptionCheckoutRpcPayload({
      userId: 'user_123',
      email: 'founder@example.com',
      stripeCustomerId: 'cus_123',
      subscription,
      event: {
        stripeEventId: 'evt_checkout',
        stripeEventType: 'checkout.session.completed',
      },
    }),
    {
      p_user_id: 'user_123',
      p_email: 'founder@example.com',
      p_stripe_customer_id: 'cus_123',
      p_stripe_subscription_id: 'sub_123',
      p_stripe_price_id: 'price_starter_monthly',
      p_stripe_event_id: 'evt_checkout',
      p_stripe_event_type: 'checkout.session.completed',
      p_billing_cycle: 'monthly',
      p_subscription_end: '2026-03-15T16:26:40.000Z',
      p_billing_anchor_at: '2026-02-13T16:26:40.000Z',
      p_current_period_start: '2026-02-13T16:26:40.000Z',
      p_current_period_end: '2026-03-15T16:26:40.000Z',
    },
  );
});

test('deleted subscription helper builds rookie downgrade RPC payload', () => {
  assert.deepEqual(
    buildDowngradeStripeSubscriptionToRookieRpcPayload({
      userId: 'user_123',
      stripeCustomerId: 'cus_123',
      subscription,
      event: {
        stripeEventId: 'evt_deleted',
        stripeEventType: 'customer.subscription.deleted',
      },
    }),
    {
      p_user_id: 'user_123',
      p_stripe_customer_id: 'cus_123',
      p_stripe_subscription_id: 'sub_123',
      p_stripe_event_id: 'evt_deleted',
      p_stripe_event_type: 'customer.subscription.deleted',
    },
  );
});

test('subscription RPC migration resolves tiers by stripe_price_id and prevents duplicate grants', () => {
  const source = readFileSync(new URL('../supabase/migrations/20260514090000_add_stripe_price_ids.sql', import.meta.url), 'utf8');

  assert.match(source, /WHERE st\.stripe_price_id = p_stripe_price_id/);
  assert.match(source, /ct\.metadata ->> 'stripe_event_id' = p_stripe_event_id/);
  assert.match(source, /IF v_grant_exists THEN/);
  assert.match(source, /CREATE OR REPLACE FUNCTION public\.apply_stripe_subscription_checkout/);
  assert.match(source, /CREATE OR REPLACE FUNCTION public\.downgrade_stripe_subscription_to_rookie/);
});

test('stripe webhook delegates subscription checkout and deletion to transactional RPCs', () => {
  const source = readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');

  assert.match(source, /apply_stripe_subscription_checkout/);
  assert.match(source, /buildApplyStripeSubscriptionCheckoutRpcPayload/);
  assert.match(source, /downgrade_stripe_subscription_to_rookie/);
  assert.match(source, /buildDowngradeStripeSubscriptionToRookieRpcPayload/);
});
