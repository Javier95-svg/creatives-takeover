import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ONBOARDING_SUPPORT_EMAIL,
  buildOnboardingFailureMessage,
} from '../src/lib/onboardingFailureMessage.ts';

const SESSION = '7bc06767-c8b5-4d02-be2b-569d0000ffff';

test('the first failure reads as transient and invites a retry', () => {
  const message = buildOnboardingFailureMessage(1, SESSION);
  assert.match(message, /try again/i);
  assert.ok(!message.includes(ONBOARDING_SUPPORT_EMAIL), 'first attempt should not escalate');
});

test('a repeated failure stops promising a retry and routes to support', () => {
  const message = buildOnboardingFailureMessage(2, SESSION);

  // The whole point: a deterministic server failure made founders retry five
  // or more times against a wall. The copy must not keep inviting that.
  assert.ok(!/please try again/i.test(message), 'must not still invite a bare retry');
  assert.match(message, /will not fix it/i);
  assert.ok(message.includes(ONBOARDING_SUPPORT_EMAIL), 'must give a route out');
  assert.match(message, /7bc06767/, 'must quote a reference support can trace');
  assert.match(message, /answers are safe/i);
});

test('a missing session id still produces usable copy', () => {
  const message = buildOnboardingFailureMessage(3, '');
  assert.ok(message.includes(ONBOARDING_SUPPORT_EMAIL));
  assert.ok(!message.includes('undefined'));
  assert.ok(!/reference\s*\./i.test(message), 'no dangling empty reference');
});
