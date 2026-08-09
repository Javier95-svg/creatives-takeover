import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

test('Discovery Call V2 reserves ten credits and validates three future slots', () => {
  const sql = read('../supabase/migrations/20260808122100_discovery_call_v2_transitions.sql');
  assert.match(sql, /v_slot_count <> 3 OR v_distinct_count <> 3/);
  assert.match(sql, /interval '72 hours'/);
  assert.match(sql, /interval '60 days'/);
  assert.match(sql, /used_from_quota[\s\S]*used_from_balance/);
  assert.match(sql, /INSUFFICIENT_CREDITS/);
  assert.match(sql, /Discovery Call booking confirmed/);
  assert.match(sql, /'DISCOVERY_CALL'/);
  assert.match(sql, /user_credits[\s\S]*FOR UPDATE[\s\S]*Recheck idempotency/);
});

test('confirmed bookings atomically enqueue founder, mentor, and admin email', () => {
  const sql = read('../supabase/migrations/20260808122100_discovery_call_v2_transitions.sql');
  const confirmationBlock = sql.slice(sql.indexOf("p_action = 'accept'"), sql.indexOf("ELSIF p_action = 'counter'"));
  assert.match(confirmationBlock, /'booking_confirmed', 'founder'/);
  assert.match(confirmationBlock, /'booking_confirmed', 'mentor'/);
  assert.match(confirmationBlock, /'booking_confirmed', 'admin'/);
  assert.match(confirmationBlock, /admin@creatives-takeover\.com/);
});

test('mentor portal stores token hashes and sends only encrypted token material to the outbox', () => {
  const schema = read('../supabase/migrations/20260808121100_discovery_call_request_workflow_v2_schema.sql');
  const shared = read('../supabase/functions/_shared/discovery-call-v2.ts');
  const portal = read('../supabase/functions/discovery-call-mentor-response/index.ts');
  assert.match(schema, /token_hash TEXT NOT NULL UNIQUE/);
  assert.match(shared, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(shared, /AES-GCM/);
  assert.doesNotMatch(portal, /console\.(?:log|error|warn)\([^)]*token/i);
});

test('provider events cannot mutate platform-owned V2 calls', () => {
  const provider = read('../supabase/functions/_shared/discovery-call-provider-events.ts');
  assert.match(provider, /workflow_version === 2/);
  assert.match(provider, /booking_source === "platform_request"/);
  assert.match(provider, /platform_request_is_provider_independent/);
});

test('durable notifications retry and recover stale claims', () => {
  const sql = read('../supabase/migrations/20260808122000_discovery_call_notification_outbox.sql');
  const cron = read('../supabase/migrations/20260808123000_schedule_discovery_call_workers.sql');
  const worker = read('../supabase/functions/process-discovery-call-notifications/index.ts');
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /interval '10 minutes'/);
  assert.match(sql, /interval '1 minute'/);
  assert.match(sql, /interval '6 hours'/);
  assert.match(worker, /complete_discovery_call_notification/);
  assert.match(worker, /buildDiscoveryCallIcs/);
  assert.match(cron, /discovery_call_cron_secret/);
  assert.match(cron, /'x-cron-secret'/);
});

test('request creation durably queues a founder receipt as well as mentor and admin notices', () => {
  const reliability = read('../supabase/migrations/20260809120000_discovery_call_notification_reliability_v3.sql');
  assert.match(reliability, /ensure_founder_discovery_request_receipt_v3/);
  assert.match(reliability, /'request_created', 'founder'/);
  assert.match(reliability, /AFTER INSERT ON public\.discovery_call_notification_outbox/);
  assert.match(reliability, /dc\.status = 'pending_mentor_response'/);
});

