import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// Unknown URLs used to answer 200 with the app shell (a soft 404), so crawlers,
// AI ones included, stored error pages as real content. The SPA rewrite is now an
// allowlist of the app's top-level route segments; anything else falls through
// to dist/404.html, which boots the same app (NotFound renders) with a 404
// status. A route missing from the allowlist still renders for people but
// answers 404, which drops it from search, so this test pins the two together.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const vercel = JSON.parse(read('vercel.json')) as {
  rewrites: Array<{ source: string; destination: string; has?: unknown }>;
};
const spaRule = vercel.rewrites.find((rule) => rule.destination === '/app-shell.html' && rule.source.startsWith('/((?:'));
const spaPattern = spaRule ? new RegExp(`^${spaRule.source}$`) : null;
const allowlisted = new Set(spaRule?.source.match(/^\/\(\(\?:([^)]+)\)/)?.[1].split('|') ?? []);

// Prerendered as static files in dist/, so they need no rewrite: /startup-pedia and
// every entry. An unknown entry slug must 404 rather than render the app shell.
const SERVED_AS_FILES = new Set(['startup-pedia']);

const appSegments = () => {
  const app = read('src/App.tsx');
  const paths = [...app.matchAll(/<Route\b[^>]*?\bpath="([^"]+)"/gs)].map((match) => match[1]);
  return new Set(paths.filter((path) => path.startsWith('/')).map((path) => path.split('/')[1]).filter(Boolean));
};

test('the SPA rewrite is an allowlist, not a catch-all', () => {
  assert.ok(spaRule, 'expected a /((?:segment|...)(?:/.*)?) rewrite to /app-shell.html');
  assert.equal(vercel.rewrites.some((rule) => rule.source === '/((?!assets/).*)'), false);
});

test('every top-level app route is allowlisted', () => {
  const missing = [...appSegments()].filter((segment) => !allowlisted.has(segment) && !SERVED_AS_FILES.has(segment));
  assert.deepEqual(missing, [], `add these App.tsx route segments to the vercel.json SPA rewrite: ${missing.join(', ')}`);
});

test('no app route is a top-level parameter the allowlist cannot express', () => {
  const app = read('src/App.tsx');
  assert.doesNotMatch(app, /<Route\b[^>]*?\bpath="\/:/s);
});

test('unknown paths, assets and well-known files fall through to a real 404', () => {
  assert.ok(spaPattern);
  for (const path of ['/dashboard', '/dashboard/files', '/mvp-builder', '/about/', '/profile/javier', '/newspaper/rss.xml']) {
    assert.match(path, spaPattern, path);
  }
  for (const path of ['/this-page-does-not-exist', '/aboutx', '/assets/index.abc.js', '/.well-known/security.txt', '/wp-login.php', '/startup-pedia/not-an-entry']) {
    assert.doesNotMatch(path, spaPattern, path);
  }
});

test('Startup Pedia topics that are not prerendered still reach the app', () => {
  assert.ok(vercel.rewrites.some((rule) => rule.source === '/startup-pedia/topics/:topic' && rule.destination === '/app-shell.html'));
});

test('the 404 page boots the app and is never indexed', async () => {
  const { renderNotFoundPage } = await import('../scripts/generate-prerendered-pages.mjs');
  const page = renderNotFoundPage(read('index.html'));
  assert.match(page, /<meta name="robots" content="noindex" \/>/);
  assert.match(page, /<div id="root"><\/div>/);
  assert.match(page, /<script type="module"/);
  assert.doesNotMatch(page, /rel="canonical"/);
});

test('the build guard fails on an inline script the CSP has no hash for', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { verifyServingBuild } = await import('../scripts/verify-seo-build.mjs');
  const config = JSON.parse(read('vercel.json'));
  const dist = mkdtempSync(join(tmpdir(), 'csp-'));
  writeFileSync(join(dist, 'index.html'), read('index.html'));
  writeFileSync(join(dist, '404.html'), '<html><head><meta name="robots" content="noindex" /></head></html>');
  assert.deepEqual(verifyServingBuild({ distDir: dist, vercelConfig: config }), []);

  writeFileSync(join(dist, 'index.html'), `${read('index.html')}<script>window.x = 1</script><button onclick="go()">x</button>`);
  const problems = verifyServingBuild({ distDir: dist, vercelConfig: config });
  assert.equal(problems.length, 2, problems.join('\n'));
});

test('only the MVP Builder and published sites keep unsafe-inline and unsafe-eval', () => {
  const config = JSON.parse(read('vercel.json')) as { headers: Array<{ source: string; has?: unknown; headers: Array<{ key: string; value: string }> }> };
  const loose = config.headers
    .filter((rule) => rule.headers.some((header) => header.key === 'Content-Security-Policy' && /'unsafe-eval'/.test(header.value)))
    .map((rule) => rule.source);
  assert.deepEqual(loose, ['/mvp-builder', '/mvp-builder/:path*', '/:path*']);
  const published = config.headers.find((rule) => rule.source === '/:path*');
  assert.match(JSON.stringify(published?.has), /creatives-takeover/);
  assert.match(read('src/pages/AppBuilderPage.tsx'), /window\.location\.reload\(\)/);
});

test('security.txt is served as a real file with a contact and a future expiry', () => {
  const file = read('public/.well-known/security.txt');
  assert.match(file, /^Contact: mailto:\S+@creatives-takeover\.com$/m);
  const expires = Date.parse(file.match(/^Expires: (\S+)$/m)?.[1] ?? '');
  assert.ok(expires - Date.now() > 30 * 24 * 60 * 60 * 1000, 'security.txt expires within 30 days; push the Expires date out a year');
});
