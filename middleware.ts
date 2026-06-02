// Vercel Edge Middleware — only runs for requests to /icp/*/public
// Detects social media bot crawlers and returns a minimal HTML page with OG
// meta tags so link previews on LinkedIn, X, Slack etc. show the ICP card.
// All human visitors pass through normally to the Vite SPA.

export const config = {
  matcher: ['/icp/:slug*/public'],
};

const BOT_UA =
  /linkedinbot|twitterbot|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|applebot|iframely|redditbot|pinterest/i;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? '';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const ua = request.headers.get('user-agent') ?? '';
  if (!BOT_UA.test(ua)) return undefined; // humans: pass through to SPA

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/icp\/([^/]+)\/public$/);
  const slug = match?.[1];
  if (!slug) return undefined;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bizmap_shared_outputs?slug=eq.${encodeURIComponent(slug)}&source_type=eq.icp&visibility=in.(unlisted,public)&select=title,summary&limit=1`,
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
    const ogImage = `${url.origin}/api/og-icp?slug=${encodeURIComponent(slug)}`;
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
