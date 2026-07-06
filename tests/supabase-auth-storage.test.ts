import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSupabaseAuthStorageKey,
  shouldDropStoredSupabaseAuthSession,
} from '../src/integrations/supabase/sessionStorage.ts';

test('Supabase auth storage key is derived from the project ref', () => {
  assert.equal(
    getSupabaseAuthStorageKey('https://rcjlaybjnozqbsoxzboa.supabase.co'),
    'sb-rcjlaybjnozqbsoxzboa-auth-token'
  );
});

test('Supabase auth storage keeps recoverable sessions with refresh tokens', () => {
  const raw = JSON.stringify({
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });

  assert.equal(shouldDropStoredSupabaseAuthSession(raw), false);
});

test('Supabase auth storage drops malformed or unrecoverable sessions', () => {
  assert.equal(shouldDropStoredSupabaseAuthSession('{not-json'), true);
  assert.equal(
    shouldDropStoredSupabaseAuthSession(JSON.stringify({ access_token: 'access-token' })),
    true
  );
  assert.equal(
    shouldDropStoredSupabaseAuthSession(JSON.stringify({ refresh_token: 'refresh-token' })),
    true
  );
});
