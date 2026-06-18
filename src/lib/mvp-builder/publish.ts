// Shared helpers for the MVP Builder "Publish" auto-subdomain flow.
// The authoritative slug assignment (with global uniqueness) happens server-side
// in the `mvp-builder-publish` edge function; these helpers cover client-side
// display (previewing the would-be link) and URL formatting.

export const MVP_PUBLISH_BASE_DOMAIN = 'creatives-takeover.com';

const MAX_SLUG_LENGTH = 48;

/**
 * Derive a public slug from a project name.
 * Rules: lowercase, spaces/special characters collapsed to hyphens, anything
 * outside [a-z0-9-] stripped, no leading/trailing hyphens. Falls back to
 * "project" when the name has no usable characters.
 *
 * Example: "IronLog" -> "ironlog", "My  App!" -> "my-app".
 */
export function slugifyProjectName(value: string): string {
  const slug = (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return slug || 'project';
}

/** Build the full public URL for a given slug. */
export function buildPublicAppUrl(slug: string): string {
  return `https://${slug}.${MVP_PUBLISH_BASE_DOMAIN}`;
}

/** The host (no protocol) for display, e.g. "ironlog.creativestakeover.app". */
export function buildPublicAppHost(slug: string): string {
  return `${slug}.${MVP_PUBLISH_BASE_DOMAIN}`;
}
