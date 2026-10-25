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

// --- Startup Pedia term links: a copy of src/lib/pediaTermLinks.ts ---
// The server-rendered article body links the first mention of a few Startup
// Pedia terms, exactly as the SPA does. tests/pedia-term-links.test.ts keeps
// this block identical to the source file.
interface PediaTermLink {
  /** Regular expression source, matched on word boundaries. */
  pattern: string;
  /** Acronyms match case-sensitively; phrases ignore case. */
  caseSensitive?: boolean;
  slug: string;
}

// Specific phrases first, then acronyms. Short acronyms that are also ordinary
// words or initials (IP, PE, SAM, SOM) are left out to avoid wrong links.
export const PEDIA_TERM_LINKS: PediaTermLink[] = [
  { pattern: "product[- ]market fit", slug: "product-market-fit" },
  { pattern: "minimum viable products?", slug: "minimum-viable-product" },
  { pattern: "customer acquisition costs?", slug: "customer-acquisition-cost" },
  { pattern: "(?:customer )?lifetime value", slug: "customer-lifetime-value" },
  { pattern: "go[- ]to[- ]market(?: strategy)?", slug: "go-to-market-strategy" },
  { pattern: "ideal customer profiles?", slug: "ideal-customer-profile" },
  { pattern: "unique selling (?:proposition|point)", slug: "unique-selling-proposition" },
  { pattern: "total addressable market", slug: "tam-sam-som" },
  { pattern: "monthly recurring revenue", slug: "mrr-and-arr" },
  { pattern: "annual recurring revenue", slug: "mrr-and-arr" },
  { pattern: "average order value", slug: "average-order-value" },
  { pattern: "return on ad spend", slug: "roi-and-roas" },
  { pattern: "net promoter score", slug: "net-promoter-score" },
  { pattern: "venture capital(?:ists?)?", slug: "venture-capital-vs-private-equity" },
  { pattern: "private equity", slug: "venture-capital-vs-private-equity" },
  { pattern: "pre-seed", slug: "pre-seed-vs-seed-funding" },
  { pattern: "series a", slug: "startup-funding-stages" },
  { pattern: "initial public offering", slug: "startup-funding-stages" },
  { pattern: "pitch decks?", slug: "pitch-deck-outline" },
  { pattern: "employee stock options?", slug: "employee-stock-option-plan" },
  { pattern: "non-disclosure agreements?", slug: "nda-and-intellectual-property" },
  { pattern: "intellectual property", slug: "nda-and-intellectual-property" },
  { pattern: "customer interviews?", slug: "customer-interview-questions" },
  { pattern: "cold emails?", slug: "cold-email-for-startups" },
  { pattern: "waitlists?", slug: "waitlist-before-mvp" },
  { pattern: "tech stacks?", slug: "how-to-choose-a-startup-tech-stack" },
  { pattern: "software as a service", slug: "saas" },
  { pattern: "MVPs?", caseSensitive: true, slug: "minimum-viable-product" },
  { pattern: "PMF", caseSensitive: true, slug: "product-market-fit" },
  { pattern: "CAC", caseSensitive: true, slug: "customer-acquisition-cost" },
  { pattern: "LTV", caseSensitive: true, slug: "customer-lifetime-value" },
  { pattern: "GTM", caseSensitive: true, slug: "go-to-market-strategy" },
  { pattern: "ICPs?", caseSensitive: true, slug: "ideal-customer-profile" },
  { pattern: "TAM", caseSensitive: true, slug: "tam-sam-som" },
  { pattern: "MRR", caseSensitive: true, slug: "mrr-and-arr" },
  { pattern: "ARR", caseSensitive: true, slug: "mrr-and-arr" },
  { pattern: "AOV", caseSensitive: true, slug: "average-order-value" },
  { pattern: "ROAS", caseSensitive: true, slug: "roi-and-roas" },
  { pattern: "NPS", caseSensitive: true, slug: "net-promoter-score" },
  { pattern: "KPIs?", caseSensitive: true, slug: "kpis-and-okrs" },
  { pattern: "OKRs?", caseSensitive: true, slug: "kpis-and-okrs" },
  { pattern: "DAU|MAU", caseSensitive: true, slug: "dau-and-mau" },
  { pattern: "B2B|B2C|D2C|DTC", caseSensitive: true, slug: "b2b-b2c-d2c" },
  { pattern: "SaaS", caseSensitive: true, slug: "saas" },
  { pattern: "ESOPs?", caseSensitive: true, slug: "employee-stock-option-plan" },
  { pattern: "NDAs?", caseSensitive: true, slug: "nda-and-intellectual-property" },
  { pattern: "IPOs?", caseSensitive: true, slug: "startup-funding-stages" },
];

