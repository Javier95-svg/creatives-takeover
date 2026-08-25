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

  assert.match(edgeFunction, /authorization"\) !== `Bearer \$\{supabaseServiceKey\}`/);
  assert.match(edgeFunction, /connection_request_email_notifications/);
  assert.match(edgeFunction, /request\.status !== "pending"/);
  assert.match(edgeFunction, /connection_request_email_enabled === false/);
  assert.match(edgeFunction, /sent you a connection request/);
  assert.match(edgeFunction, /\/account/);
});

test('founders can control connection-request emails from notification preferences', () => {
  const card = read('../src/components/NotificationPreferencesCard.tsx');
  assert.match(card, /connection_request_email_enabled/);
  assert.match(card, /Connection request emails/);
});
