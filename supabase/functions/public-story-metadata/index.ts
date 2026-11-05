// Public, read-only article projection for the Vercel social-card renderer.
// Only published Newspaper content can leave this endpoint.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { serviceClient } from '../_shared/guards.ts';

const HEADERS = {
  'Access-Control-Allow-Origin': 'https://creatives-takeover.com',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS });
  if (req.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);

  const slug = new URL(req.url).searchParams.get('slug')?.trim() ?? '';
  if (slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return reply({ error: 'Not found' }, 404);
  }

  const { data, error } = await serviceClient()
    .from('stories_articles')
    .select('slug,title,banner_image_url,excerpt,meta_title,meta_description,hashtags,published_at,updated_at,body_content')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('[public-story-metadata] lookup failed', error.code);
    return reply({ error: 'Temporarily unavailable' }, 503);
  }
  if (!data) return reply({ error: 'Not found' }, 404);
  return reply({ article: data });
});
