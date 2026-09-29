/**
 * Recovers from a stale build.
 *
 * Each deploy renames the page files (PlatformTour.CDLvjnJF.js …). A tab opened
 * before a deploy, or a load that lands mid-rollout, can ask for a file name the
 * server no longer has, and the page crashes with "Failed to fetch dynamically
 * imported module". Reloading fetches the current build, so we reload once.
 * A second failure within a minute is left to the error screen, so a real
 * outage can never cause a reload loop.
 */

const STORAGE_KEY = 'ct_stale_chunk_reload_at';
const RETRY_WINDOW_MS = 60_000;

const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Expected a JavaScript.*module script|ChunkLoadError|Loading chunk [\w-]+ failed/i;

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? '');
  return CHUNK_ERROR.test(message);
}

/** Reloads the page once for a stale-build error. Returns true when a reload was started. */
export function reloadForStaleChunk(error: unknown, now = Date.now()): boolean {
  if (!isStaleChunkError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
    if (now - last < RETRY_WINDOW_MS) return false;
    sessionStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    // Without storage we cannot guard against a loop, so do not reload.
    return false;
  }
  window.location.reload();
  return true;
}
