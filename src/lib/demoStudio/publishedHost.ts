// Helpers for the published launch-page address {slug}.creatives-takeover.com.
//
// This mirrors the MVP Builder publishing model: a published project gets its own
// address on the CT domain, served by api/published-site.ts. Kept in one place so
// the routing check, the composer's displayed URL, and the page itself agree.

const BASE_DOMAIN = 'creatives-takeover.com';
const RESERVED_LABELS = new Set(['www', 'app', 'api', 'mail', 'admin', 'staging']);

/** The slug when the current host is a project subdomain, otherwise undefined. */
export function getProjectSubdomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname.toLowerCase();
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return undefined;
  const label = host.slice(0, -(`.${BASE_DOMAIN}`.length)).split('.').pop();
  if (!label || RESERVED_LABELS.has(label)) return undefined;
  return label;
}

export function isProjectSubdomain(): boolean {
  return getProjectSubdomain() !== undefined;
}

/** The canonical published URL for a launch page slug. */
export function buildLaunchUrl(slug: string): string {
  return `https://${slug}.${BASE_DOMAIN}/`;
}
