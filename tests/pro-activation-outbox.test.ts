import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProActivationIdempotencyKey,
  getProActivationRetryDelayMinutes,
  shouldEnqueueProActivation,
} from '../supabase/functions/_shared/pro-activation.ts';

test('checkout-driven pro activations always enqueue for durable delivery', () => {
  assert.equal(shouldEnqueueProActivation({
    previousTier: 'pro',
    nextTier: 'pro',
    wasSubscribed: true,
    isSubscribed: true,
    source: 'checkout',
  }), true);
});

test('subscription transition to pro enqueues only on first activation or reactivation', () => {
  assert.equal(shouldEnqueueProActivation({
    previousTier: 'rising',
    nextTier: 'pro',
    wasSubscribed: true,
    isSubscribed: true,
    source: 'subscription',
  }), true);

  assert.equal(shouldEnqueueProActivation({
    previousTier: 'pro',
    nextTier: 'pro',
    wasSubscribed: true,
    isSubscribed: true,
    source: 'subscription',
  }), false);

  assert.equal(shouldEnqueueProActivation({
    previousTier: 'pro',
    nextTier: 'pro',
    wasSubscribed: false,
    isSubscribed: true,
    source: 'subscription',
  }), true);
});

test('invoice updates never force a pro activation when the user is not subscribed', () => {
  assert.equal(shouldEnqueueProActivation({
    previousTier: 'rookie',
    nextTier: 'pro',
    wasSubscribed: false,
    isSubscribed: false,
    source: 'invoice',
  }), false);
});

test('pro activation idempotency key stays stable across retries', () => {
  assert.equal(
    buildProActivationIdempotencyKey({
      stripeEventId: 'evt_123',
      userId: 'user_456',
      subscriptionId: 'sub_789',
    }),
    'pro_activation:evt_123:user_456:sub_789'
  );
});

test('retry delay uses bounded exponential backoff', () => {
  assert.equal(getProActivationRetryDelayMinutes(1), 5);
  assert.equal(getProActivationRetryDelayMinutes(2), 10);
  assert.equal(getProActivationRetryDelayMinutes(3), 20);
  assert.equal(getProActivationRetryDelayMinutes(10), 360);
});