/** A few links per article: enough to help readers and search engines, not enough to clutter the story. */
export const MAX_PEDIA_LINKS_PER_ARTICLE = 4;

// Spans that must never gain a link: images and links, inline code, bare URLs.
const PROTECTED = /(!?\[[^\]]*\]\([^)]*\)|`[^`]*`|https?:\/\/\S+)/;

/**
 * Returns the markdown with the first mention of up to MAX_PEDIA_LINKS_PER_ARTICLE
 * different entries linked. `base` is "" for in-app links and the site origin
 * where only absolute links are allowed (the server-rendered article body).
 */
export function linkPediaTerms(markdown: string | null | undefined, base = ""): string {
  if (!markdown) return "";
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const linkedSlugs = new Set<string>();
  let inFence = false;

  for (const term of PEDIA_TERM_LINKS) {
    if (linkedSlugs.size >= MAX_PEDIA_LINKS_PER_ARTICLE) break;
    if (linkedSlugs.has(term.slug)) continue;
    const matcher = new RegExp(`(^|[^\\w-])(${term.pattern})(?![\\w-])`, term.caseSensitive ? "" : "i");

    inFence = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      // Headings, fenced code and block quotes keep their text untouched.
      if (inFence || /^\s*(#|>)/.test(line)) continue;

      const parts = line.split(PROTECTED);
      let replaced = false;
      for (let part = 0; part < parts.length && !replaced; part += 2) {
        const match = matcher.exec(parts[part]);
        if (!match) continue;
        const start = match.index + match[1].length;
        const text = match[2];
        parts[part] = `${parts[part].slice(0, start)}[${text}](${base}/startup-pedia/${term.slug})${parts[part].slice(start + text.length)}`;
        replaced = true;
      }
      if (replaced) {
        lines[index] = parts.join("");
        linkedSlugs.add(term.slug);
        break;
      }
    }
  }

  return lines.join("\n");
}
// --- end of Startup Pedia term links ---

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
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
  updated_at: string | null;
  body_content: string | null;
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

// Inject a JSON-LD <script> before </head>.
function injectJsonLd(html: string, data: unknown): string {
  const script = `    <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n  </head>`;
  return html.replace('</head>', script);
}

// Minimal, safe Markdown -> HTML for crawler-visible article body. Handles
// headings, lists, bold/italic, links, and paragraphs. All text is escaped first.
function markdownToHtml(markdown: string): string {
  const escaped = escapeAttr(markdown);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const inline = (text: string) =>
    text
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(heading[1].length + 1, 6); // h1 reserved for the title
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushParagraph();
      const wanted = ul ? 'ul' : 'ol';
      if (listType !== wanted) {
        closeList();
        listType = wanted;
        out.push(`<${wanted}>`);
      }
      out.push(`<li>${inline((ul ? ul[1] : ol![1]))}</li>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  return out.join('\n');
}

// Normalize a banner into a crawler-safe social card image. Auto-generated banners
// are arbitrary sizes and frequently WebP, which X/Twitter renders unreliably (the
// preview comes back blank). For Supabase Storage banners, route through the image
// transform (render) endpoint to force a 1200x630 JPEG that every crawler accepts;
// non-Supabase URLs are returned unchanged.
function toSocialCardImage(imageUrl: string): string {
  const marker = '/storage/v1/object/public/';
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return imageUrl;
  const base = imageUrl.slice(0, idx);
  const path = imageUrl.slice(idx + marker.length).split('?')[0];
  return `${base}/storage/v1/render/image/public/${path}?width=1200&height=630&resize=cover&quality=80`;
}

