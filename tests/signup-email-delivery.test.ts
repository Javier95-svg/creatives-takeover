import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { EMAIL_DELIVERY_FAILED, isEmailDeliveryError, mapSignUpError } from '../src/lib/authErrors.ts';

// 2026-11-16: Supabase Auth's SMTP login was rejected (535) and every email
// signup answered "Error sending confirmation email". No account is created in
// that case, so the message says so and points to the paths that still work.
test('a failed confirmation email says no account was made and offers the social sign-ins', () => {
  const error = { message: 'Error sending confirmation email', name: 'AuthApiError', status: 500 } as any;
  assert.equal(isEmailDeliveryError(error), true);
  assert.equal(mapSignUpError(error), EMAIL_DELIVERY_FAILED);
  assert.match(EMAIL_DELIVERY_FAILED, /wasn't created/);
  assert.match(EMAIL_DELIVERY_FAILED, /Google, LinkedIn or X/);
  assert.match(EMAIL_DELIVERY_FAILED, /contact us/);
  assert.equal(isEmailDeliveryError({ message: 'User already registered' }), false);
});

test('the signup page tracks the failure and links to Contact', () => {
  const page = readFileSync(new URL('../src/pages/Signup.tsx', import.meta.url), 'utf8');
  assert.match(page, /captureEvent\('signup_email_delivery_failed', \{ where: 'signup_page' \}\)/);
  assert.match(page, /action: \{ label: 'Contact us', onClick: \(\) => navigate\('\/contact'\) \}/);
  const registry = JSON.parse(readFileSync(new URL('../analytics/posthog/customer-journey.json', import.meta.url), 'utf8'));
  assert.ok(JSON.stringify(registry).includes('"signup_email_delivery_failed"'));
});
