// Shared resolution for published Demo Studio launch pages.
//
// A launch page has one canonical public address, the same shape MVP Builder
// uses: https://{slug}.creatives-takeover.com/. The /p/{slug} path still works
// and still renders, but it points its canonical tag at the subdomain so the two
// addresses are never treated as competing pages.
//
// Used by api/published-site.ts (serves the subdomain) and api/public-entity.ts
// (serves /p/:slug). Kept in its own module so the two cannot drift.

import {
  DEFAULT_IMAGE,
  SITE_ORIGIN,
  breadcrumb,
  escapeHtml,
  type PublicSeoDocument,
} from './_seo';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const BASE_DOMAIN = 'creatives-takeover.com';

/** The canonical published address for a launch page. */
export function launchUrlFor(slug: string): string {
  return `https://${slug}.${BASE_DOMAIN}/`;
}

/**
 * Fetch a published launch project by slug. RLS lets the anon key read the
 * project only when launch_published = true, and the embedded rows only through
 * that published parent, so this single request is self-securing.
 */
export async function fetchLaunchProject(slug: string): Promise<any | null> {
  if (!slug || !SUPABASE_KEY) return null;
  const query =
    `demo_studio_projects?slug=eq.${encodeURIComponent(slug)}&launch_published=eq.true&limit=1`
    + '&select=id,name,tagline,logo_url,category,slug,launch_listed,updated_at,'
    + 'demo_studio_launch_pages(headline,subheadline,cta_label,theme),'
    + 'demo_studio_vsls(title,loom_embed_url,thumbnail_url,duration_seconds,created_at,is_primary)';
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

function isoDuration(seconds: unknown): string | null {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const minutes = Math.floor(total / 60);
  const remainder = Math.round(total % 60);
  return `PT${minutes > 0 ? `${minutes}M` : ''}${remainder}S`;
}

export function launchDocument(project: any): PublicSeoDocument {
  const page = project.demo_studio_launch_pages?.[0] ?? {};
  const canonical = launchUrlFor(project.slug);
  const headline = String(page.headline || project.tagline || 'demo and founder pitch');
  const title = `${project.name} — ${headline}`;
  const description = String(
    page.subheadline || project.tagline || `See the ${project.name} demo and founder pitch.`,
  );
  const vsls = Array.isArray(project.demo_studio_vsls) ? project.demo_studio_vsls : [];
  const vsl = vsls.find((item: any) => item?.is_primary && item?.loom_embed_url)
    ?? vsls.find((item: any) => item?.loom_embed_url);
  const duration = vsl ? isoDuration(vsl.duration_seconds) : null;
  const cacheBuster = Date.parse(project.updated_at || '') || 0;

  const schema: object[] = [
    breadcrumb([
      { name: 'Home', url: '/' },
      { name: 'Launches', url: '/launches' },
      { name: project.name, url: canonical },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      name: title,
      description,
      url: canonical,
      dateModified: project.updated_at,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: {
        '@type': 'Organization',
        name: project.name,
        ...(project.logo_url ? { logo: project.logo_url } : {}),
      },
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    },
  ];
  // VideoObject only when a playable pitch exists. Emitting it without a real
  // video is a rich-result violation.
  if (vsl?.loom_embed_url) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': `${canonical}#video`,
      name: String(vsl.title || `${project.name} founder pitch`),
      description,
      embedUrl: vsl.loom_embed_url,
      thumbnailUrl: vsl.thumbnail_url || `${SITE_ORIGIN}/og/p/${project.slug}`,
      uploadDate: vsl.created_at,
      ...(duration ? { duration } : {}),
    });
  }

  return {
    title,
    description,
    canonical,
    image: `${SITE_ORIGIN}/og/p/${project.slug}${cacheBuster ? `?v=${cacheBuster}` : ''}` || DEFAULT_IMAGE,
    // Founder opt-in. Unlisted pages stay reachable by link but are never indexed.
    indexable: project.launch_listed === true,
    schema,
    fallbackHtml: `<article><h1>${escapeHtml(headline)}</h1><p>${escapeHtml(description)}</p>${project.tagline ? `<h2>What it is</h2><p>${escapeHtml(project.tagline)}</p>` : ''}${project.category ? `<h2>Category</h2><p>${escapeHtml(project.category)}</p>` : ''}${vsl?.title ? `<h2>Founder pitch</h2><p>${escapeHtml(vsl.title)}</p>` : ''}<h2>Get early access</h2><p>${escapeHtml(page.cta_label || 'Join the waitlist')} — open the page to join the list.</p><p><a href="${SITE_ORIGIN}/launches">More founder launches on Creatives Takeover</a> · <a href="${SITE_ORIGIN}/demo-studio">Build a launch page like this one</a></p></article>`,
  };
}
