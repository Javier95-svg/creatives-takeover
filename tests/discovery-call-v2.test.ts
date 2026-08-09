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

test('V4 holds credits until Google Meet creation succeeds', () => {
  const transitions = read('../supabase/migrations/20260809132000_discovery_call_calendar_booking_transitions_v4.sql');
  const acceptBlock = transitions.slice(transitions.indexOf('respond_to_discovery_call_request_v4'), transitions.indexOf('respond_to_discovery_call_counter_v4'));
  const completionBlock = transitions.slice(transitions.indexOf('complete_discovery_call_calendar_job_v4'), transitions.indexOf('process_discovery_call_calendar_deadlines_v4'));
  assert.match(acceptBlock, /'pending_meeting_creation'/);
  assert.match(acceptBlock, /enqueue_discovery_call_calendar_operation_v4/);
  assert.doesNotMatch(acceptBlock, /finalize_discovery_call_reservation_v2/);
  assert.match(completionBlock, /p_meeting_url !~\* '\^https:\/\/meet\\\.google\\\.com\/'/);
  assert.match(completionBlock, /finalize_discovery_call_reservation_v2/);
  assert.match(completionBlock, /'booking_confirmed', 'founder'/);
  assert.match(completionBlock, /'booking_confirmed', 'mentor'/);
  assert.match(completionBlock, /'booking_confirmed', 'admin'/);
});

test('V4 availability is platform-owned and collision safe', () => {
  const schema = read('../supabase/migrations/20260809131000_discovery_call_calendar_booking_schema_v4.sql');
  assert.match(schema, /mentor_discovery_availability_rules/);
  assert.match(schema, /mentor_discovery_availability_exceptions/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS timezone TEXT/);
  assert.match(schema, /scheduling source of truth/);
  assert.match(schema, /EXCLUDE USING gist/);
  assert.match(schema, /blocked_range WITH &&/);
  assert.match(schema, /set_discovery_call_slot_blocked_range_v4/);
  assert.match(schema, /NEW\.starts_at - make_interval\(mins => NEW\.buffer_minutes\)/);
  assert.match(schema, /mentor_calendar_busy_periods/);
  assert.match(schema, /get_mentor_discovery_slots_v4/);
  assert.match(schema, /save_mentor_discovery_settings_v4/);
  assert.match(schema, /minimum_notice_hours/);
  assert.match(schema, /booking_window_days/);
});

test('mentor availability saves are atomic across settings and weekly rules', () => {
  const schema = read('../supabase/migrations/20260809131000_discovery_call_calendar_booking_schema_v4.sql');
  const service = read('../supabase/functions/discovery-call-service/index.ts');
  const portal = read('../supabase/functions/discovery-call-mentor-availability/index.ts');
  assert.match(schema, /CREATE OR REPLACE FUNCTION public\.save_mentor_discovery_settings_v4/);
  assert.match(schema, /DELETE FROM public\.mentor_discovery_availability_rules/);
  assert.match(service, /admin\.rpc\("save_mentor_discovery_settings_v4"/);
  assert.match(portal, /admin\.rpc\("save_mentor_discovery_settings_v4"/);
});

test('calendar worker creates one deterministic Google event and requests Meet', () => {
  const worker = read('../supabase/functions/process-discovery-call-calendar-events/index.ts');
  const cron = read('../supabase/migrations/20260809133000_schedule_discovery_call_calendar_worker_v4.sql');
  assert.match(worker, /stableGoogleEventId/);
  assert.match(worker, /conferenceDataVersion=1&sendUpdates=all/);
  assert.match(worker, /conferenceSolutionKey: \{ type: "hangoutsMeet" \}/);
  assert.match(worker, /complete_discovery_call_calendar_job_v4/);
  assert.match(worker, /fail_discovery_call_calendar_job_v4/);
  assert.match(cron, /discovery-call-v4-calendar/);
  assert.match(cron, /process-discovery-call-calendar-events/);
});

test('Google event updates and cancellations reuse the existing booking', () => {
  const schema = read('../supabase/migrations/20260809131000_discovery_call_calendar_booking_schema_v4.sql');
  const transitions = read('../supabase/migrations/20260809132000_discovery_call_calendar_booking_transitions_v4.sql');
  const worker = read('../supabase/functions/process-discovery-call-calendar-events/index.ts');
  assert.match(transitions, /respond_to_discovery_call_reschedule_v4/);
  assert.match(transitions, /enqueue_discovery_call_calendar_operation_v4\(p_call_id, 'update'/);
  assert.match(transitions, /enqueue_discovery_call_calendar_operation_v4\(p_call_id, 'cancel'/);
  assert.match(worker, /method: "PATCH"/);
  assert.match(worker, /method: "DELETE"/);
  assert.match(worker, /sendUpdates=all/);
  assert.match(worker, /visibility: "private"/);
  assert.match(schema, /Never resurrect that job/);
  assert.match(schema, /enqueue_discovery_call_calendar_operation_v4\(v_job\.discovery_call_id, 'cancel'/);
  assert.match(transitions, /enqueue_discovery_call_calendar_operation_v4\(v_call\.id, 'cancel'/);
});

test('mentor availability portal is token protected and Google OAuth credentials are encrypted', () => {
  const availability = read('../supabase/functions/discovery-call-mentor-availability/index.ts');
  const callback = read('../supabase/functions/discovery-call-google-oauth/index.ts');
  const config = read('../supabase/config.toml');
  assert.match(availability, /mentor_availability_access_tokens/);
  assert.match(availability, /hashDiscoveryCallToken\(rawToken\)/);
  assert.match(availability, /calendar\.freebusy/);
  const organizerOAuth = read('../scripts/google-calendar-oauth.mjs');
  assert.match(organizerOAuth, /calendar\.events\.owned/);
  assert.doesNotMatch(organizerOAuth, /auth\/calendar['"]/);
  assert.match(callback, /encryptDiscoveryCallToken\(tokenBody\.refresh_token\)/);
  assert.match(callback, /state_hash/);
  assert.match(config, /\[functions\.discovery-call-mentor-availability\][\s\S]*verify_jwt = false/);
  assert.match(config, /\[functions\.discovery-call-google-oauth\][\s\S]*verify_jwt = false/);
  assert.doesNotMatch(availability, /console\.(?:log|error|warn)\([^)]*token/i);
});

test('founders get Preply-style instant slots with the request fallback', () => {
  const booking = read('../src/pages/community/MentorBookingPage.tsx');
  const availabilityPage = read('../src/pages/community/MentorDiscoveryAvailabilityPage.tsx');
  assert.match(booking, /createInstantDiscoveryCallBooking/);
  assert.match(booking, /Choose an available time/);
  assert.match(booking, /Propose three times/);
  assert.match(booking, /private Google Meet link/);
  assert.match(availabilityPage, /Weekly availability/);
  assert.match(availabilityPage, /Connect Google Calendar/);
});

test('platform Google invitations do not receive a duplicate ICS attachment', () => {
  const notificationWorker = read('../supabase/functions/process-discovery-call-notifications/index.ts');
  assert.match(notificationWorker, /calendarManagedExternally/);
  assert.match(notificationWorker, /meet\.google\.com/);
  assert.match(notificationWorker, /!calendarManagedExternally/);
});
