/**
 * Tells the workspace header that a conversation was just read.
 *
 * The header badge comes from a 60s poll of get_workspace_header_counts, which
 * is fine for a number going up and wrong for one going down: opening a DM left
 * the badge showing unread messages for up to a minute after they had been read.
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
