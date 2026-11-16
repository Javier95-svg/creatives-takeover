import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { keepUserIfUnchanged } from '../src/lib/stableAuthUser.ts';

const user = (extra: Record<string, unknown> = {}) => ({ id: 'u1', email: 'a@b.co', updated_at: '2026-11-15T00:00:00Z', user_metadata: { name: 'A' }, ...extra });

test('a re-announced session for the same, unchanged account keeps the same user object', () => {
  const previous = user();
  assert.equal(keepUserIfUnchanged(user())(previous), previous, 'tab focus or token refresh: no new object, no refetch');
  const renamed = user({ user_metadata: { name: 'B' } });
  assert.equal(keepUserIfUnchanged(renamed)(previous), renamed, 'a real change still comes through');
  const other = user({ id: 'u2' });
  assert.equal(keepUserIfUnchanged(other)(previous), other, 'another account replaces it');
  assert.equal(keepUserIfUnchanged(null)(previous), null, 'sign-out clears it');
  const first = user();
  assert.equal(keepUserIfUnchanged(first)(null), first, 'first sign-in sets it');
});

test('the auth provider and the research screen do not reload on a tab switch', () => {
  const auth = readFileSync(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(auth, /setUser\((current|existing|refreshed)Session\?\.user \?\? null\)/, 'every session update goes through keepUserIfUnchanged');
  const hook = readFileSync(new URL('../src/hooks/useGtmResearch.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(hook, /\[user[,\]]/, 'research callbacks depend on the account id, not the user object');
  assert.match(hook, /if \(firstLoad\) setLoading\(true\)/, 'the spinner is for a new account or project only');
});
