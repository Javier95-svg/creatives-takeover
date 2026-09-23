// Short-lived, memory-only cache. Publication mutations invalidate these prefixes.
// No drafts, private messages, or auth-dependent detail responses belong here.
export const PUBLIC_LIST_CACHE = { staleTime: 60_000, gcTime: 10 * 60_000 };
