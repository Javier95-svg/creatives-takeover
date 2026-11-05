import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shellHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>AI Startup Builder | Creatives Takeover</title>
    <meta name="description" content="Generic site description." />
    <link rel="canonical" href="https://creatives-takeover.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="AI Startup Builder | Creatives Takeover" />
    <meta property="og:description" content="Generic site description." />
    <meta property="og:image" content="https://creatives-takeover.com/og-image.png" />
    <meta property="og:url" content="https://creatives-takeover.com/" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="AI Startup Builder | Creatives Takeover" />
    <meta name="twitter:description" content="Generic site description." />
    <meta name="twitter:image" content="https://creatives-takeover.com/og-image.png" />
  </head>
  <body>
    <main id="seo-fallback"></main>
    <div id="root"></div>
  </body>
</html>`;

test('social metadata lookup is public-read-only and independent of the browser key', () => {
  const api = readFileSync(new URL('../api/newspaper-og.ts', import.meta.url), 'utf8');
  const edge = readFileSync(new URL('../supabase/functions/public-story-metadata/index.ts', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  assert.match(api, /functions\/v1\/public-story-metadata/);
  assert.doesNotMatch(api, /Authorization: `Bearer \$\{SUPABASE_KEY\}`/);
  assert.match(edge, /\.eq\('status', 'published'\)/);
  assert.match(edge, /\^\[a-z0-9\]/);
  assert.match(config, /\[functions\.public-story-metadata\][\s\S]*?verify_jwt = false/);
});

test('newspaper OG handler injects article-specific social metadata', async (t) => {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_KEY = 'test-anon-key';

  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input) => {
    const url = input.toString();

    if (url.endsWith('/index.html')) {
      return new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (url.startsWith('https://example.supabase.co/functions/v1/public-story-metadata')) {
      assert.match(url, /slug=saas-pricing-is-dying/);
      return Response.json({ article: {
          slug: 'saas-pricing-is-dying-founders-who-see-it-coming-are-already',
          title: 'SaaS Pricing Is Dying. The Founders Who See It Coming Are Already Switching Models.',
          banner_image_url: '/story-banners/saas-pricing.jpg',
          excerpt: 'Usage-based pricing is changing how founders package and monetize software.',
          meta_title: null,
          meta_description: 'Usage-based pricing is changing how founders package and monetize software for a new era of AI products and customer expectations.',
          hashtags: ['#Growth', '#Monetization'],
          published_at: '2026-06-09T12:00:00.000Z',
          updated_at: '2026-06-09T12:00:00.000Z',
          body_content: 'Founders are moving away from static seats and toward value-aligned pricing.',
        } });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const { default: handler } = await import('../api/newspaper-og.ts');
  const response = await handler(new Request('https://creatives-takeover.com/api/newspaper-og?slug=saas-pricing-is-dying-founders-who-see-it-coming-are-already'));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<meta property="og:type" content="article" \/>/);
  assert.match(html, /<title>SaaS Pricing Is Dying\. The Founders Who See It Coming Are Already Switching Models\. \| Creatives Takeover<\/title>/);
  assert.match(html, /<meta property="og:title" content="SaaS Pricing Is Dying\. The Founders Who See It Coming Are Already Switching Models\." \/>/);
  assert.match(html, /<meta property="og:description" content="Usage-based pricing is changing how founders package and monetize software for a new era of AI products and customer expectations\." \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/creatives-takeover\.com\/story-banners\/saas-pricing\.jpg" \/>/);
  assert.match(html, /<meta property="og:image:secure_url" content="https:\/\/creatives-takeover\.com\/story-banners\/saas-pricing\.jpg" \/>/);
  assert.match(html, /<meta property="og:image:type" content="image\/jpeg" \/>/);
  assert.match(html, /<meta property="og:image:width" content="1200" \/>/);
  assert.match(html, /<meta property="og:image:height" content="630" \/>/);
  assert.match(html, /<meta property="og:image:alt" content="SaaS Pricing Is Dying\. The Founders Who See It Coming Are Already Switching Models\." \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/creatives-takeover\.com\/newspaper\/saas-pricing-is-dying-founders-who-see-it-coming-are-already" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(html, /<meta name="twitter:title" content="SaaS Pricing Is Dying\. The Founders Who See It Coming Are Already Switching Models\." \/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/creatives-takeover\.com\/story-banners\/saas-pricing\.jpg" \/>/);
  assert.match(html, /<meta name="twitter:image:alt" content="SaaS Pricing Is Dying\. The Founders Who See It Coming Are Already Switching Models\." \/>/);
  assert.equal(response.headers.get('x-newspaper-og-status'), 'article');
  assert.match(html, /<link rel="canonical" href="https:\/\/creatives-takeover\.com\/newspaper\/saas-pricing-is-dying-founders-who-see-it-coming-are-already" \/>/);
  assert.doesNotMatch(html, /<meta property="og:title" content="AI Startup Builder \| Creatives Takeover" \/>/);
});

test('routes WebP Supabase banners through the image-transform endpoint as a 1200x630 JPEG', async (t) => {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_KEY = 'test-anon-key';

  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input) => {
    const url = input.toString();

    if (url.endsWith('/index.html')) {
      return new Response(shellHtml, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (url.startsWith('https://example.supabase.co/functions/v1/public-story-metadata')) {
      return Response.json({ article: {
          slug: 'webp-banner-article',
          title: 'WebP Banner Article',
          banner_image_url:
            'https://rcjlaybjnozqbsoxzboa.supabase.co/storage/v1/object/public/story-banners/temp/1781299719271.webp',
          excerpt: 'An article whose banner is an auto-generated WebP image.',
          meta_title: null,
          meta_description:
            'An article whose banner is an auto-generated WebP image stored in Supabase Storage for social previews.',
          hashtags: ['#Founders'],
          published_at: '2026-06-12T12:00:00.000Z',
          updated_at: '2026-06-12T12:00:00.000Z',
          body_content: 'Body content.',
        } });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const { default: handler } = await import('../api/newspaper-og.ts');
  const response = await handler(
    new Request('https://creatives-takeover.com/api/newspaper-og?slug=webp-banner-article'),
  );
  const html = await response.text();

  // Ampersands are HTML-escaped to &amp; in the attribute (crawlers decode them back).
  const expectedImage =
    'https://rcjlaybjnozqbsoxzboa.supabase.co/storage/v1/render/image/public/story-banners/temp/1781299719271.webp?width=1200&amp;height=630&amp;resize=cover&amp;quality=80';

  assert.equal(response.status, 200);
  // og:image and twitter:image must point at the transform (JPEG) endpoint, never the raw .webp object.
  assert.ok(html.includes(`<meta property="og:image" content="${expectedImage}" />`));
  assert.ok(html.includes(`<meta name="twitter:image" content="${expectedImage}" />`));
  assert.doesNotMatch(html, /object\/public\/story-banners\/temp\/1781299719271\.webp/);
});
