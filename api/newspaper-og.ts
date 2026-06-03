// Vercel Edge Function — injects per-article Open Graph / Twitter meta tags into
// the SPA shell for /newspaper/:slug requests.
//
// Why: social crawlers (X/Twitter, LinkedIn, Facebook, Slack, …) do not execute
// JavaScript, so the per-article tags set client-side by react-helmet never run for
// them. They only read the static index.html, which ships generic site-wide OG tags.
// This function fetches the article and rewrites the <head> so shares show the real
// title and banner. Humans get the same correct tags and the SPA boots normally.
//
// Wired up via a rewrite in vercel.json: /newspaper/:slug -> /api/newspaper-og?slug=:slug

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://lkugysnbxzfuvahopagp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const SITE_ORIGIN = 'https://creatives-takeover.com';

// Single-segment paths under /newspaper that are real routes, not article slugs.
const RESERVED_SLUGS = new Set(['rss.xml', 'tags', 'admin']);

interface StoryRecord {
  slug: string;
  title: string;
  banner_image_url: string | null;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  hashtags: string[] | null;
  published_at: string | null;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Replace the content of an existing <meta {attr}="{key}" content="..."> tag, or
// inject the tag before </head> if it is not already present.
function setMeta(html: string, attr: 'property' | 'name', key: string, value: string): string {
  const re = new RegExp(
    `(<meta\\s+${attr}=["']${escapeRegExp(key)}["']\\s+content=["'])[^"']*(["'])`,
    'i',
  );
  if (re.test(html)) {
    return html.replace(re, `$1${escapeAttr(value)}$2`);
  }
  return html.replace(
    '</head>',
    `    <meta ${attr}="${key}" content="${escapeAttr(value)}" />\n  </head>`,
  );
}

function setTitle(html: string, value: string): string {
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(value)}</title>`);
  }
  return html.replace('</head>', `    <title>${escapeAttr(value)}</title>\n  </head>`);
}

function setCanonical(html: string, url: string): string {
  const re = /(<link\s+rel=["']canonical["']\s+href=["'])[^"']*(["'])/i;
  if (re.test(html)) {
    return html.replace(re, `$1${escapeAttr(url)}$2`);
  }
  return html.replace('</head>', `    <link rel="canonical" href="${escapeAttr(url)}" />\n  </head>`);
}

// Mirrors the meta-title/description logic in src/pages/StoryArticle.tsx so the
// crawler preview matches what users see once the SPA hydrates.
function buildMeta(article: StoryRecord) {
  const primaryTag = article.hashtags && article.hashtags.length > 0
    ? article.hashtags[0].replace('#', '')
    : '';

  const metaTitle = article.meta_title || article.title;
  const optimizedMetaTitle = primaryTag && !metaTitle.toLowerCase().includes(primaryTag.toLowerCase())
    ? `${metaTitle} | ${primaryTag}`
    : metaTitle;

  let metaDescription = article.meta_description || article.excerpt || article.title;
  if (metaDescription.length < 120) {
    const tagKeywords = (article.hashtags ?? []).slice(0, 2).map((t) => t.replace('#', '')).join(', ');
    metaDescription = tagKeywords
      ? `${metaDescription} Learn about ${tagKeywords} and more from Creatives Takeover.`
      : `${metaDescription} Read insights and stories from Creatives Takeover.`;
  }
  if (metaDescription.length > 160) {
    metaDescription = `${metaDescription.substring(0, 157)}...`;
  }

  const banner = article.banner_image_url || '';
  const ogImageUrl = banner
    ? (banner.startsWith('http') ? banner : `${SITE_ORIGIN}${banner}`)
    : `${SITE_ORIGIN}/og-image.png`;

  return { optimizedMetaTitle, metaDescription, ogImageUrl };
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').trim();
  const origin = url.origin;

  // Always serve the SPA shell as the base document.
  const shellRes = await fetch(`${origin}/index.html`, {
    headers: { 'x-newspaper-og': '1' },
  });
  let html = await shellRes.text();

  const passthrough = () =>
    new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    });

  if (!slug || RESERVED_SLUGS.has(slug) || !SUPABASE_KEY) {
    return passthrough();
  }

  let article: StoryRecord | null = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/stories_articles` +
        `?slug=eq.${encodeURIComponent(slug)}` +
        `&status=eq.published` +
        `&select=slug,title,banner_image_url,excerpt,meta_title,meta_description,hashtags,published_at` +
        `&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    const records = (await res.json()) as StoryRecord[];
    article = records[0] ?? null;
  } catch {
    // Network/parse error — fall back to the generic shell rather than failing the page.
    return passthrough();
  }

  if (!article) {
    // Unknown/unpublished slug: let the SPA handle redirect/404 with generic tags.
    return passthrough();
  }

  const { optimizedMetaTitle, metaDescription, ogImageUrl } = buildMeta(article);
  const articleUrl = `${SITE_ORIGIN}/newspaper/${article.slug}`;

  html = setTitle(html, `${optimizedMetaTitle} | Creatives Takeover Stories`);
  html = setMeta(html, 'name', 'description', metaDescription);
  html = setCanonical(html, articleUrl);

  html = setMeta(html, 'property', 'og:type', 'article');
  html = setMeta(html, 'property', 'og:title', optimizedMetaTitle);
  html = setMeta(html, 'property', 'og:description', metaDescription);
  html = setMeta(html, 'property', 'og:image', ogImageUrl);
  html = setMeta(html, 'property', 'og:url', articleUrl);
  html = setMeta(html, 'property', 'og:site_name', 'Creatives Takeover');

  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', optimizedMetaTitle);
  html = setMeta(html, 'name', 'twitter:description', metaDescription);
  html = setMeta(html, 'name', 'twitter:image', ogImageUrl);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Cache per-slug at the edge; revalidate in the background so edits propagate.
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
