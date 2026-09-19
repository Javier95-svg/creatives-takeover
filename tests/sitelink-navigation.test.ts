import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { INDEXABLE_ROUTES } from '../scripts/seo-route-config.mjs';

const script = readFileSync('scripts/generate-prerendered-pages.mjs', 'utf8');

/** The five routes, in the order they should be offered to Google. */
const WANTED = [
  ['/demo', 'Tour'],
  ['/build', 'Build'],
  ['/mentorship', 'Collab'],
  ['/about', 'About'],
  ['/pricing', 'Pricing'],
] as const;

test('the five sitelink routes are declared in order', () => {
  const table = script.slice(script.indexOf('const SITELINK_NAV = ['), script.indexOf('];', script.indexOf('const SITELINK_NAV = [')));
  const entries = [...table.matchAll(/\{ href: "([^"]+)", label: "([^"]+)" \}/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(entries, WANTED.map(([href, label]) => [href, label]));
});

test('every sitelink route is indexable and prerendered', () => {
  // A nav slot pointing at a route that is not prerendered resolves to the SPA
  // catch-all and self-canonicalises to the homepage, which is worse than not
  // linking it at all.
  const indexable = new Set(INDEXABLE_ROUTES.map((route: { path: string }) => route.path));
  for (const [href] of WANTED) {
    assert.ok(indexable.has(href), `${href} must be in INDEXABLE_ROUTES`);
  }
});

test('the sitewide nav leads with them, because order is the signal', () => {
  const table = script.slice(script.indexOf('const PRIMARY_NAV = ['), script.indexOf('];', script.indexOf('const PRIMARY_NAV = [')));
  assert.match(table, /\{ href: "\/", label: "Home" \},\s*\n\s*\.\.\.SITELINK_NAV,/);
});

test('the navigation markup is emitted, and the homepage keeps its own block', () => {
  // Sitelinks are chosen by Google, so this markup is a hint rather than a
  // setting. Losing the homepage's WebSite block to gain it would be a bad
  // trade: that block is what carries the site name in the result.
  assert.match(script, /"@type": "SiteNavigationElement"/);
  assert.match(script, /const data = \[ORGANIZATION_SCHEMA, \.\.\.SITE_NAVIGATION_SCHEMA\];/);
  assert.match(script, /if \(routeConfig\.path === "\/"\) return "append-site-navigation";/);
  assert.match(script, /if \(data === "append-site-navigation"\)/);
});

test('the built homepage carries both blocks with the five entries in order', { skip: !existsSync('dist/index.html') }, () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(blocks.length, 2, 'the template block plus the navigation block');
  const parsed = blocks.flatMap((block) => JSON.parse(block));
  const nav = parsed.filter((entry: { '@type'?: string }) => entry['@type'] === 'SiteNavigationElement');
  assert.deepEqual(
    nav.map((entry: { position: number; name: string; url: string }) => [entry.position, entry.name, entry.url]),
    WANTED.map(([href, label], index) => [index + 1, label, `https://creatives-takeover.com${href}`]),
  );
  // The site-name markup must survive, or the result loses its title treatment.
  assert.match(html, /"@type": "WebSite"/);
});