test('Resend delivery outcomes are signed, replay-safe, and stored separately from queue acceptance', () => {
  const reliability = read('../supabase/migrations/20260809120000_discovery_call_notification_reliability_v3.sql');
  const webhook = read('../supabase/functions/discovery-call-resend-webhook/index.ts');
  const config = read('../supabase/config.toml');
  assert.match(reliability, /provider_delivery_status/);
  assert.match(reliability, /provider_event_id TEXT NOT NULL UNIQUE/);
  assert.match(reliability, /email\.delivered/);
  assert.match(reliability, /email\.bounced/);
  assert.match(reliability, /email\.complained/);
  assert.match(reliability, /email\.suppressed/);
  assert.match(webhook, /svix-id/);
  assert.match(webhook, /svix-timestamp/);
  assert.match(webhook, /svix-signature/);
  assert.match(webhook, /DISCOVERY_CALL_RESEND_WEBHOOK_SECRET/);
  assert.match(webhook, /await req\.text\(\)/);
  assert.doesNotMatch(webhook, /req\.json\(\)/);
  assert.match(config, /\[functions\.discovery-call-resend-webhook\][\s\S]*verify_jwt = false/);
});

test('notification worker uses stable provider idempotency and admin receives independent failure alerts', () => {
  const reliability = read('../supabase/migrations/20260809120000_discovery_call_notification_reliability_v3.sql');
  const worker = read('../supabase/functions/process-discovery-call-notifications/index.ts');
  assert.match(worker, /"Idempotency-Key": input\.idempotencyKey/);
  assert.match(worker, /discovery-call\/\$\{row\.id\}\/\$\{row\.send_generation\}/);
  assert.match(worker, /\{ name: "category", value: "discovery_call" \}/);
  assert.match(worker, /\{ name: "outbox_id", value: input\.outboxId \}/);
  assert.match(reliability, /discovery_call_notification_alerts/);
  assert.match(reliability, /community_notifications/);
  assert.match(reliability, /delivery_attempts_exhausted/);
  assert.match(reliability, /delivery_not_confirmed/);
});

test('ended calls notify admin for outcome review and health requires confirmed delivery', () => {
  const reliability = read('../supabase/migrations/20260809120000_discovery_call_notification_reliability_v3.sql');
  const emails = read('../supabase/functions/_shared/discovery-call-emails.ts');
  assert.match(reliability, /'awaiting_outcome'/);
  assert.match(reliability, /'outcome_required', 'admin'/);
  assert.match(reliability, /confirmation_not_delivered/);
  assert.match(reliability, /provider_delivery_status[\s\S]*<> 'delivered'/);
  assert.match(emails, /outcome_required: "Discovery Call outcome requires review"/);
});

test('founder and public mentor routes use V2 service actions', () => {
  const booking = read('../src/pages/community/MentorBookingPage.tsx');
  const mentor = read('../src/pages/community/MentorDiscoveryResponsePage.tsx');
  const auth = read('../src/pages/AuthCallback.tsx');
  assert.match(booking, /createDiscoveryCallRequest/);
  assert.match(booking, /slots\.map/);
  assert.match(mentor, /respondAsMentor/);
  assert.match(mentor, /history\.replaceState/);
  assert.doesNotMatch(auth, /oauth_calendly_redirect/);
});

test('mentor scheduling fields are private and public mentor reads are explicit', () => {
  const privacy = read('../supabase/migrations/20260808160000_enforce_private_mentor_discovery_fields.sql');
  const mentors = read('../src/hooks/useMentors.ts');
  assert.match(privacy, /REVOKE SELECT ON public\.mentors FROM anon, authenticated/);
  assert.match(privacy, /GRANT SELECT \([\s\S]*\) ON public\.mentors TO anon, authenticated/);
  const publicGrant = privacy.slice(privacy.indexOf('GRANT SELECT ('), privacy.indexOf('COMMENT ON COLUMN'));
  assert.doesNotMatch(publicGrant, /contact_email|calendly_url|booking_provider/);
  assert.match(mentors, /PUBLIC_MENTOR_COLUMNS/);
  assert.doesNotMatch(mentors, /\.select\('\*'\)/);
});

test('workflow health flags every mandatory confirmation recipient', () => {
  const lifecycle = read('../supabase/migrations/20260808122200_discovery_call_v2_lifecycle.sql');
  assert.match(lifecycle, /missing_confirmation_notification/);
  assert.match(lifecycle, /VALUES \('founder'\), \('mentor'\), \('admin'\)/);
  assert.match(lifecycle, /scheduled_without_finalized_hold/);
  assert.match(lifecycle, /multiple_pending_rounds/);
  assert.match(lifecycle, /reservationBillingPeriodStart/);
  assert.match(lifecycle, /expiredMonthlyCreditsNotRestored/);
});
