import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// 2026-11-16: Supabase Auth's SMTP login (Resend) was rejected and every email
// signup failed until an outside tester noticed. The login is now checked every
// hour without sending an email, and a rejection emails the admins.
test('the SMTP login Supabase Auth uses is checked hourly, without sending email', () => {
  const health = read('supabase/functions/ai-provider-health/index.ts');
  assert.match(health, /provider: "auth_email"/);
  assert.match(health, /auth_email: "AUTH_SMTP_PASSWORD"/);
  assert.match(health, /host: env\("AUTH_SMTP_HOST"\) \|\| "smtp\.resend\.com"/);
  assert.match(health, /const selected = only \? CHECKS\.filter/);
  assert.match(health, /URGENT: Supabase Auth can't send email/);

  const probe = read('supabase/functions/_shared/smtp-probe.ts');
  assert.match(probe, /await expect\(235, "login rejected"\)/);
  assert.doesNotMatch(probe, /MAIL FROM|RCPT TO|DATA/, 'the probe must never send a message');

  const migration = read('supabase/migrations/20261116210000_auth_email_health_hourly.sql');
  assert.match(migration, /cron\.schedule\('ai-provider-health-auth-email-hourly', '17 \* \* \* \*'/);
  assert.match(migration, /'\{"only":\["auth_email"\]\}'::jsonb/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.dispatch_auth_email_health_check\(\) FROM PUBLIC, anon, authenticated/);
});
