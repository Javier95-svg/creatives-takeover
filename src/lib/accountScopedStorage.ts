/**
 * Per-account client-storage isolation.
 *
 * Several tools across BizMap AI and Insighta cache account-specific work in
 * `localStorage` under fixed (non-user-scoped) keys. On a shared browser those
 * caches survive a sign-out, so the next account that signs in can read the
 * previous account's data — a data isolation failure (see the MVP Builder bug).
 *
 * This module centralises two defences:
 *  1. `clearAccountScopedStorage()` — purge every account-data cache. Called on
 *     sign-out and whenever the authenticated account changes.
 *  2. `readScopedOrConsumeAnon()` — for stores that legitimately carry a
 *     pre-signup (anonymous) draft into the *first* account that claims it:
 *     read the user-scoped value, else consume the anonymous copy exactly once
 *     (migrate it to the scoped key and delete the anonymous original) so a
 *     second account can never inherit it.
 *
 * Keep this list in sync when adding new account-scoped client caches. Do NOT
 * add auth-flow handoff keys here (oauth_*, rememberedEmail, pending discovery
 * call, referral, checkout intent, theme-preference) — those are intentionally
 * cross-session/device-level and are cleared by their own flows.
 */

/**
 * Prefixes of localStorage keys that hold account-specific data. Matching is by
 * `startsWith`, so a base key (`creatives_takeover_user_context`) also covers
 * its user-scoped variants (`creatives_takeover_user_context:<userId>`).
 */
export const ACCOUNT_SCOPED_STORAGE_PREFIXES: readonly string[] = [
  // MVP Builder workspace
  'ct_app_builder_session',
  // Cross-app contexts mirrored from profiles.user_preferences
  'creatives_takeover_user_context',
  'creatives_takeover_progress_context',
  // Billing prefill (name/email/address)
  'ct_billing_details',
  // Waitlist / Demo Studio editor state + guest draft
  'waitlist_builder_last_editor_v1',
  'waitlist_builder_guest_draft_v1',
  // Insighta tools
  'ct_traction_draft',
  'ct_gtm_traction_handoff',
  'ct_assessment_data',
  'ct_lead_email',
  // BizMap AI
  'bizmap_progress',
  'bizmap_prompt',
  'bizmap_example_prompt',
  'bizmap_template',
  'bizmap-founder-tracker',
  // Community + assistant
  'community_post_draft',
  'pulse_last_proactive_hash',
];

/**
 * Remove every account-scoped cache from localStorage. Best-effort: storage
 * access can throw (Safari private mode, disabled storage) and is swallowed.
 */
export function clearAccountScopedStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const store = window.localStorage;
    for (let i = store.length - 1; i >= 0; i -= 1) {
      const key = store.key(i);
      if (key && ACCOUNT_SCOPED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        store.removeItem(key);
      }
    }
  } catch {
    // best-effort cleanup; ignore storage access errors
  }
}

/**
 * Returns the user-scoped cache value if present. Otherwise, if a pre-signup
 * (anonymous) value exists under `baseKey`, migrate it to `scopedKey` and delete
 * the anonymous original (one-time claim), so only the first account inherits it.
 */
export function readScopedOrConsumeAnon(baseKey: string, scopedKey: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const store = window.localStorage;
    const scoped = store.getItem(scopedKey);
    if (scoped !== null) return scoped;

    const anon = store.getItem(baseKey);
    if (anon !== null) {
      store.setItem(scopedKey, anon);
      store.removeItem(baseKey);
      return anon;
    }
  } catch {
    // ignore storage access errors
  }
  return null;
}
