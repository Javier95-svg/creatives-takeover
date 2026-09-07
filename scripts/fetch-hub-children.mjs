// Build-time fetch of the children each content hub should link to.
//
// Why build time rather than a runtime edge function: routes with a prerendered
// file in dist/ are served from the filesystem, and Vercel resolves the
// filesystem before rewrites. /marketplace proves it — vercel.json rewrites it
// to /api/public-entity, but production serves the static shell and the SSR
// listing never ships. So for any prerendered route, the only markup that
// reaches a crawler is what this build step puts there.
//
// Hubs previously emitted the generic nav and nothing else, which left 119
// articles and 54 mentor profiles reachable only from a sitemap — the textbook
// cause of "Discovered – currently not indexed".
//
// Every failure degrades to an empty list. A hub with no child links is the
// status quo; a build that dies because Supabase blinked is worse.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

// Enough links to vouch for the children without turning a hub into a link farm.
const ARTICLE_LIMIT = 40;
const MENTOR_LIMIT = 60;

/** Mirrors generateMentorSlug in src/utils/mentorSlug.ts — profile URLs must match. */
function mentorSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getRows(query) {
  if (!SUPABASE_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Child links per hub route, keyed by the hub's path.
 * Returns {} when Supabase is unreachable or unconfigured.
 */
export async function fetchHubChildren() {
  const [articles, mentors, services] = await Promise.all([
    getRows(
      'stories_articles?status=eq.published&select=slug,title,published_at' +
        `&order=published_at.desc.nullslast&limit=${ARTICLE_LIMIT}`,
    ),
    getRows(`mentors?is_active=eq.true&select=name&limit=${MENTOR_LIMIT}`),
    // /marketplace has a static shell, and Vercel resolves the filesystem before
    // the vercel.json rewrite to /api/public-entity — so the SSR listing that
    // would have carried these links never ships. Confirmed against production.
    getRows('services?is_active=eq.true&select=slug,name&limit=200'),
  ]);

  const children = {};

  const articleLinks = articles
    .filter((row) => row.slug && row.title)
    .map((row) => ({ href: `/newspaper/${row.slug}`, label: row.title }));
  if (articleLinks.length) children['/newspaper'] = articleLinks;

  const mentorLinks = mentors
    .filter((row) => row.name)
    .map((row) => ({ href: `/mentorship/${mentorSlug(row.name)}`, label: row.name }))
    // Two mentors sharing a name would collide on one slug; one link is correct.
    .filter((link, index, all) => all.findIndex((other) => other.href === link.href) === index);
  if (mentorLinks.length) children['/mentorship'] = mentorLinks;

  const serviceLinks = services
    .filter((row) => row.slug && row.name)
    .map((row) => ({ href: `/marketplace/${row.slug}`, label: row.name }));
  if (serviceLinks.length) children['/marketplace'] = serviceLinks;

  return children;
}
