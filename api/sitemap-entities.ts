import { SITE_ORIGIN, generateSlug, xmlEscape } from './_seo';

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

interface SitemapEntry { loc: string; lastmod?: string | null }

async function getRows(path: string): Promise<any[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
    const data = response.ok ? await response.json() : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getCofounders(): Promise<any[]> {
  const items: any[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/browse_cofounder_listings_v1`, {
        method: 'POST', headers, body: JSON.stringify({ p_filters: { sort: 'newest' }, p_limit: 50, p_cursor: cursor }),
      });
      if (!response.ok) break;
      const data = await response.json();
      if (!data || !Array.isArray(data.items)) break;
      items.push(...data.items);
      cursor = typeof data.nextCursor === 'string' ? data.nextCursor : null;
      if (!cursor) break;
    } catch {
      break;
    }
  }
  return items;
}

export default async function handler(): Promise<Response> {
  const [services, mentors, profiles, cofounders] = await Promise.all([
    getRows('services?is_active=eq.true&select=slug,updated_at'),
    getRows('mentors?is_active=eq.true&select=name,updated_at'),
    getRows('public_profiles?seo_indexable=eq.true&select=username'),
    getCofounders(),
  ]);

  const entries: SitemapEntry[] = [
    ...services.filter((row) => row.slug).map((row) => ({ loc: `${SITE_ORIGIN}/marketplace/${row.slug}`, lastmod: row.updated_at })),
    ...mentors.filter((row) => row.name).map((row) => ({ loc: `${SITE_ORIGIN}/mentorship/${generateSlug(row.name)}`, lastmod: row.updated_at })),
    ...profiles.filter((row) => row.username).map((row) => ({ loc: `${SITE_ORIGIN}/profile/${row.username}` })),
    ...cofounders.filter((row) => row.id).map((row) => ({ loc: `${SITE_ORIGIN}/co-founder/listing/${row.id}`, lastmod: row.updatedAt })),
  ];
  const unique = [...new Map(entries.map((entry) => [entry.loc, entry])).values()];
  const urls = unique.map((entry) => `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>${entry.lastmod ? `\n    <lastmod>${xmlEscape(new Date(entry.lastmod).toISOString())}</lastmod>` : ''}\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600', 'x-robots-tag': 'noindex' } });
}
