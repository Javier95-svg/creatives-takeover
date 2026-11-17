import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { authEmailMessages, renderAuthEmail, verifyUrl } from '../supabase/functions/_shared/auth-email-templates.ts';
import { findVoiceViolations } from '../supabase/functions/_shared/email-voice.ts';
import { confirmationSentMessage, EMAIL_RATE_LIMITED, mapSignUpError } from '../src/lib/authErrors.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const SUPABASE = 'https://ref.supabase.co';

// 2026-11-16: Supabase Auth emails moved from SMTP (whose key was rejected,
// failing every email signup) to a queue sent through Resend's API.
test('email change follows Supabase\'s reversed token naming; everything else goes to the account address', () => {
  const both = authEmailMessages({
    email: 'old@x.com', new_email: 'new@x.com',
    email_data: { email_action_type: 'email_change', token: '111111', token_hash: 'hash-for-new', token_new: '222222', token_hash_new: 'hash-for-current' },
  });
  assert.deepEqual(both, [
    { to: 'old@x.com', type: 'email_change', token: '111111', tokenHash: 'hash-for-current' },
    { to: 'new@x.com', type: 'email_change', token: '222222', tokenHash: 'hash-for-new' },
  ]);
  const single = authEmailMessages({ email: 'old@x.com', new_email: 'new@x.com', email_data: { email_action_type: 'email_change', token: '1', token_hash: 'h' } });
  assert.deepEqual(single, [{ to: 'new@x.com', type: 'email_change', token: '1', tokenHash: 'h' }]);
  const signup = authEmailMessages({ email: 'a@x.com', email_data: { email_action_type: 'signup', token: '9', token_hash: 'abc' } });
  assert.deepEqual(signup, [{ to: 'a@x.com', type: 'signup', token: '9', tokenHash: 'abc' }]);
});

test('links are Supabase\'s own verify URL, encoded, so /auth/callback keeps working', () => {
  const url = verifyUrl(`${SUPABASE}/`, { type: 'signup', tokenHash: 'a b&c' }, 'https://creatives-takeover.com/auth/callback?return=/onboarding');
  assert.equal(url, `${SUPABASE}/auth/v1/verify?token=a%20b%26c&type=signup&redirect_to=https%3A%2F%2Fcreatives-takeover.com%2Fauth%2Fcallback%3Freturn%3D%2Fonboarding`);
});

test('every auth email is short, in the house voice, and carries its link or code', () => {
  const types = ['signup', 'recovery', 'magiclink', 'email', 'invite', 'email_change', 'reauthentication', 'password_changed_notification', 'something_new'];
  for (const type of types) {
    const email = renderAuthEmail({ message: { to: 'a@x.com', type, token: '482913', tokenHash: 'th123' }, supabaseUrl: SUPABASE, redirectTo: 'https://creatives-takeover.com/' });
    assert.ok(email.subject.length < 50, `${type}: short subject`);
    assert.deepEqual(findVoiceViolations(`${email.subject} ${email.text}`), [], `${type}: voice`);
    assert.doesNotMatch(email.html, /Javier|<script/i, `${type}: no signature, nothing unescaped`);
    if (['signup', 'recovery', 'magiclink', 'email', 'invite', 'email_change'].includes(type)) {
      assert.match(email.html, /auth\/v1\/verify\?token=th123&amp;type=/, `${type}: button link`);
      assert.match(email.text, /auth\/v1\/verify\?token=th123&type=/, `${type}: plain link`);
    }
  }
  const code = renderAuthEmail({ message: { to: 'a@x.com', type: 'reauthentication', token: '482913', tokenHash: '' }, supabaseUrl: SUPABASE, redirectTo: '/' });
  assert.match(code.text, /482913/);
  assert.doesNotMatch(code.html, /auth\/v1\/verify/);
});

test('the hook only stores the email; only Auth may call it and nobody else can read the queue', () => {
  const sql = read('supabase/migrations/20261116220000_auth_email_outbox.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.queue_auth_email\(event jsonb\)\s+RETURNS jsonb/);
  assert.match(sql, /RETURN '\{\}'::jsonb;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.queue_auth_email\(jsonb\) TO supabase_auth_admin;/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.queue_auth_email\(jsonb\) FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /ALTER TABLE public\.auth_email_outbox ENABLE ROW LEVEL SECURITY;/);
  assert.match(sql, /REVOKE ALL ON public\.auth_email_outbox FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /WHEN 7|ELSE interval '30 minutes'/);
  assert.match(sql, /cron\.schedule\('auth-email-sweeper', '\* \* \* \* \*'/);
  assert.match(sql, /'ai-provider-health-auth-email-hourly', '\*\/10 \* \* \* \*'/);
  assert.match(sql, /drop the tokens/i);
});

test('the worker sends through Resend once per email and never logs tokens or addresses', () => {
  const worker = read('supabase/functions/auth-email-worker/index.ts');
  assert.match(worker, /"Idempotency-Key": `auth-email-\$\{rowId\}-\$\{index\}`/);
  assert.match(worker, /postToResend\(row\.id, index, \[message\.to\]/);
  assert.match(worker, /isWorkerRequest\(req\)/);
  assert.match(worker, /response\.status === 422/);
  for (const line of worker.split('\n').filter((l) => /console\.(log|error)/.test(l))) {
    assert.doesNotMatch(line, /\btoken|message\.to\b|payload|\.email\b|new_email|rendered/i, `log line leaks: ${line.trim()}`);
  }
});

test('signup screens say where the confirmation went, and a full email limit is not blamed on the person', () => {
  assert.equal(confirmationSentMessage(' a@x.com '), 'We sent a confirmation link to a@x.com. It can take a minute, and it may land in spam.');
  assert.equal(mapSignUpError({ message: 'email rate limit exceeded', code: 'over_email_send_rate_limit' } as any), EMAIL_RATE_LIMITED);
  for (const file of ['src/pages/Signup.tsx', 'src/pages/Auth.tsx', 'src/components/auth/SoftGateModal.tsx']) {
    assert.match(read(file), /confirmationSentMessage\(/, file);
  }
});
