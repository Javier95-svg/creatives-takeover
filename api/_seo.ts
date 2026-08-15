export const SITE_ORIGIN = 'https://creatives-takeover.com';
export const SITE_NAME = 'Creatives Takeover';
export const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-founders-compass-2026-07.png`;

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setMeta(html: string, attr: 'name' | 'property', key: string, value: string): string {
  const pattern = new RegExp(`(<meta\\s+${attr}=["']${escapeRegExp(key)}["']\\s+content=["'])[^"']*(["'])`, 'i');
  if (pattern.test(html)) return html.replace(pattern, `$1${escapeHtml(value)}$2`);
  return html.replace('</head>', `    <meta ${attr}="${key}" content="${escapeHtml(value)}" />\n  </head>`);
}

export function setTitle(html: string, title: string): string {
  return /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    : html.replace('</head>', `    <title>${escapeHtml(title)}</title>\n  </head>`);
}

export function setCanonical(html: string, canonical: string): string {
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  return /<link\s+rel=["']canonical["'][^>]*>/i.test(html)
    ? html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, tag)
    : html.replace('</head>', `    ${tag}\n  </head>`);
}

export function injectJsonLd(html: string, data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace('</head>', `    <script type="application/ld+json">${json}</script>\n  </head>`);
}

export interface PublicSeoDocument {
  title: string;
  description: string;
  canonical: string;
  image?: string | null;
  indexable?: boolean;
  schema: object | object[];
  fallbackHtml: string;
}

export function renderSeoDocument(shell: string, document: PublicSeoDocument): string {
  const image = document.image || DEFAULT_IMAGE;
  const robots = document.indexable === false
    ? 'noindex,follow'
    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
  let html = setTitle(shell, document.title);
  html = setMeta(html, 'name', 'description', document.description.slice(0, 160));
  html = setMeta(html, 'name', 'robots', robots);
  html = setMeta(html, 'name', 'googlebot', robots);
  html = setCanonical(html, document.canonical);
  html = setMeta(html, 'property', 'og:type', 'website');
  html = setMeta(html, 'property', 'og:title', document.title);
  html = setMeta(html, 'property', 'og:description', document.description.slice(0, 160));
  html = setMeta(html, 'property', 'og:url', document.canonical);
  html = setMeta(html, 'property', 'og:image', image);
  html = setMeta(html, 'property', 'og:site_name', SITE_NAME);
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', document.title);
  html = setMeta(html, 'name', 'twitter:description', document.description.slice(0, 160));
  html = setMeta(html, 'name', 'twitter:image', image);
  html = injectJsonLd(html, document.schema);
  return html.replace(
    /<main id="seo-fallback">[\s\S]*?<\/main>/i,
    `<main id="seo-fallback">${document.fallbackHtml}</main>`,
  );
}

export function breadcrumb(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_ORIGIN}${item.url}`,
    })),
  };
}

export function generateSlug(value: string): string {
  return value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function xmlEscape(value: unknown): string {
  return escapeHtml(value);
}
