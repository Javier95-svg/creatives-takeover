import { xmlEscape } from './_seo';

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export default async function handler(): Promise<Response> {
  let rows: any[] = [];
  if (SERVICE_ROLE_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/mvp_projects?deployment_status=eq.deployed&project_type=eq.html_single&search_indexing_requested=eq.true&search_indexing_review_status=eq.approved&select=subdomain_slug,seo_title,seo_description,metadata,updated_at`,
        { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
      );
      const data = response.ok ? await response.json() : [];
      rows = Array.isArray(data) ? data : [];
    } catch {
      rows = [];
    }
  }

  const urls = rows
    .filter((row) => {
      const validation = row?.metadata?.lastPublishValidation;
      return row?.subdomain_slug
        && String(row.seo_title || '').trim().length >= 10
        && String(row.seo_description || '').trim().length >= 50
        && validation?.smokeTest?.passed === true;
    })
    .map((row) => `  <url>\n    <loc>${xmlEscape(`https://${row.subdomain_slug}.creatives-takeover.com/`)}</loc>${row.updated_at ? `\n    <lastmod>${xmlEscape(new Date(row.updated_at).toISOString())}</lastmod>` : ''}\n  </url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600', 'x-robots-tag': 'noindex' } });
}
