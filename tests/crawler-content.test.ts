import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const captured = JSON.parse(read('scripts/crawler-content.json')) as Record<string, string>;

test('every captured page is listed in the capture spec and is a prerendered route', async () => {
  const { INDEXABLE_ROUTES } = await import('../scripts/seo-route-config.mjs');
  const prerendered = new Set(INDEXABLE_ROUTES.map((route: { path: string }) => route.path));
  const listed = read('e2e/crawler-content.spec.ts').match(/CRAWLER_CONTENT_ROUTES = \[([\s\S]*?)\]/)![1].match(/'[^']+'/g)!.map((item) => item.slice(1, -1));
  assert.deepEqual(Object.keys(captured), listed, 'run npm run seo:crawler-content');
  for (const path of listed) assert.ok(prerendered.has(path), `${path} has no prerendered shell, so its capture would never be served`);
});

test('a captured page serves its real copy to crawlers, with one h1, and keeps the site links', async () => {
  const { renderRoute } = await import('../scripts/generate-prerendered-pages.mjs');
  const { INDEXABLE_ROUTES } = await import('../scripts/seo-route-config.mjs');
  for (const path of Object.keys(captured)) {
    const route = INDEXABLE_ROUTES.find((item: { path: string }) => item.path === path);
    const html = renderRoute(read('index.html'), route);
    const fallback = html.match(/<main id="seo-fallback">([\s\S]*?)<\/main>/)![1];
    const firstLine = captured[path].split('\n').find((line) => !line.startsWith('<ul') && !line.startsWith('</ul'))!;
    assert.ok(fallback.includes(firstLine.trim()), `${path} fallback is missing its captured copy`);
    assert.equal((fallback.match(/<h1>/g) ?? []).length, 1, `${path} should have exactly one h1`);
    assert.match(fallback, /<nav aria-label="Site directory">/);
  }
});

test('the homepage tells crawlers what Creatives Takeover is, not just its menu', () => {
  assert.match(captured['/'], /<h3>What is Creatives Takeover\?<\/h3>\n<p>Creatives Takeover is a SaaS platform/);
});
