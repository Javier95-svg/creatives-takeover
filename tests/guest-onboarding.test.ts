import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearGuestOnboarding,
  getGuestSession,
  guestSnapshotAnswers,
  isGuestSessionId,
  readGuestSnapshot,
  saveGuestSnapshot,
} from '../src/lib/guestOnboarding.ts';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
};

test('the guest session id is stable, so a refresh resumes the same draft', () => {
  store.clear();
  const first = getGuestSession();
  const second = getGuestSession();
  assert.equal(first.id, second.id);
  assert.ok(isGuestSessionId(first.id));
  assert.equal(first.status, 'in_progress');
  // Epoch, so the local draft of the quiz always wins over this empty session.
  assert.equal(Date.parse(first.updated_at), 0);
});

test('a snapshot round-trips and keeps only a first action the guest chose', () => {
  store.clear();
  saveGuestSnapshot({ answers: { situation: 'existing_project', selectedIntent: 'run_icp' }, returnPath: '/icp-builder?seed=x' });
  const recommended = readGuestSnapshot();
  assert.equal(recommended?.returnPath, '/icp-builder?seed=x');
  assert.equal(guestSnapshotAnswers(recommended!).selectedIntent, undefined);

  saveGuestSnapshot({ answers: { situation: 'existing_project', selectedIntent: 'find_mentor' }, selectedIntent: 'find_mentor' });
  assert.equal(guestSnapshotAnswers(readGuestSnapshot()!).selectedIntent, 'find_mentor');
});

test('old or broken snapshots are ignored, and clearing removes the local draft too', () => {
  store.clear();
  store.set('ct_guest_onboarding_snapshot', JSON.stringify({ answers: {}, savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 }));
  assert.equal(readGuestSnapshot(), null);
  store.set('ct_guest_onboarding_snapshot', 'not json');
  assert.equal(readGuestSnapshot(), null);

  const session = getGuestSession();
  store.set(`adaptive_onboarding_${session.id}`, '{}');
  saveGuestSnapshot({ answers: { situation: 'starting_project' } });
  clearGuestOnboarding();
  assert.equal(readGuestSnapshot(), null);
  assert.equal(store.has(`adaptive_onboarding_${session.id}`), false);
  assert.notEqual(getGuestSession().id, session.id);
});
