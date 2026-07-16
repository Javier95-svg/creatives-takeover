// Vercel Edge Middleware. Runs BEFORE the static filesystem / vercel.json rewrites,
// which is exactly why it's needed for two cases that must intercept early:
//
//   1. Published MVP sites at {slug}.creatives-takeover.com. The ROOT path must be
//      handled here: Vercel serves the static index.html (the SPA) from the
//      filesystem before `rewrites` run, so the vercel.json host rewrite never fires
//      for "/". Non-root published paths (assets, sub-pages) are still handled by the
//      vercel.json host rewrite -> /api/published-site. Here we proxy the root request
//      to that same serving function so there is one source of serving logic.
//
//   2. Real HTTP 404 responses for unknown application paths.
//
//   3. Social-crawler OG meta tags for /icp/:slug/public (original behavior).

import { isKnownAppRoute } from './src/config/seoRoutePolicy';

export const config = {
  matcher: ['/:path*'],
};

const BOT_UA =
  /linkedinbot|twitterbot|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|applebot|iframely|redditbot|pinterest/i;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

const PUBLISH_BASE = 'creatives-takeover.com';
const RESERVED_LABELS = new Set(['www', 'app', 'api', 'mail', 'admin', 'staging']);

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Returns the published slug if the host is {slug}.creatives-takeover.com (and not
// the apex or a reserved label), otherwise null.
function publishedSlugFromHost(rawHost: string): string | null {
  const host = rawHost.toLowerCase().split(':')[0];
  if (host === PUBLISH_BASE || !host.endsWith(`.${PUBLISH_BASE}`)) return null;
  const label = host.slice(0, host.length - PUBLISH_BASE.length - 1).split('.').pop() ?? '';
  if (!label || RESERVED_LABELS.has(label) || !/^[a-z0-9-]+$/.test(label)) return null;
  return label;
}

function isStaticOrServerPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/.well-known/') ||
    /\.[a-z0-9]{2,8}$/i.test(pathname)
  );
}

function buildNotFoundResponse(origin: string): Response {
  const home = `${origin}/`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Page Not Found | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" />
<meta name="description" content="The requested page could not be found." /><link rel="canonical" href="${home}" /></head>
<body><main><h1>Page not found</h1><p>The page you requested does not exist.</p><p><a href="${home}">Return to Creatives Takeover</a></p></main></body></html>`;
  return new Response(html, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);

  // 1) Published MVP site root -> proxy to the serving function (which resolves the
  //    project files for this slug). Must run here, before the static index.html.
  const slug = publishedSlugFromHost(request.headers.get('host') ?? '');
  if (slug) {
    const fnUrl = new URL('/api/published-site', url.origin);
    fnUrl.searchParams.set('slug', slug);
    fnUrl.searchParams.set('p', url.pathname.replace(/^\/+/, ''));
    try {
      const res = await fetch(fnUrl.toString());
      const headers = new Headers();
      const contentType = res.headers.get('content-type');
      const cacheControl = res.headers.get('cache-control');
      if (contentType) headers.set('content-type', contentType);
      headers.set('cache-control', cacheControl ?? 'public, max-age=60, stale-while-revalidate=300');
      headers.set('x-robots-tag', 'noindex');
      return new Response(res.body, { status: res.status, headers });
    } catch {
      return undefined; // fail open to the SPA rather than hard-error
    }
  }

  // The SPA fallback is only valid for routes the application owns. Without
  // this check Vercel's catch-all rewrite serves homepage HTML with status 200.
  if (
    !isStaticOrServerPath(url.pathname) &&
    (request.method === 'GET' || request.method === 'HEAD') &&
    !isKnownAppRoute(url.pathname)
  ) {
    return buildNotFoundResponse(url.origin);
  }

  // 3) ICP social-card OG tags for crawlers; humans pass through to the SPA.
  const ua = request.headers.get('user-agent') ?? '';
  if (!BOT_UA.test(ua)) return undefined;

  const match = url.pathname.match(/^\/icp\/([^/]+)\/public$/);
  const icpSlug = match?.[1];
  if (!icpSlug) return undefined;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bizmap_shared_outputs?slug=eq.${encodeURIComponent(icpSlug)}&source_type=eq.icp&visibility=in.(unlisted,public)&select=title,summary&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    );

    const records = (await res.json()) as Array<{ title: string; summary: string }>;
    const record = records[0];
    if (!record) return undefined;

    const title = esc(`${record.title} — ICP Draft`);
    const description = esc(record.summary);
    const ogImage = `${url.origin}/api/og-icp?slug=${encodeURIComponent(icpSlug)}`;
    const cardUrl = esc(url.href);
    const siteName = 'Creatives Takeover';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title} | ${siteName}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${siteName}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${cardUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
</head>
<body></body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return undefined; // pass through on any error
  }
}
