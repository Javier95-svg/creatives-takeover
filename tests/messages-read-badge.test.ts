import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MESSAGES_READ_EVENT, readCountFromEvent } from '../src/lib/messagesReadState.ts';

const header = readFileSync('src/hooks/useWorkspaceHeaderCounts.ts', 'utf8');
const messaging = readFileSync('src/hooks/useMessaging.ts', 'utf8');

test('a read count survives the trip and a bad payload cannot corrupt the badge', () => {
  const event = (detail: unknown) => ({ type: MESSAGES_READ_EVENT, detail }) as unknown as Event;
  assert.equal(readCountFromEvent(event({ count: 3 })), 3);
  assert.equal(readCountFromEvent(event({ count: 2.7 })), 2);
  for (const bad of [undefined, null, {}, { count: 0 }, { count: -4 }, { count: '5' }, { count: Number.NaN }, { count: Infinity }]) {
    assert.equal(readCountFromEvent(event(bad)), 0, JSON.stringify(bad));
  }
});

test('reading a conversation tells the header instead of waiting for the poll', () => {
  // The badge refetches on a 60s interval, which is fine for a number going up
  // and wrong for one going down.
  assert.match(messaging, /broadcastMessagesRead\(unreadCountsRef\.current\[conversationId\] \|\| 0\);/);
  // Read before the state is cleared, or the count would already be zero.
  assert.ok(messaging.indexOf('broadcastMessagesRead(') < messaging.indexOf('setUnreadCounts((state) => ({ ...state, [conversationId]: 0 }))'));
  assert.match(header, /window\.addEventListener\(MESSAGES_READ_EVENT, applyRead\);/);
  assert.match(header, /window\.removeEventListener\(MESSAGES_READ_EVENT, applyRead\);/);
});

test('the badge drops on the spot and is then reconciled', () => {
  // setQueryData alone could drift from the server; invalidate alone would leave
  // the stale number on screen for the length of the round trip. Both, in order.
  assert.match(header, /setQueryData<HeaderCountsRow>/);
  assert.match(header, /unreadMessages: Math\.max\(0, current\.unreadMessages - count\)/);
  const applyRead = header.slice(header.indexOf('const applyRead'), header.indexOf('}, [queryClient, userId, refresh]);'));
  assert.ok(applyRead.indexOf('setQueryData') < applyRead.indexOf('refresh()'), 'subtract before refetching');
});
