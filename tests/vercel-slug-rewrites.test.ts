import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

type Rewrite = { source: string; destination: string };

// Vercel applies rewrites in order. "/marketplace/:slug" sends any one-segment
// path under /marketplace to the public service page lookup, so an app page
// such as /marketplace/enquiries got the server's "Page not found" (found on
// 2026-10-30) unless an app-shell rewrite for it comes first, the way
// /mentorship/progress and /mentorship/my-bookings already did.
test('app pages under a :slug rewrite are served the app before the slug lookup', () => {
  const rewrites = (JSON.parse(read('../vercel.json')) as { rewrites: Rewrite[] }).rewrites;
  const app = read('../src/App.tsx');
  const appPaths = [...app.matchAll(/path="(\/[^"]+)"/g)].map((match) => match[1]);

  const slugRules = rewrites
    .map((rule, index) => ({ ...rule, index }))
    .filter((rule) => /^\/[a-z-]+\/:slug$/.test(rule.source) && rule.destination.startsWith('/api/'));
  assert.ok(slugRules.length > 0);

  for (const rule of slugRules) {
    const prefix = rule.source.replace('/:slug', '');
    const clashing = appPaths.filter((path) => new RegExp(`^${prefix}/[^/:*]+$`).test(path));
    for (const path of clashing) {
      // Reserved names the API itself hands back to the app are fine too.
      if (path.endsWith('.xml')) continue;
      const exception = rewrites.findIndex((r) => r.source === path && r.destination === '/app-shell.html');
      assert.ok(exception >= 0 && exception < rule.index, `${path} needs an app-shell rewrite before ${rule.source}`);
    }
  }
});
