import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolveIdentityAvatarUrl, resolveIdentityDisplayName } from '../src/lib/identityProfile.ts';

// socialAuth.ts imports the Supabase browser client, so assert its provider wiring
// from source rather than importing it into a plain node test.
const socialAuthSource = readFileSync(new URL('../src/lib/socialAuth.ts', import.meta.url), 'utf8');
const authCallbackSource = readFileSync(new URL('../src/pages/AuthCallback.tsx', import.meta.url), 'utf8');
const authContextSource = readFileSync(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');
const displayNameMigration = readFileSync(
  new URL('../supabase/migrations/20260725140000_social_signup_display_name_parity.sql', import.meta.url),
  'utf8',
);

// Real metadata shapes captured from auth.identities for each live provider.
const GOOGLE_METADATA = {
  full_name: 'Ada Lovelace',
  name: 'Ada Lovelace',
  avatar_url: 'https://lh3.googleusercontent.com/a/ada',
  picture: 'https://lh3.googleusercontent.com/a/ada',
};
const LINKEDIN_METADATA = {
  name: 'Crystal Thuy Dong',
  given_name: 'Crystal Thuy',
  family_name: 'Dong',
  picture: 'https://media.licdn.com/dms/image/crystal',
};
const X_METADATA = {
  full_name: 'Donald Burg',
  name: 'Donald Burg',
  user_name: 'DBWinkz',
  avatar_url: 'https://pbs.twimg.com/profile_images/db_normal.jpg',
  picture: 'https://pbs.twimg.com/profile_images/db_normal.jpg',
};

test('all three signup CTAs map to the provider ids Supabase has identities for', () => {
  assert.match(socialAuthSource, /SocialAuthProviderId = 'google' \| 'linkedin_oidc' \| 'x'/);
  assert.match(socialAuthSource, /google:\s*\{\s*providerName: 'Google',\s*signupMethod: 'google',/);
  assert.match(socialAuthSource, /linkedin_oidc:\s*\{\s*providerName: 'LinkedIn',\s*signupMethod: 'linkedin',/);
  assert.match(socialAuthSource, /x:\s*\{\s*providerName: 'X',\s*signupMethod: 'x',/);
  // Every CTA must return to the app's own callback route.
  assert.match(socialAuthSource, /redirectTo: `\$\{window\.location\.origin\}\/auth\/callback`/);
});

test('every provider resolves a real display name, not an email prefix', () => {
  assert.equal(resolveIdentityDisplayName(GOOGLE_METADATA), 'Ada Lovelace');
  // LinkedIn OIDC sends no full_name — this is what left profiles named "tdong1919".
  assert.equal(resolveIdentityDisplayName(LINKEDIN_METADATA), 'Crystal Thuy Dong');
  assert.equal(resolveIdentityDisplayName(X_METADATA), 'Donald Burg');
});

test('display name falls back through the OIDC name claims', () => {
  assert.equal(resolveIdentityDisplayName({ given_name: 'Crystal Thuy', family_name: 'Dong' }), 'Crystal Thuy Dong');
  assert.equal(resolveIdentityDisplayName({ given_name: 'Crystal Thuy' }), 'Crystal Thuy');
  assert.equal(resolveIdentityDisplayName({ preferred_username: 'DBWinkz' }), 'DBWinkz');
  assert.equal(resolveIdentityDisplayName({ full_name: '   ' }), '');
  assert.equal(resolveIdentityDisplayName(null), '');
});

test('every provider resolves an avatar', () => {
  assert.equal(resolveIdentityAvatarUrl(GOOGLE_METADATA), 'https://lh3.googleusercontent.com/a/ada');
  assert.equal(resolveIdentityAvatarUrl(LINKEDIN_METADATA), 'https://media.licdn.com/dms/image/crystal');
  assert.equal(resolveIdentityAvatarUrl(X_METADATA), 'https://pbs.twimg.com/profile_images/db_normal.jpg');
  assert.equal(resolveIdentityAvatarUrl({}), null);
});

test('the OAuth callback never re-exchanges a code the client already consumed', () => {
  // detectSessionInUrl:true exchanges the code during client init and deletes the
  // single-use verifier; a second exchange always 400s and used to surface as
  // "Authentication failed" on an account that was in fact created.
  assert.match(authCallbackSource, /if \(code && !\(await getSessionSafely\(\)\)\)/);
  assert.match(authCallbackSource, /if \(exchangeError && !\(await getSessionSafely\(\)\)\)/);
});

test('the welcome email is addressed with the provider-agnostic name', () => {
  assert.match(authContextSource, /const signupDisplayName = resolveIdentityDisplayName\(signedInUser\.user_metadata\)/);
  assert.match(authContextSource, /'send-welcome-email',\s*\{\s*body:\s*\{\s*email,\s*fullName: signupDisplayName/);
  assert.doesNotMatch(authContextSource, /fullName: signedInUser\.user_metadata\?\.full_name \|\| ''/);
});

test('signup emails fire off the live new-account signal, not the dead isNewProfile flag', () => {
  // isNewProfile only becomes true when the client creates the profile; the signup DB
  // trigger made that permanently false, which silently killed the welcome email.
  assert.match(
    authContextSource,
    /const isNewAccount =\s*\(signupIntentMethod !== null \|\| isBrandNewProfile\) && isRecentSignup\(signedInUser\.created_at\)/,
  );
  assert.match(authContextSource, /if \(isNewAccount && !signupEmailsAlreadySent\)/);
  // Re-sending on a later sign-in must stay impossible.
  assert.match(authContextSource, /const signupEmailGuardKey = `signup_emails_sent_\$\{userId\}`/);

  const welcomeInvokeIndex = authContextSource.indexOf("'send-welcome-email'");
  const newAccountGateIndex = authContextSource.indexOf('if (isNewAccount && !signupEmailsAlreadySent)');
  assert.ok(newAccountGateIndex > 0 && welcomeInvokeIndex > newAccountGateIndex);
});

test('X signups are attributed to X rather than falling back to email', () => {
  assert.match(authContextSource, /rawMethod === 'x' \|\| rawMethod === 'twitter'/);
  assert.match(authCallbackSource, /oauthSignupMethod === 'x'/);
});

test('the signup trigger reads every provider name and avatar claim', () => {
  assert.match(displayNameMigration, /raw_user_meta_data->>'name'/);
  assert.match(displayNameMigration, /raw_user_meta_data->>'given_name'/);
  assert.match(displayNameMigration, /raw_user_meta_data->>'picture'/);
  // The email-prefix fallback must stay last, after every provider claim.
  assert.ok(
    displayNameMigration.indexOf("raw_user_meta_data->>'given_name'") <
      displayNameMigration.indexOf("split_part(COALESCE(NEW.email, ''), '@', 1)"),
  );
});
