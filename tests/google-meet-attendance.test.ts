import assert from 'node:assert/strict';
import test from 'node:test';
import { meetingCodeFromUrl, summarizeMeetSessions } from '../supabase/functions/_shared/google-meet-attendance.ts';

test('extracts only canonical Google Meet codes', () => {
  assert.equal(meetingCodeFromUrl('https://meet.google.com/abc-defg-hij?authuser=1'), 'abc-defg-hij');
  assert.equal(meetingCodeFromUrl('https://example.com/abc-defg-hij'), null);
  assert.equal(meetingCodeFromUrl('https://meet.google.com/not-a-code'), null);
});

test('counts overlapping distinct participants while ignoring reconnects and incomplete sessions', () => {
  const observation = summarizeMeetSessions({ name: 'conferenceRecords/opaque' }, [
    { participant: 'participants/a', startTime: '2026-09-02T10:00:00Z', endTime: '2026-09-02T10:05:00Z' },
    { participant: 'participants/a', startTime: '2026-09-02T10:05:00Z', endTime: '2026-09-02T10:20:00Z' },
    { participant: 'participants/b', startTime: '2026-09-02T10:04:00Z', endTime: '2026-09-02T10:18:00Z' },
    { participant: 'participants/c', startTime: '2026-09-02T10:10:00Z', endTime: null },
  ]);
  assert.equal(observation.distinctParticipantCount, 2);
  assert.equal(observation.maxConcurrentParticipants, 2);
  assert.equal(observation.qualifyingOverlapSeconds, 14 * 60);
  assert.ok(observation.qualifyingOverlapSeconds >= 600);
});

test('does not qualify a short or single-participant meeting', () => {
  const observation = summarizeMeetSessions(null, [
    { participant: 'participants/a', startTime: '2026-09-02T10:00:00Z', endTime: '2026-09-02T10:30:00Z' },
    { participant: 'participants/b', startTime: '2026-09-02T10:25:00Z', endTime: '2026-09-02T10:29:00Z' },
  ]);
  assert.equal(observation.distinctParticipantCount, 2);
  assert.equal(observation.qualifyingOverlapSeconds, 4 * 60);
  assert.ok(observation.qualifyingOverlapSeconds < 600);
});
