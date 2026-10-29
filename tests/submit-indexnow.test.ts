import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { childSitemaps, recentlyChangedUrls } from '../scripts/submit-indexnow.mjs';

test('only pages changed on or after the cutoff are submitted, and only our own', () => {
  const xml = `<urlset>
    <url><loc>https://creatives-takeover.com/startup-pedia/new</loc><lastmod>2026-10-29</lastmod></url>
    <url><loc>https://creatives-takeover.com/startup-pedia/old</loc><lastmod>2026-10-25</lastmod></url>
    <url><loc>https://creatives-takeover.com/no-date</loc></url>
    <url><loc>https://example.com/elsewhere</loc><lastmod>2026-10-29</lastmod></url>
    <url><loc>https://creatives-takeover.com/newspaper/story</loc><lastmod>2026-10-28T10:00:00Z</lastmod></url>
  </urlset>`;
  assert.deepEqual(recentlyChangedUrls(xml, '2026-10-27'), [
    'https://creatives-takeover.com/startup-pedia/new',
    'https://creatives-takeover.com/newspaper/story',
  ]);
});

test('the sitemap index lists every child sitemap', () => {
  const index = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(childSitemaps(index).includes('https://creatives-takeover.com/sitemap-pages.xml'));
});

test('the submission uses the key file the site serves', async () => {
  const { INDEXNOW_KEY } = await import('../api/indexnow.ts');
  assert.equal(readFileSync(new URL(`../public/${INDEXNOW_KEY}.txt`, import.meta.url), 'utf8').trim(), INDEXNOW_KEY);
});
