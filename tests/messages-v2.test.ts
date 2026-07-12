import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260714120000_messages_reliability_safety_v2.sql');
const messagingHook = read('src/hooks/useMessaging.ts');
const interfaceSource = read('src/components/social/MessagingInterface.tsx');
const pageSource = read('src/pages/Messages.tsx');

test('messaging V2 exposes the consolidated authenticated contracts', () => {
  for (const contract of [
    'get_inbox_v1',
    'get_message_page_v1',
    'search_message_recipients_v1',
    'get_direct_message_quote_v1',
    'send_direct_message_v2',
    'set_message_request_status_v1',
    'mark_conversation_read_v1',
    'set_conversation_state_v1',
    'soft_delete_message_v1'
  ]) {
    assert.match(migration, new RegExp(`FUNCTION public\\.${contract}`));
  }
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /client_message_id/);
});

test('dangerous direct messaging writes are removed from the client', () => {
  assert.doesNotMatch(messagingHook, /from\(['"]conversations['"]\)\s*\n?\s*\.delete\(/);
  assert.doesNotMatch(messagingHook, /from\(['"]conversations['"]\)\s*\n?\s*\.update\(\{\s*participants/);
  assert.doesNotMatch(messagingHook, /from\(['"]messages['"]\)\s*\n?\s*\.delete\(/);
  assert.match(messagingHook, /messagingV2\.send/);
  assert.match(messagingHook, /messagingV2\.softDelete/);
  assert.match(messagingHook, /conversationState\(conversationId, 'hide'\)/);
});

test('the client bundle contains no hard-coded messaging identities', () => {
  const sources = `${messagingHook}\n${interfaceSource}`;
  assert.doesNotMatch(sources, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(sources, /(?:SOPHIA|ARTUR|YASMINE|SAMUEL)_[A-Z_]+/);
  assert.doesNotMatch(sources, /getUserIdByEmail/);
  assert.match(messagingHook, /\.from\('mentors'\)[\s\S]*\.eq\('user_id', mentor\.user_id\)/);
});

test('request, hide, tombstone, mute, and notification safeguards are durable', () => {
  assert.match(migration, /v_recipient_status = 'refused'/);
  assert.match(migration, /v_prior_count > 0/);
  assert.match(migration, /v_new_recipient_count >= 10/);
  assert.match(migration, /hidden_at/);
  assert.match(migration, /content='Message deleted'/);
  assert.match(migration, /dm_email_enabled/);
  assert.match(migration, /dm_push_enabled/);
  assert.match(migration, /muted_until>now\(\)/);
});

test('messages renders as a focused inbox workspace', () => {
  assert.match(pageSource, /messages-inbox-v2/);
  assert.match(pageSource, /VITE_MESSAGES_INBOX_V2_ENABLED/);
  assert.match(pageSource, /aria-label="Messages workspace"/);
  assert.match(interfaceSource, /New message/);
  assert.match(interfaceSource, /Archived/);
  assert.match(interfaceSource, /Back to conversations/);
  assert.match(interfaceSource, /first mentor message is free/i);
  assert.match(interfaceSource, /This message costs/);
  assert.match(interfaceSource, /Hide conversation\?/);
});
