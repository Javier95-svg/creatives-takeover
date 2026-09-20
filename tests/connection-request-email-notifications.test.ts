import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('connection requests queue an idempotent, preference-aware email notification', () => {
  const migration = read('../supabase/migrations/20260825110000_connection_request_email_notifications.sql');

  assert.match(migration, /connection_request_email_notifications/);
  assert.match(migration, /UNIQUE \(friend_request_id, recipient_id\)/);
  assert.match(migration, /connection_request_email_enabled boolean NOT NULL DEFAULT true/);
  assert.match(migration, /friend_requests_queue_connection_request_email/);
  assert.match(migration, /AFTER INSERT ON public\.friend_requests/);
  assert.match(migration, /notif_pref_enabled\(NEW\.receiver_id, 'connection_request_email_enabled'\)/);
  assert.match(migration, /send-connection-request-email/);
  assert.match(migration, /EXCEPTION WHEN OTHERS/);
  assert.match(migration, /requeue_connection_request_email_notifications/);
  assert.match(migration, /requeue-connection-request-emails/);
});

test('connection-request email function is service-only, validates the outbox, and sends useful copy', () => {
  const edgeFunction = read('../supabase/functions/send-connection-request-email/index.ts');

  // Still service-only, but the token is checked against the key the outbox
  // actually sends, held in private.service_config, rather than the injected
  // SUPABASE_SERVICE_ROLE_KEY. Those are different representations of the same
  // service role, so the old direct comparison rejected every genuine dispatch
  // with a 401 and no connection request email was ever delivered.
  assert.match(edgeFunction, /verify_outbox_secret/);
  assert.match(edgeFunction, /outboxSecretValid !== true/);
  assert.match(edgeFunction, /error: "Unauthorized" \}\), \{ status: 401 \}/);
  assert.match(edgeFunction, /connection_request_email_notifications/);
  assert.match(edgeFunction, /request\.status !== "pending"/);
  assert.match(edgeFunction, /connection_request_email_enabled === false/);
  assert.match(edgeFunction, /sent you a connection request/);
  assert.match(edgeFunction, /\/account/);
});

test('founders can control connection-request emails from notification preferences', () => {
  // The channel list moved into a pure module when preferences became per
  // account type. What matters is that it is still a shared channel, offered to
  // every type rather than only to the categories, and that the card renders
  // the list it produces.
  const channels = read('../src/lib/notificationChannels.ts');
  const shared = channels.slice(channels.indexOf('SHARED_CHANNELS'), channels.indexOf('MENTOR_CHANNELS'));
  assert.match(shared, /connection_request_email_enabled/);
  assert.match(shared, /Connection request emails/);

  const card = read('../src/components/NotificationPreferencesCard.tsx');
  assert.match(card, /notificationChannelsForType/);
});
