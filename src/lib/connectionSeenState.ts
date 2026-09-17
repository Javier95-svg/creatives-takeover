/**
 * Which connection notifications a user has already acknowledged.
 *
 * Kept in localStorage rather than a backend column, so it is per browser and
 * cannot be computed server side. The workspace header badge and the connection
 * requests modal both read it, which is why it lives here instead of staying
 * private to useSocial: if they filtered differently the badge would disagree
 * with the list it opens.
 *
 * Storage can be unavailable (private mode), in which case reads return empty
 * and writes are dropped. The badge then simply does not persist as cleared.
 */

const SEEN_ACCEPTED_KEY_PREFIX = 'ct_seen_accepted_connections_';
const SEEN_PENDING_KEY_PREFIX = 'ct_seen_pending_requests_';

/** Broadcast so the badge and any open list refresh together. */
export const CONNECTION_EVENT = 'connection-requests-updated';

function readIds(prefix: string, userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${prefix}${userId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function appendIds(prefix: string, userId: string, ids: string[]): void {
  if (typeof window === 'undefined' || ids.length === 0) return;
  try {
    const merged = new Set([...readIds(prefix, userId), ...ids]);
    window.localStorage.setItem(`${prefix}${userId}`, JSON.stringify([...merged]));
  } catch {
    // Storage may be unavailable (private mode); the badge simply won't persist.
  }
}

/** "Your connection request was accepted" notifications the sender has seen. */
export const getSeenAcceptedIds = (userId: string): string[] => readIds(SEEN_ACCEPTED_KEY_PREFIX, userId);
export const addSeenAcceptedIds = (userId: string, ids: string[]): void => appendIds(SEEN_ACCEPTED_KEY_PREFIX, userId, ids);

/** Incoming pending requests acknowledged via "Mark all read". They stop
 *  counting toward the badge but stay listed and actionable in the modal. */
export const getSeenPendingIds = (userId: string): string[] => readIds(SEEN_PENDING_KEY_PREFIX, userId);
export const addSeenPendingIds = (userId: string, ids: string[]): void => appendIds(SEEN_PENDING_KEY_PREFIX, userId, ids);
