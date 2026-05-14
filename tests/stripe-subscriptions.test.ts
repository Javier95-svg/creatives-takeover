import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildApplyStripeSubscriptionCheckoutRpcPayload,
  buildDowngradeStripeSubscriptionToRookieRpcPayload,
  getStripeSubscriptionBillingCycle,
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
