import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// 2026-11-16: Supabase Auth's SMTP key was rejected and every email signup
// failed until an outside tester noticed. Auth emails now go through
// auth_email_outbox and Resend's API; this check alerts within 10 minutes when
// the key is rejected or emails fail or get stuck.
test('auth emails are checked every 10 minutes: Resend key, failed and stuck queue rows', () => {
  const health = read('supabase/functions/ai-provider-health/index.ts');
  assert.match(health, /provider: "auth_email"/);
  assert.match(health, /auth_email: "RESEND_API_KEY"/);
  assert.match(health, /https:\/\/api\.resend\.com\/domains/);
  assert.match(health, /restricted_api_key/, 'a sending-only key is a working key');
  assert.match(health, /from\("auth_email_outbox"\)[\s\S]{0,120}\.eq\("status", "failed"\)/);
  assert.match(health, /\.in\("status", \["pending", "sending"\]\)/);
  assert.match(health, /const selected = only \? CHECKS\.filter/);
  assert.match(health, /URGENT: Signup and password emails are not going out/);
  assert.equal(existsSync(new URL('../supabase/functions/_shared/smtp-probe.ts', import.meta.url)), false, 'SMTP is no longer used');

  const hourly = read('supabase/migrations/20261116210000_auth_email_health_hourly.sql');
  assert.match(hourly, /'\{"only":\["auth_email"\]\}'::jsonb/);
  assert.match(hourly, /REVOKE ALL ON FUNCTION public\.dispatch_auth_email_health_check\(\) FROM PUBLIC, anon, authenticated/);
  const outbox = read('supabase/migrations/20261116220000_auth_email_outbox.sql');
  assert.match(outbox, /cron\.schedule\('ai-provider-health-auth-email-hourly', '\*\/10 \* \* \* \*'/);
});
