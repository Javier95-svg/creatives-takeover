import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ADMIN_SIGNUP_NOTICE_TYPE,
  nameFromMetadata,
  providerLabel,
  renderAdminSignupNotice,
} from '../supabase/functions/_shared/admin-signup-notice.ts';
import { adminRecipients } from '../supabase/functions/_shared/admin-recipients.ts';
import { findVoiceViolations } from '../supabase/functions/_shared/email-voice.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// 2026-11-17: the admins' new-signup notice moved from the new member's
// browser (first sign-in only) to a trigger on auth.users, so every account
// is reported, confirmed or not.
test('every new account queues one notice, and a queuing problem never blocks the signup', () => {
  const sql = read('supabase/migrations/20261117050000_admin_signup_notice.sql');
  assert.match(sql, /AFTER INSERT ON auth\.users\s+FOR EACH ROW EXECUTE FUNCTION public\.queue_admin_signup_notice\(\)/);
  assert.match(sql, /'admin_new_signup'/);
  assert.match(sql, /EXCEPTION WHEN OTHERS THEN\s+RAISE WARNING/);
  assert.match(sql, /RETURN NEW;\s+END;\s+\$\$;/);
  assert.match(sql, /COALESCE\(NEW\.is_anonymous, false\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.queue_admin_signup_notice\(\) FROM PUBLIC, anon, authenticated;/);
  assert.equal(ADMIN_SIGNUP_NOTICE_TYPE, 'admin_new_signup');
});

test('the notice says who, how and whether they confirmed, in the house voice', () => {
  const waiting = renderAdminSignupNotice({ email: 'ana@x.com', name: 'Ana <b>Ruiz</b>', provider: 'email', confirmed: false, createdAt: '2026-11-17T04:43:13Z', exists: true });
  assert.equal(waiting.subject, 'New signup: Ana <b>Ruiz</b> (Email and password)');
  assert.match(waiting.text, /Status: Waiting for email confirmation/);
  assert.match(waiting.text, /Created: 2026-11-17 04:43 UTC/);
  assert.match(waiting.html, /Ana &lt;b&gt;Ruiz&lt;\/b&gt;/);
  assert.doesNotMatch(waiting.html, /<b>Ruiz/);
  assert.deepEqual(findVoiceViolations(`${waiting.subject} ${waiting.text}`), []);

  const google = renderAdminSignupNotice({ email: 'b@x.com', name: null, provider: 'google', confirmed: true, createdAt: null, exists: true });
  assert.equal(google.subject, 'New signup: b@x.com (Google)');
  assert.match(google.text, /Status: Confirmed/);
  const gone = renderAdminSignupNotice({ email: 'c@x.com', name: null, provider: 'x', confirmed: false, createdAt: null, exists: false });
  assert.match(gone.text, /Status: Deleted before this notice was sent/);

  assert.equal(providerLabel('linkedin_oidc'), 'LinkedIn');
  assert.equal(providerLabel(null), 'Unknown');
  assert.equal(nameFromMetadata({ given_name: 'Li', family_name: 'Wu' }), 'Li Wu');
  assert.equal(nameFromMetadata({ name: ' Sam ' }), 'Sam');
});

test('notices always reach admin@ and javier@, plus valid configured addresses', () => {
  assert.deepEqual(adminRecipients('"Ops" <ops@x.com>; not-an-email, ADMIN@creatives-takeover.com'), [
    'admin@creatives-takeover.com', 'javier@creatives-takeover.com', 'ops@x.com',
  ]);
  assert.deepEqual(adminRecipients(undefined), ['admin@creatives-takeover.com', 'javier@creatives-takeover.com']);
});

test('the worker sends the notice to the admins and the browser no longer does', () => {
  const worker = read('supabase/functions/auth-email-worker/index.ts');
  assert.match(worker, /row\.email_action_type === ADMIN_SIGNUP_NOTICE_TYPE \? sendAdminSignupNotice\(row, db\)/);
  assert.match(worker, /db\.auth\.admin\.getUserById\(stored\.user_id\)/);
  assert.match(worker, /adminRecipients\(Deno\.env\.get\("ADMIN_NOTIFICATION_EMAILS"\)/);
  assert.doesNotMatch(read('src/contexts/AuthContext.tsx'), /invoke\('notify-admin'/);

  const health = read('supabase/functions/ai-provider-health/index.ts');
  const outboxQueries = health.match(/from\("auth_email_outbox"\)[^\n]+/g) ?? [];
  assert.equal(outboxQueries.length, 2);
  for (const query of outboxQueries) assert.match(query, /\.neq\("email_action_type", "admin_new_signup"\)/, 'admin notices never raise the signup-email alert');
});
