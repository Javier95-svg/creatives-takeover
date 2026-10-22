// The Founder ID link a name will get, mirroring generate_profile_base_slug
// (supabase/migrations/20260215110000_fix_profile_username_generation_normalization.sql):
// first and last name, lowercased, accents and anything but a-z0-9 removed;
// a single name is used alone. When the base is taken, signup appends 1, 2, …
// Pure, so node tests can read it.

const normalizePart = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** The base handle for a full name, or null when nothing usable is left. */
export function founderIdBaseHandle(fullName: string): string | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const base = parts.length >= 2
    ? normalizePart(parts[0]) + normalizePart(parts[parts.length - 1])
    : normalizePart(parts[0]);
  return base || null;
}

/** The handle signup would assign, given the usernames already taken (any case). */
export function nextFreeHandle(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((name) => name.toLowerCase()));
  if (!used.has(base)) return base;
  let counter = 1;
  while (used.has(`${base}${counter}`)) counter += 1;
  return `${base}${counter}`;
}
