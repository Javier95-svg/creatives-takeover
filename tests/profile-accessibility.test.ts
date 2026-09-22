import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profile = readFileSync('src/pages/Profile.tsx', 'utf8');
const migration = readFileSync(
  'supabase/migrations/20260922200000_expose_account_type_profile_fields.sql',
  'utf8',
);

test('account-type fields selected by the profile page exist in the public projection', () => {
  for (const column of ['user_type', 'role_profile']) {
    assert.match(profile, new RegExp(`'${column}'`));
    assert.match(migration, new RegExp(`p\\.${column}`));
  }
  assert.match(migration, /GRANT SELECT ON TABLE public\.public_profiles TO anon, authenticated/);
});

test('the public view rebuild preserves the derived SEO field as an expression', () => {
  assert.match(migration, /profile_is_search_indexable\(p\) AS seo_indexable/);
  assert.doesNotMatch(migration, /p\.seo_indexable/);
  assert.match(migration, /ORDER BY ordinal_position/);
});

test('an optional projection mismatch cannot make an existing profile look missing', () => {
  assert.match(profile, /CORE_PUBLIC_PROFILE_SELECT/);
  assert.match(profile, /retrying core fields/);
  assert.match(profile, /return run\(CORE_PUBLIC_PROFILE_SELECT\)/);
});

test('database failures and genuinely absent profiles have different recovery states', () => {
  assert.match(profile, /Profile Temporarily Unavailable/);
  assert.match(profile, /Profile Not Found/);
  assert.match(profile, /if \(profileError\) \{\s*throw profileError;/);
});

test('public account type details survive mapping into the rendered profile', () => {
  assert.match(profile, /user_type: profile\.user_type \?\? null/);
  assert.match(profile, /role_profile: profile\.role_profile \?\? null/);
});
