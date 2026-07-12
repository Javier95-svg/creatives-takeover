import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260714120000_messages_reliability_safety_v2.sql');
const performanceMigration = read('supabase/migrations/20260715130000_messages_loading_performance.sql');
const messagingHook = read('src/hooks/useMessaging.ts');
const interfaceSource = read('src/components/social/MessagingInterface.tsx');
const pageSource = read('src/pages/Messages.tsx');
const messagingService = read('src/lib/messagingV2.ts');
const upgradeMigration = read('supabase/migrations/20260716120000_messages_9_of_10_upgrade.sql');
const newConversationDialog = read('src/components/social/NewConversationDialog.tsx');
const voiceRecorder = read('src/components/social/VoiceNoteRecorder.tsx');
const contextCard = read('src/components/social/MessageContextCard.tsx');

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
  assert.doesNotMatch(messagingHook, /scopedConversationIds|user-messages-sync/);
});

test('read-only compatibility paths keep the inbox available before RPC deployment', () => {
  assert.match(messagingHook, /Messaging V2 inbox unavailable; using RLS-safe compatibility reads/);
  assert.match(messagingHook, /Messaging V2 message page unavailable; using RLS-safe compatibility read/);
  assert.match(messagingHook, /\.from\('conversations'\)[\s\S]*\.contains\('participants', \[user\.id\]\)/);
  assert.match(messagingHook, /\.from\('messages'\)[\s\S]*\.eq\('conversation_id', conversationId\)/);
});

test('the client bundle contains no hard-coded messaging identities', () => {
  const sources = `${messagingHook}\n${interfaceSource}`;
  assert.doesNotMatch(sources, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(sources, /(?:SOPHIA|ARTUR|YASMINE|SAMUEL)_[A-Z_]+/);
  assert.doesNotMatch(sources, /getUserIdByEmail/);
  assert.match(messagingHook, /\.from\('mentors'\)[\s\S]*\.eq\('user_id', mentor\.user_id\)/);
  assert.match(interfaceSource, /\.from\('mentors'\)[\s\S]*\.in\('user_id', linkedUserIds\)/);
  assert.match(interfaceSource, /mentorProfiles\[otherParticipantId\]\?\.full_name/);
  assert.match(interfaceSource, /mentorProfiles\[otherParticipantId\]\?\.avatar_url/);
  assert.doesNotMatch(interfaceSource, /\.eq\('name',/);
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
  assert.doesNotMatch(pageSource, /Chat Room/);
  assert.doesNotMatch(pageSource, /<Footer/);
  assert.match(pageSource, /max-w-\[1480px\]/);
  assert.match(pageSource, /aria-label="Messages workspace"/);
  assert.doesNotMatch(interfaceSource, /> New message</);
  assert.match(interfaceSource, /text-center text-lg font-semibold text-foreground">Chats<\/h2>/);
  assert.match(interfaceSource, /text-ellipsis whitespace-nowrap text-xs text-foreground\/90/);
  assert.match(interfaceSource, /justify-center gap-3/);
  assert.match(interfaceSource, /NewConversationDialog/);
  assert.match(interfaceSource, /Archived/);
  assert.match(interfaceSource, /Back to conversations/);
  assert.match(interfaceSource, /first mentor message is free/i);
  assert.doesNotMatch(interfaceSource, /This message costs|Balance:/);
  assert.match(interfaceSource, /Hide conversation\?/);
  assert.match(interfaceSource, /<ScrollArea className="min-h-0 flex-1">/);
  assert.match(interfaceSource, /flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-r/);
});

test('9/10 messaging upgrade includes discovery, voice, editing, contextual cards and founder workspaces', () => {
  for (const contract of [
    'edit_direct_message_v1',
    'set_message_context_v1',
    'create_message_group_v1',
    'send_group_message_v1',
    'send_voice_message_v1',
    'get_message_page_v2',
    'get_inbox_v2',
    'search_message_recipients_v2',
    'record_message_performance_v1'
  ]) assert.match(upgradeMigration, new RegExp(`FUNCTION public\\.${contract}`));
  assert.match(newConversationDialog, /Search founders by name or username/);
  assert.match(newConversationDialog, /Founder workspace/);
  assert.match(voiceRecorder, /getUserMedia/);
  assert.match(voiceRecorder, /MediaRecorder/);
  assert.match(interfaceSource, /Edit message/);
  assert.match(interfaceSource, /VoiceNoteRecorder/);
  assert.match(contextCard, /Co-founder opportunity/);
  assert.match(upgradeMigration, /created_at >= now\(\) - interval '15 minutes'/);
  assert.match(upgradeMigration, /Founder workspaces can only include your connections/);
});

test('message notifications deep-link to an exact conversation message', () => {
  assert.match(upgradeMigration, /&messageId=/);
  assert.match(interfaceSource, /searchParams\.get\('messageId'\)/);
  assert.match(interfaceSource, /anchorMessageId/);
});

test('conversation selection renders from a cached 30-message page before attachment signing', () => {
  assert.match(messagingHook, /const MESSAGE_PAGE_SIZE = 30/);
  assert.match(messagingService, /p_limit: 30/);
  assert.match(messagingHook, /queryClient\.fetchQuery/);
  assert.match(messagingHook, /queryClient\.prefetchQuery/);
  assert.match(messagingHook, /staleTime: 30_000/);
  assert.match(messagingHook, /signed_url: null/);
  assert.doesNotMatch(messagingHook, /signed_url: isImage/);
  assert.match(interfaceSource, /LazyMessageImage/);
  assert.match(interfaceSource, /onMouseEnter=\{\(\) => void prefetchConversation/);
  assert.match(interfaceSource, /messages:conversation-rendered/);
  assert.match(interfaceSource, /captureEvent\('messages_conversation_rendered'/);
});

test('conversation opening has no duplicate read or reaction fetch', () => {
  const selectHandler = interfaceSource.match(/const handleConversationSelect[\s\S]*?\n  \};/)?.[0] || '';
  assert.doesNotMatch(selectHandler, /markAsRead/);
  assert.match(interfaceSource, /activeMessages\.length > 0/);
  assert.doesNotMatch(interfaceSource, /\.from\('message_reactions'\)\s*\n\s*\.select/);
  assert.match(interfaceSource, /reaction_rows/);
});

test('message page SQL aggregates related rows once with cursor indexes', () => {
  assert.match(performanceMigration, /messages_conversation_cursor_v2_idx/);
  assert.match(performanceMigration, /attachment_groups AS/);
  assert.match(performanceMigration, /receipt_groups AS/);
  assert.match(performanceMigration, /reaction_groups AS/);
  assert.match(performanceMigration, /LIMIT v_limit \+ 1/);
  assert.match(performanceMigration, /INTO v_items, v_has_more, v_oldest_cursor/);
});
