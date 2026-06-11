// Runtime sitemap for newspaper articles + tag archives.
//
// Why runtime: articles are published from the DB between deploys, so a build-time
// sitemap goes stale. This edge function always reflects the latest published
// stories, so new content is discoverable the moment it goes live. Referenced by
// the sitemap index at /sitemap.xml (rewritten via vercel.json).

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const SITE_ORIGIN = 'https://creatives-takeover.com';

interface StoryRow {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export default async function handler(): Promise<Response> {
  const emptyUrlset = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;

  if (!SUPABASE_KEY) {
    return new Response(emptyUrlset, {
      headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=300' },
    });
  }

  let stories: StoryRow[] = [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/stories_articles` +
        `?status=eq.published` +
        `&select=slug,updated_at,published_at` +
        `&order=published_at.desc&limit=5000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (res.ok) stories = (await res.json()) as StoryRow[];
  } catch {
    stories = [];
  }

  // Tag archives (/newspaper/tags/*) are intentionally excluded: they are pure
  // client-rendered SPA routes with no prerendered content or per-page canonical,
  // so listing them invites Google to crawl pages it reads as homepage duplicates.
  // Re-add them once they get server-rendered shells like article pages have.
  const entries: string[] = [];

  for (const story of stories) {
    if (!story.slug) continue;
    const lastmod = (story.updated_at || story.published_at || new Date().toISOString()).split('T')[0];
    entries.push(urlEntry(`${SITE_ORIGIN}/newspaper/${story.slug}`, lastmod, 'weekly', '0.7'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
