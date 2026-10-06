import {
  getSupabaseAuthStorageKey,
  shouldDropStoredSupabaseAuthSession,
} from '../integrations/supabase/sessionStorage.ts';

/**
 * Whether this page load can plausibly end up signed in, decided synchronously
 * before the session restore finishes.
 *
 * Workspace routes include `/`, and while auth was loading the frame drew the
 * signed-in shell for everyone. A visitor reloading the homepage saw a sidebar
 * skeleton for about a second before the landing page replaced it. Only a
 * stored session, or an auth redirect still carrying its tokens, can resolve
 * into a signed-in user, so those are the only cases worth the skeleton.
 */
export function authSessionHint(storedSession: string | null, search: string, hash: string): boolean {
  // OAuth (PKCE) and email links land with credentials in the URL before
  // anything is stored; Supabase exchanges them during the restore.
  if (/[?&]code=/.test(search) || /[#&]access_token=/.test(hash)) return true;
  return storedSession !== null && !shouldDropStoredSupabaseAuthSession(storedSession);
}

/** Reads the stored Supabase session and current URL. False outside a browser. */
export function readAuthSessionHint(supabaseUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = getSupabaseAuthStorageKey(supabaseUrl);
  let stored: string | null = null;
  try {
    stored = key ? window.localStorage.getItem(key) : null;
  } catch {
    // Storage blocked (private window): nothing can have been persisted.
  }
  return authSessionHint(stored, window.location.search, window.location.hash);
}
