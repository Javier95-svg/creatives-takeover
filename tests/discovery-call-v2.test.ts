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
