import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

// Google showed /about instead of the homepage for "creatives takeover" because
// every URL without its own prerendered shell (77 app routes, plus any typo)
// answered 200 with the homepage HTML: its title, h1, WebSite markup and
// canonical="/". These tests keep the SPA fallback from posing as the homepage.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('every SPA rewrite serves the neutral app shell, never the homepage file', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const spaRewrites = vercel.rewrites.filter((rule: { destination: string }) => rule.destination.endsWith('.html') && !rule.destination.includes('/', 1));
  assert.ok(spaRewrites.length >= 3);
  for (const rule of spaRewrites) assert.equal(rule.destination, '/app-shell.html', rule.source);
  assert.equal(vercel.rewrites.at(-1).source, '/((?!assets/).*)');
});

test('the app shell drops everything that claims a specific page', async () => {
  const { renderAppShell } = await import('../scripts/generate-prerendered-pages.mjs');
  const template = read('index.html');
  assert.match(template, /rel="canonical"/);
  const shell = renderAppShell(template);
  assert.doesNotMatch(shell, /rel="canonical"/);
  assert.doesNotMatch(shell, /application\/ld\+json/);
  assert.doesNotMatch(shell, /og:url|name="description"/);
  assert.doesNotMatch(shell, /<h1/);
  assert.match(shell, /<title>Creatives Takeover<\/title>/);
  assert.match(shell, /<main id="seo-fallback"><\/main>/);
  assert.match(shell, /<div id="root"><\/div>/);
  assert.match(shell, /<script type="module"/);
});

test('the built shell exists next to the homepage and differs from it', { skip: !existsSync('dist/app-shell.html') }, () => {
  const shell = read('dist/app-shell.html');
  const home = read('dist/index.html');
  assert.doesNotMatch(shell, /rel="canonical"/);
  assert.match(home, /<link rel="canonical" href="https:\/\/creatives-takeover\.com\/" \/>/);
  assert.match(home, /"@type": ?"WebSite"/);
});

test('the pages sitemap lists the most important pages first; the index does not change every deploy', async () => {
  const { orderedRoutes, generateSitemapIndexXml } = await import('../scripts/generate-seo-assets.mjs');
  const ordered = orderedRoutes();
  assert.equal(ordered[0].path, '/');
  for (let i = 1; i < ordered.length; i += 1) assert.ok(ordered[i - 1].priority >= ordered[i].priority);
  const index = generateSitemapIndexXml();
  assert.doesNotMatch(index, /T\d\d:\d\d/);
  assert.equal(index, generateSitemapIndexXml());
  assert.match(index, /sitemap-pages\.xml<\/loc>\n    <lastmod>\d{4}-\d\d-\d\d<\/lastmod>/);
  const pages = read('public/sitemap-pages.xml');
  assert.ok(pages.indexOf('<loc>https://creatives-takeover.com/</loc>') < pages.indexOf('<loc>https://creatives-takeover.com/pricing</loc>'));
});

test('the build guard fails a deploy that brings the homepage fallback back', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { verifySeoBuild } = await import('../scripts/verify-seo-build.mjs');
  const page = (canonical: string, title: string, website = false) =>
    `<html><head><title>${title}</title><link rel="canonical" href="${canonical}" />${website ? '<script type="application/ld+json">{"@type": "WebSite"}</script>' : ''}</head><body><h1>${title}</h1></body></html>`;
  const routes = [{ path: '/', title: 'Home' }, { path: '/about', title: 'About' }];
  const build = (shell: string, rewrite: string) => {
    const dist = mkdtempSync(join(tmpdir(), 'seo-'));
    writeFileSync(join(dist, 'index.html'), page('https://creatives-takeover.com/', 'Home', true));
    mkdirSync(join(dist, 'about'));
    writeFileSync(join(dist, 'about', 'index.html'), page('https://creatives-takeover.com/about', 'About'));
    writeFileSync(join(dist, 'app-shell.html'), shell);
    writeFileSync(join(dist, 'sitemap.xml'), '<sitemapindex><sitemap><lastmod>2026-07-01</lastmod></sitemap></sitemapindex>');
    return verifySeoBuild({ distDir: dist, routes, vercelConfig: { rewrites: [{ source: '/((?!assets/).*)', destination: rewrite }] } });
  };
  assert.deepEqual(build('<html><head><title>Creatives Takeover</title></head><body><div id="root"></div></body></html>', '/app-shell.html'), []);
  // The old setup: the fallback is the homepage.
  const broken = build(page('https://creatives-takeover.com/', 'Home', true), '/index.html');
  assert.equal(broken.length, 4);
  assert.match(broken.join('\n'), /app-shell\.html has canonical/);
  assert.match(broken.join('\n'), /rewrite .* -> \/index\.html/);
});
