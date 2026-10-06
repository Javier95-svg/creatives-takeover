import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authSessionHint } from '../src/lib/authSessionHint.ts';

const session = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

test('a visitor with nothing stored is not shown the signed-in skeleton', () => {
  assert.equal(authSessionHint(null, '', ''), false);
});

test('a usable stored session keeps the skeleton while it restores', () => {
  assert.equal(authSessionHint(session(), '', ''), true);
});

test('a stored session Supabase cannot recover counts as signed out', () => {
  assert.equal(authSessionHint(session({ refresh_token: '' }), '', ''), false);
  assert.equal(authSessionHint('not json', '', ''), false);
});

test('auth redirects still carrying credentials count as signing in', () => {
  assert.equal(authSessionHint(null, '?code=abc123', ''), true);
  assert.equal(authSessionHint(null, '?source=x&code=abc', ''), true);
  assert.equal(authSessionHint(null, '', '#access_token=abc&type=magiclink'), true);
  assert.equal(authSessionHint(null, '?promo=code', ''), false);
});

test('the workspace frame only draws the skeleton for loads that can sign in', () => {
  const frame = readFileSync('src/components/WorkspaceRouteFrame.tsx', 'utf8');
  assert.match(frame, /if \(applicable && \(\(loading && mayBeSignedIn\) \|\| \(user && pending\)\)\) return <WorkspaceSkeleton \/>;/);
});
