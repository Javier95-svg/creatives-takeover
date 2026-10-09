import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test("the team's own visits never reach PostHog, signed in or not", () => {
  const source = read('../src/lib/analytics.ts');
  // Every PostHog event, autocaptured pageviews included, is dropped for internal traffic.
  const init = source.slice(source.indexOf('export const initPosthog'), source.indexOf('export const bootstrapPosthog'));
  assert.match(init, /before_send: \(captureResult\) => \{\s*if \(!captureResult\) return null;[\s\S]*?if \(isInternalUser\(\)\) return null;/);
  // A device stays internal after signing out, and can be marked by link.
  assert.match(source, /const INTERNAL_DEVICE_KEY = 'ct_internal_device_v1'/);
  assert.match(source, /get\('ct_internal'\)/);
  assert.match(source, /export const isInternalUser = \(\) => internalUser \|\| internalDevice;/);
  const setInternal = source.slice(source.indexOf('export const setInternalUser'), source.indexOf('export const clearInternalDevice'));
  assert.match(setInternal, /writeInternalDevice\(true\)/);
  assert.doesNotMatch(setInternal, /writeInternalDevice\(false\)/, 'signing out must not clear the device');
  const capture = source.slice(source.indexOf('export const captureEvent'), source.indexOf('export const identify'));
  assert.match(capture, /if \(isInternalUser\(\)\) \{\s*return;/);

  // Only a customer signing in on the device clears it.
  const auth = read('../src/contexts/AuthContext.tsx');
  assert.match(auth, /setInternalUser\(isInternalEmail\(email\)\);[\s\S]{0,160}if \(!isInternalEmail\(email\)\) clearInternalDevice\(\);/);
});