// Mirrors the meta-title/description logic in src/pages/StoryArticle.tsx so the
// crawler preview matches what users see once the SPA hydrates.
// Copies of src/utils/storyMeta.ts; tests/story-meta.test.ts keeps them equal.
// Excerpts are one-line teasers, so the description falls back to the
// article's opening paragraphs rather than padding the teaser with filler.
function openingText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(#|!\[|>|\||```|---)/.test(block))
    .map((block) =>
      block
        .replace(/<[^>]+>/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]+/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
  let text = '';
  for (const paragraph of paragraphs) {
    text = text ? `${text} ${paragraph}` : paragraph;
    if (text.length >= 120) break;
  }
  return text;
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.substring(0, max - 3);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.substring(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}...`;
}

const stripEmoji = (text: string) => text.replace(/\s*\p{Extended_Pictographic}️?/gu, '').trim();

function buildMeta(article: StoryRecord) {
  const optimizedMetaTitle = stripEmoji(article.meta_title || article.title);

  const excerpt = (article.excerpt || '').trim();
  const metaDescription = truncateAtWord(
    article.meta_description ||
      (excerpt.length >= 120 ? excerpt : '') ||
      openingText(article.body_content) ||
      excerpt ||
      article.title,
    160,
  );

  const banner = article.banner_image_url || '';
  const absoluteBanner = banner
    ? (banner.startsWith('http') ? banner : `${SITE_ORIGIN}${banner}`)
    : '';
  const ogImageUrl = absoluteBanner
    ? toSocialCardImage(absoluteBanner)
    : `${SITE_ORIGIN}/og-founders-compass-2026-09.png`;

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

  // The shell at 200, for requests that are not article lookups (real routes) and
  // for upstream failures. A transient Supabase error must NOT answer 404: that
  // would deindex live articles for the length of the outage.
  const passthrough = () =>
    new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    });

  // A slug that resolved to nothing. Distinct from passthrough: the lookup
  // succeeded and the article genuinely is not there.
  const notFound = () => {
    let body = setTitle(html, 'Page not found | Creatives Takeover');
    body = setMeta(body, 'name', 'robots', 'noindex,follow');
    return new Response(body, {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=60',
        'x-robots-tag': 'noindex,follow',
      },
    });
  };

  if (!slug || RESERVED_SLUGS.has(slug) || !SUPABASE_KEY) {
    return passthrough();
  }

  // An article was once published with backticks around its slug, and Google
  // indexed that URL. The slug is clean now; send the old address to it.
  const cleanSlug = slug.replace(/[`'"]/g, '');
  if (cleanSlug !== slug && cleanSlug) {
    return new Response(null, {
      status: 301,
      headers: { location: `${SITE_ORIGIN}/newspaper/${encodeURIComponent(cleanSlug)}` },
    });
  }

  let article: StoryRecord | null = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/stories_articles` +
        `?slug=eq.${encodeURIComponent(slug)}` +
        `&status=eq.published` +
        `&select=slug,title,banner_image_url,excerpt,meta_title,meta_description,hashtags,published_at,updated_at,body_content` +
        `&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) {
      return passthrough();
    }

    const records = await res.json();
    if (!Array.isArray(records)) {
      return passthrough();
    }

    article = records[0] ?? null;
  } catch {
    // Network/parse error — fall back to the generic shell rather than failing the page.
    return passthrough();
  }

  if (!article) {
    // Unknown or unpublished slug. The SPA already renders its not-found view,
    // but the status line has to agree: answering 200 here is precisely what
    // Search Console files as a soft 404, and unpublishing a story is how an
    // already-indexed URL arrives in this branch. Mirrors api/public-entity.ts,
    // which answers missing entities the same way.
    return notFound();
  }

  const { optimizedMetaTitle, metaDescription, ogImageUrl } = buildMeta(article);
  const articleUrl = `${SITE_ORIGIN}/newspaper/${article.slug}`;

  html = setTitle(html, `${optimizedMetaTitle} | Creatives Takeover`);
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

  // Article structured data (E-E-A-T: author, dates, publisher, image).
  const authorName = 'Creatives Takeover Editorial Team';
  const publishedIso = article.published_at || article.updated_at || new Date().toISOString();
  const modifiedIso = article.updated_at || publishedIso;
  html = injectJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: optimizedMetaTitle,
    description: metaDescription,
    image: ogImageUrl,
    author: {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Creatives Takeover',
      url: SITE_ORIGIN,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Creatives Takeover',
      logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/favicon-192x192.png` },
    },
    datePublished: publishedIso,
    dateModified: modifiedIso,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    ...(article.hashtags && article.hashtags.length
      ? { keywords: article.hashtags.map((t) => t.replace(/^#/, '')).join(', ') }
      : {}),
  });

  // Server-render the article body into the crawler-visible fallback so the
  // ranking content (not just meta) is in the initial HTML. Humans still get the
  // full React app; the fallback is hidden once JS boots.
  if (article.body_content && article.body_content.trim()) {
    const publishedLabel = new Date(publishedIso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const articleHtml = `
      <header>
        <p>Creatives Takeover — Newspaper</p>
      </header>
      <article>
        <h1>${escapeAttr(article.title)}</h1>
        <p>By ${escapeAttr(authorName)} · ${escapeAttr(publishedLabel)}</p>
        ${article.excerpt ? `<p>${escapeAttr(article.excerpt)}</p>` : ''}
        ${markdownToHtml(linkPediaTerms(article.body_content, SITE_ORIGIN))}
        <p><a href="/newspaper">Read more founder insights on Creatives Takeover</a></p>
      </article>`;
    html = html.replace(
      /<main id="seo-fallback">[\s\S]*?<\/main>/i,
      `<main id="seo-fallback">${articleHtml}</main>`,
    );
  }

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Cache per-slug at the edge; revalidate in the background so edits propagate.
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
