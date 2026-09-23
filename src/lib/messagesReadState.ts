/**
 * Tells the workspace header that a conversation was just read.
 *
 * Realtime events reconcile the header with get_workspace_header_counts; a
 * 60s poll is only a recovery path. Reads still decrement locally so opening
 * a conversation clears its badge without waiting for a server round trip.
 *
 * Connections already solve this with CONNECTION_EVENT; messages had no
 * equivalent, so this is the same pattern. The count travels with the event so
 * the header can subtract it straight away rather than waiting on a round trip,
 * and the reconciling refetch then confirms it.
 */
export const MESSAGES_READ_EVENT = 'workspace-messages-read';

export function broadcastMessagesRead(count: number): void {
  if (typeof window === 'undefined' || count <= 0) return;
  window.dispatchEvent(new CustomEvent(MESSAGES_READ_EVENT, { detail: { count } }));
}

/** The number of messages an event says were read, guarded against bad payloads. */
export function readCountFromEvent(event: Event): number {
  const detail = (event as CustomEvent<{ count?: unknown }>).detail;
  const count = detail && typeof detail.count === 'number' ? detail.count : 0;
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}
