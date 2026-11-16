/**
 * Supabase re-announces the session when a tab regains focus and on every token
 * refresh, each time with a new user object for the same account. Keeping the
 * previous object when nothing in it changed stops every hook that depends on
 * `user` from refetching (and showing its loading state) on each tab switch.
 */
export function keepUserIfUnchanged<T extends { id: string }>(next: T | null) {
  return (previous: T | null): T | null =>
    previous && next && previous.id === next.id && JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}
