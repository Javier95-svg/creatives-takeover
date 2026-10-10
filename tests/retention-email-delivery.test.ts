import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { isServiceRoleToken } from '../supabase/functions/_shared/service-caller.ts';
import { retentionEventColumn } from '../supabase/functions/_shared/resend-retention-events.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (claims: object) => `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.signature`;

test('the service role is recognised whichever copy of its key the caller holds', () => {
  const runtimeKey = token({ role: 'service_role', iat: 1_790_000_000 });
  const storedKey = token({ role: 'service_role', iat: 1_755_475_200 });
  assert.equal(isServiceRoleToken(runtimeKey, runtimeKey), true);
  // The database jobs' key: same role, different string. Rejected before the fix.
  assert.equal(isServiceRoleToken(storedKey, runtimeKey), true);
  assert.equal(isServiceRoleToken(token({ role: 'authenticated', sub: 'user-1' }), runtimeKey), false);
  assert.equal(isServiceRoleToken(token({ role: 'anon' }), runtimeKey), false);
  assert.equal(isServiceRoleToken('', runtimeKey), false);
  assert.equal(isServiceRoleToken('not-a-jwt', runtimeKey), false);
  assert.equal(isServiceRoleToken('a.%%%.c', runtimeKey), false);
});

test('the role claim is only trusted where the gateway verifies the signature', () => {
  const sender = read('../supabase/functions/send-retention-email/index.ts');
  assert.match(sender, /if \(!isServiceRoleToken\(callerToken, supabaseServiceKey\)\) \{/);
  // send-retention-email must keep verify_jwt on (the default): no override in config.toml.
  assert.doesNotMatch(read('../supabase/config.toml'), /\[functions\.send-retention-email\]\s*verify_jwt\s*=\s*false/);
});

test('Resend opens, clicks, bounces and complaints map to the retention log', () => {
  assert.equal(retentionEventColumn('email.opened'), 'opened_at');
  assert.equal(retentionEventColumn('email.clicked'), 'clicked_at');
  assert.equal(retentionEventColumn('email.bounced'), 'bounced_at');
  assert.equal(retentionEventColumn('email.complained'), 'complained_at');
  assert.equal(retentionEventColumn('email.delivered'), null);
  assert.equal(retentionEventColumn(null), null);
});

test('profiles.last_seen_at exists for the retention readers, without the old cron job', () => {
  const migration = read('../supabase/migrations/20261015120000_profiles_last_seen_at.sql');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;/);
  assert.match(migration, /SET last_seen_at = COALESCE\(last_seen_at, last_activity_at, last_active_at, updated_at\)/);
  assert.match(migration, /CREATE TRIGGER sync_profiles_last_seen_at/);
  assert.doesNotMatch(migration, /cron\.schedule|re_engagement_emails \(/);
  // The two readers that failed without it.
  assert.match(read('../supabase/functions/_shared/retention-project-facts.ts'), /last_seen_at,last_activity_at,last_active_at/);
  assert.match(read('../supabase/functions/_shared/roadmap-retention-context.ts'), /last_seen_at,last_activity_at,last_active_at/);
});

test('the signed webhook Resend calls records retention events before the discovery-call filter', () => {
  const webhook = read('../supabase/functions/discovery-call-resend-webhook/index.ts');
  const verified = webhook.indexOf('if (!await verifySvixSignature(req, rawPayload))');
  const retention = webhook.indexOf('const retentionColumn = retentionEventColumn(eventType);');
  const filter = webhook.indexOf('if (category !== "discovery_call")');
  assert.ok(verified > 0 && verified < retention && retention < filter, 'verify, then record, then filter');
  // Only the first open or click is kept.
  assert.match(webhook, /\.eq\("resend_id", providerMessageId\)\s*\.is\(retentionColumn, null\)/);
  // Retention links carry the log id, so a signed-in click records the return.
  assert.match(read('../supabase/functions/send-retention-email/index.ts'), /target\.searchParams\.set\("retention_email_id", args\.logId\)/);
});
