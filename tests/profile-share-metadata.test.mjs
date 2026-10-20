import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

async function bundle(path) {
  const result = await build({ entryPoints: [path], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports;
}

test('a fresh Founder ID share URL serves consistent luxury-card metadata', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousKey = process.env.VITE_SUPABASE_KEY;
  try {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_KEY = 'test-key';
    const { founderIdShareUrl } = await bundle('src/lib/founderId.ts');
    const shared = new URL(founderIdShareUrl('javier', 'https://creatives-takeover.com'));
    assert.equal(shared.pathname, '/@javier');
    assert.equal(shared.searchParams.get('card'), '4');
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/index.html')) return new Response('<html><head><meta property="og:image:secure_url" content="old.png"><meta property="og:image:width" content="3159"><meta property="og:image:height" content="1462"></head><body><main id="seo-fallback"></main></body></html>');
      if (url.includes('/public_profiles?')) return Response.json([{ id: 'user-id', username: 'javier', full_name: 'Javier Alonso', user_type: 'founder', seo_indexable: true }]);
      throw new Error(`Unexpected fetch: ${url}`);
    };
    const { default: handler } = await bundle('api/public-entity.ts');
    const response = await handler(new Request('https://creatives-takeover.com/profile/javier?type=profile&slug=javier&card=4'));
    assert.equal(response.status, 200);
    const html = await response.text();
    const meta = (name) => html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1];
    const image = 'https://creatives-takeover.com/og/profile/javier?v=4';
    assert.equal(meta('og:image'), image);
    assert.equal(meta('og:image:secure_url'), image);
    assert.equal(meta('twitter:image'), image);
    assert.equal(meta('og:image:width'), '1200');
    assert.equal(meta('og:image:height'), '630');
    assert.equal(meta('og:url'), 'https://creatives-takeover.com/profile/javier?card=4');
    assert.match(html, /rel="canonical" href="https:\/\/creatives-takeover.com\/profile\/javier"/);
    assert.doesNotMatch(html, /old\.png|3159|1462/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL; else process.env.VITE_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.VITE_SUPABASE_KEY; else process.env.VITE_SUPABASE_KEY = previousKey;
  }
});
