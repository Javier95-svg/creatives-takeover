export type MeetSession = { participant: string; startTime: string; endTime: string | null };

export type AttendanceObservation = {
  conferenceRecordName: string | null;
  startedAt: string | null;
  endedAt: string | null;
  distinctParticipantCount: number;
  maxConcurrentParticipants: number;
  qualifyingOverlapSeconds: number;
};

export function meetingCodeFromUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#]|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

/**
 * Returns the longest interval in which at least two distinct Google Meet
 * participants were present. The caller intentionally supplies only opaque
 * participant resource names; no names, emails, or provider payloads survive.
 */
export function summarizeMeetSessions(
  conference: { name?: string; startTime?: string; endTime?: string } | null,
  sessions: MeetSession[],
): AttendanceObservation {
  const participants = new Set<string>();
  const events: Array<{ at: number; participant: string; delta: 1 | -1 }> = [];
  for (const session of sessions) {
    const start = timestamp(session.startTime);
    const end = timestamp(session.endTime);
    if (start == null || end == null || end <= start || !session.participant) continue;
    participants.add(session.participant);
    events.push({ at: start, participant: session.participant, delta: 1 });
    events.push({ at: end, participant: session.participant, delta: -1 });
  }
  events.sort((left, right) => left.at - right.at || left.delta - right.delta);
  const active = new Map<string, number>();
  let maxConcurrentParticipants = 0;
  let qualifyingOverlapSeconds = 0;
  let previous: number | null = null;
  for (const event of events) {
    if (previous != null && event.at > previous && active.size >= 2) {
      qualifyingOverlapSeconds += Math.floor((event.at - previous) / 1000);
    }
    const count = active.get(event.participant) ?? 0;
    if (event.delta === 1) active.set(event.participant, count + 1);
    else if (count <= 1) active.delete(event.participant);
    else active.set(event.participant, count - 1);
    maxConcurrentParticipants = Math.max(maxConcurrentParticipants, active.size);
    previous = event.at;
  }
  return {
    conferenceRecordName: conference?.name ?? null,
    startedAt: conference?.startTime ?? null,
    endedAt: conference?.endTime ?? null,
    distinctParticipantCount: participants.size,
    maxConcurrentParticipants,
    qualifyingOverlapSeconds,
  };
}
