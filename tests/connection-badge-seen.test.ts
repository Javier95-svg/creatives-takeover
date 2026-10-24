import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const header = readFileSync('src/hooks/useWorkspaceHeaderCounts.ts', 'utf8');
const seenState = readFileSync('src/lib/connectionSeenState.ts', 'utf8');

test('marking a connection notification seen clears the header badge without a reload', () => {
  // Seen ids live in localStorage, so the RPC refetch returns identical data and
  // React Query keeps the same object. The badge must recompute on the event
  // itself, not wait for the data to change, or it stays at 1.
  const onUpdate = header.slice(header.indexOf('const onConnectionUpdate'), header.indexOf('const onStorage'));
  assert.match(onUpdate, /setSeenVersion\(\(version\) => version \+ 1\)/);
  assert.match(header, /window\.addEventListener\(CONNECTION_EVENT, onConnectionUpdate\);/);
  assert.match(header, /window\.removeEventListener\(CONNECTION_EVENT, onConnectionUpdate\);/);
  assert.match(header, /\}, \[userId, row, seenVersion\]\);/);
});

test('a notification marked seen in another tab clears the badge here too', () => {
  assert.match(header, /window\.addEventListener\('storage', onStorage\);/);
  assert.match(header, /event\.key\.startsWith\(SEEN_STORAGE_PREFIX\)/);
  // Both stored lists start with the prefix the storage listener matches.
  assert.match(seenState, /SEEN_ACCEPTED_KEY_PREFIX = `\$\{SEEN_STORAGE_PREFIX\}accepted_connections_`/);
  assert.match(seenState, /SEEN_PENDING_KEY_PREFIX = `\$\{SEEN_STORAGE_PREFIX\}pending_requests_`/);
});
