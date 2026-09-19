/**
 * Remembers that an account has already cleared the onboarding gate.
 *
 * Opening the workspace costs two round trips in sequence: restore the session,
 * then read the profile to decide whether guided onboarding is still owed. The
 * second one blocks the page every single load, for every user, forever, even
 * though its answer stops changing the moment somebody finishes onboarding.
 *
 * Only the settled answer is stored, never "still owed". Being wrong in this
 * direction costs nothing: the query still runs in the background and still
 * redirects if it disagrees. Being wrong the other way would trap a new founder
 * in onboarding they had already finished.
 *
 * Per browser, like every other localStorage flag here. A new device simply
 * waits once and then remembers.
 */

const KEY_PREFIX = 'ct_onboarding_settled_';

export function isOnboardingSettled(userId: string | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(`${KEY_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSettled(userId: string | undefined): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${userId}`, '1');
  } catch {
    // Private mode. The gate then simply waits on every load, as it used to.
  }
}

/** Cleared when an account is sent back into onboarding, so the flag cannot go stale. */
export function clearOnboardingSettled(userId: string | undefined): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${KEY_PREFIX}${userId}`);
  } catch {
    // Nothing to do; a stale flag only ever skips a wait, never a redirect.
  }
}
