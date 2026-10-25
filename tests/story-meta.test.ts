import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openingText, stripEmoji, truncateAtWord } from '../src/utils/storyMeta.ts';

const shellHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Creatives Takeover</title>
    <meta name="description" content="Generic site description." />
    <link rel="canonical" href="https://creatives-takeover.com/" />
  </head>
  <body><main id="seo-fallback"></main><div id="root"></div></body>
</html>`;

const body = [
  'ByteDance built two short-video platforms. Douyin launched in September 2016, built for mainland China.',
  '',
  '### A heading the snippet skips',
  '',
  'TikTok followed a year later, in **September 2017**, built for [everyone else](https://example.com).',
  '',
  'A third paragraph that is never reached.',
].join('\n');

test('openingText joins the first paragraphs as plain text and skips headings', () => {
  assert.equal(
    openingText(body),
    'ByteDance built two short-video platforms. Douyin launched in September 2016, built for mainland China. TikTok followed a year later, in September 2017, built for everyone else.',
  );
  assert.equal(openingText(null), '');
});

test('truncateAtWord cuts on a word boundary within the limit', () => {
  const cut = truncateAtWord(openingText(body), 160);
  assert.ok(cut.length <= 160);
  assert.match(cut, /\w\.\.\.$/);
  assert.equal(truncateAtWord('Short.', 160), 'Short.');
});

test('stripEmoji removes trailing emoji from headlines', () => {
  assert.equal(stripEmoji('How Spotify Built a Billion-Dollar Empire 🎵'), 'How Spotify Built a Billion-Dollar Empire');
});

test('api/newspaper-og.ts keeps its copies of the helpers identical to src/utils/storyMeta.ts', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const api = read('../api/newspaper-og.ts');
  const src = read('../src/utils/storyMeta.ts');
  const bodyOf = (code: string, name: string) => {
    const start = code.search(new RegExp(`(function|const) ${name}\\b`));
    assert.ok(start >= 0, `${name} missing`);
    const fromParams = code.slice(code.indexOf('(', start));
    const end = fromParams.search(/\n(\}|export |function |const |\/\/)/);
    return fromParams.slice(0, end).trim();
  };
  for (const name of ['openingText', 'truncateAtWord', 'stripEmoji']) {
    assert.equal(bodyOf(api, name), bodyOf(src, name), `${name} drifted`);
  }
});

test('article meta uses the opening paragraphs when the excerpt is a short teaser', async (t) => {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_KEY = 'test-anon-key';
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input) => {
    const url = input.toString();
    if (url.endsWith('/index.html')) return new Response(shellHtml, { status: 200 });
    return Response.json([
      {
        slug: 'douyin-vs-tiktok',
        title: 'Douyin vs. TikTok: The App China Built for Its Own Kids 🚀',
        banner_image_url: null,
        excerpt: 'A tale of two algorithms.',
        meta_title: null,
        meta_description: null,
        hashtags: ['#digitalculture'],
        published_at: '2026-06-09T12:00:00.000Z',
        updated_at: '2026-06-09T12:00:00.000Z',
        body_content: body,
      },
    ]);
  };

  const { default: handler } = await import('../api/newspaper-og.ts');
  const html = await (await handler(new Request('https://creatives-takeover.com/api/newspaper-og?slug=douyin-vs-tiktok'))).text();

  assert.match(html, /<title>Douyin vs\. TikTok: The App China Built for Its Own Kids \| Creatives Takeover<\/title>/);
  assert.match(html, /<meta name="description" content="ByteDance built two short-video platforms\. Douyin launched in September 2016/);
  assert.doesNotMatch(html, /Learn about|digitalculture \|/);
});

test('slugs with stray backticks redirect to the clean article URL', async () => {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_KEY = 'test-anon-key';
  const { default: handler } = await import('../api/newspaper-og.ts');
  const response = await handler(
    new Request('https://creatives-takeover.com/api/newspaper-og?slug=%60founder-fomo-trap-pre-seed%60'),
  );
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://creatives-takeover.com/newspaper/founder-fomo-trap-pre-seed');
});
