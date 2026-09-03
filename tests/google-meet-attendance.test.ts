import assert from 'node:assert/strict';
import test from 'node:test';
import { meetingCodeFromUrl, meetListUrl, summarizeMeetSessions } from '../supabase/functions/_shared/google-meet-attendance.ts';

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

test('paged Meet URLs stay valid on paths that carry no query string of their own', () => {
  // A bare `&pageSize=` folded the parameter into the final path segment, so
  // every participant and session lookup returned 404 and no call could ever
  // be verified.
  assert.equal(
    meetListUrl('/conferenceRecords/abc/participants', ''),
    'https://meet.googleapis.com/v2/conferenceRecords/abc/participants?pageSize=100',
  );
  assert.equal(
    meetListUrl('/conferenceRecords/abc/participants/1/participantSessions', ''),
    'https://meet.googleapis.com/v2/conferenceRecords/abc/participants/1/participantSessions?pageSize=100',
  );
  for (const path of ['/conferenceRecords/abc/participants', '/conferenceRecords?filter=x']) {
    for (const token of ['', 'NEXT']) {
      const url = new URL(meetListUrl(path, token));
      assert.equal(url.searchParams.get('pageSize'), '100');
      assert.equal(url.searchParams.get('pageToken'), token || null);
    }
  }
});

test('the conference-record filter keeps its own separator and encodes the page token', () => {
  assert.equal(
    meetListUrl('/conferenceRecords?filter=space.meeting_code', 'a b&c'),
    'https://meet.googleapis.com/v2/conferenceRecords?filter=space.meeting_code&pageSize=100&pageToken=a+b%26c',
  );
});

test('an unfinalized conference is inconclusive rather than a zero-overlap verdict', () => {
  // Mirrors observeMeeting: a still-running call has open-ended sessions, which
  // would otherwise score zero overlap and wrongly ask both participants to
  // confirm a call that went fine.
  const pick = (records: Array<{ name?: string; endTime?: string }>) =>
    records.find((item) => item.endTime && item.name) ?? null;

  assert.equal(pick([{ name: 'conferenceRecords/live' }]), null);
  assert.equal(pick([{ endTime: '2026-09-02T10:30:00Z' }]), null);
  assert.equal(pick([]), null);
  assert.deepEqual(
    pick([{ name: 'conferenceRecords/live' }, { name: 'conferenceRecords/done', endTime: '2026-09-02T10:30:00Z' }]),
    { name: 'conferenceRecords/done', endTime: '2026-09-02T10:30:00Z' },
  );

  const openEnded = summarizeMeetSessions({ name: 'conferenceRecords/live' }, [
    { participant: 'participants/a', startTime: '2026-09-02T10:00:00Z', endTime: null },
    { participant: 'participants/b', startTime: '2026-09-02T10:01:00Z', endTime: null },
  ]);
  assert.equal(openEnded.qualifyingOverlapSeconds, 0);
});
