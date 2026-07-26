import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// The July 2026 audit found four internal links pointing at routes that do not
// exist — including a dashboard "View booking" button that dropped paying users
// on the 404 page, and two chatbot quick actions. All four were invisible to CI.
//
// This parses the route table out of App.tsx and checks every statically
// written internal target against it. It caught all four in under a second.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = path.join(ROOT, 'src');

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const loadRoutes = (): string[] => {
  const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
  const declared = [...app.matchAll(/<Route\s+[^>]*?path="([^"]+)"/g)].map((m) => m[1]);

  // Children of the /dashboard element route are declared with relative paths.
  const dashboardStart = app.indexOf('path="/dashboard"');
  const dashboardBlock =
    dashboardStart === -1 ? '' : app.slice(dashboardStart, app.indexOf('</Route>', dashboardStart));
  const nested = new Set(
    [...dashboardBlock.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => !p.startsWith('/'))
  );

  const routes = new Set<string>(['/dashboard']);
  for (const route of declared) {
    if (route.startsWith('/')) routes.add(route);
    else if (nested.has(route)) routes.add(`/dashboard/${route}`);
  }
  return [...routes];
};

const matchesRoute = (target: string, routes: string[]): boolean => {
  const clean = target.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  return routes.some((route) => {
    if (route === '*') return false;
    const candidate = route.replace(/\/$/, '') || '/';
    if (candidate === clean) return true;
    if (candidate.endsWith('/*')) {
      const base = candidate.slice(0, -2);
      return clean === base || clean.startsWith(`${base}/`);
    }
    const routeParts = candidate.split('/');
    const targetParts = clean.split('/');
    if (routeParts.length !== targetParts.length) return false;
    return routeParts.every((part, index) => part.startsWith(':') || part === targetParts[index]);
  });
};

// Statically written internal destinations. Template literals containing an
// interpolation are skipped — their base path cannot be checked reliably.
const TARGET_PATTERNS = [
  /\bto=\{?["'`](\/[^"'`{}\s]*)["'`]/g,
  /\bhref=\{?["'`](\/[^"'`{}\s]*)["'`]/g,
  /navigate\(\s*["'`](\/[^"'`{}\s]*)["'`]/g,
  /window\.location\.(?:href|assign|replace)\s*(?:=|\(\s*)["'`](\/[^"'`{}\s]*)["'`]/g,
  /\b(?:route|url|link|target|href|to|destination|path|resumeUrl|destinationRoute)\s*:\s*["'`](\/[^"'`{}\s]*)["'`]/g,
];

// Non-route paths that legitimately appear as internal URLs.
const NON_ROUTE_PREFIXES = ['/api/', '/assets/', '/auth/', '/mvp-builder-showcase/', '/functions/'];
const ASSET_EXTENSION = /\.(png|jpe?g|svg|webp|gif|ico|css|js|json|xml|txt|pdf|mp4|webm|woff2?)$/i;

test('every statically written internal link points at a declared route', () => {
  const routes = loadRoutes();
  assert.ok(routes.length > 50, `expected a populated route table, parsed ${routes.length}`);

  const broken = new Map<string, Set<string>>();
  for (const file of collectSourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of TARGET_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        const target = match[1];
        if (!target.startsWith('/') || target.startsWith('//')) continue;
        if (ASSET_EXTENSION.test(target)) continue;
        if (NON_ROUTE_PREFIXES.some((prefix) => target.startsWith(prefix))) continue;
        if (matchesRoute(target, routes)) continue;

        const line = source.slice(0, match.index).split('\n').length;
        const ref = `${path.relative(ROOT, file).replace(/\\/g, '/')}:${line}`;
        broken.set(target, (broken.get(target) ?? new Set()).add(ref));
      }
    }
  }

  const report = [...broken.entries()].map(([target, refs]) => `${target} <- ${[...refs].join(', ')}`);
  assert.deepEqual(report, [], 'these internal links match no route in App.tsx and will render the 404 page');
});
