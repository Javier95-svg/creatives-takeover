import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Minimal browser globals for the helper.
const store = new Map<string, string>();
let reloads = 0;
Object.assign(globalThis, {
  sessionStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } },
  window: { location: { reload: () => { reloads += 1; } } },
});
const { isStaleChunkError, reloadForStaleChunk } = await import('../src/lib/staleChunkReload.ts');

test('recognises stale-build load failures across browsers, and nothing else', () => {
  assert.ok(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://creatives-takeover.com/assets/PlatformTour.CDLvjnJF.js')));
  assert.ok(isStaleChunkError(new TypeError('error loading dynamically imported module')));
  assert.ok(isStaleChunkError(new TypeError('Importing a module script failed.')));
  assert.equal(isStaleChunkError(new Error('Cannot read properties of undefined')), false);
});

test('reloads once, then leaves repeat failures within a minute to the error screen', () => {
  const error = new TypeError('Failed to fetch dynamically imported module: /assets/x.js');
  assert.equal(reloadForStaleChunk(error, 1_000_000), true);
  assert.equal(reloadForStaleChunk(error, 1_030_000), false);
  assert.equal(reloadForStaleChunk(error, 1_070_000), true);
  assert.equal(reloadForStaleChunk(new Error('ordinary bug'), 2_000_000), false);
  assert.equal(reloads, 2);
});

test('a missing /assets file is a 404, not the app shell served as HTML', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const fallback = config.rewrites.at(-1);
  assert.equal(fallback.destination, '/app-shell.html');
  assert.equal(fallback.source, '/((?!assets/).*)');
});
