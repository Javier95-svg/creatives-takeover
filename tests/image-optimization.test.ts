import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { TARGETS } from '../scripts/optimize-images.mjs';

// scripts/optimize-images.mjs is not part of the build — its outputs are
// committed, so putting sharp's native binary on the deploy critical path would
// cost build time and add a failure mode for no gain. This guard is the reason
// that is safe: it fails when a target has no .webp, or when the source has
// been touched since the .webp was generated. Fix by running:
//
//     npm run images:optimize
//
// It exists because the script sat unused for long enough that /build was
// shipping 1.8MB of raw PNGs and a 888KB logo that never rendered above 48px.
const resolve = (rel: string) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

test('every optimized image target has an up-to-date .webp beside it', () => {
  const stale: string[] = [];
  const missing: string[] = [];

  for (const { input } of TARGETS) {
    const sourcePath = resolve(input);
    const webpPath = resolve(input.replace(/\.(png|jpe?g)$/i, '.webp'));

    let source;
    try {
      source = statSync(sourcePath);
    } catch {
      // A removed source is fine — the target list simply outlived the asset.
      continue;
    }

    let webp;
    try {
      webp = statSync(webpPath);
    } catch {
      missing.push(input);
      continue;
    }

    if (webp.mtimeMs < source.mtimeMs) stale.push(input);
  }

  assert.deepEqual(
    { missing, stale },
    { missing: [], stale: [] },
    'run `npm run images:optimize` to regenerate WebP output'
  );
});

test('no component references a source PNG that has an optimized WebP', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, extname } = await import('node:path');

  const optimized = new Set(
    TARGETS.map(({ input }) => input.split('/').pop()).filter((name): name is string => Boolean(name))
  );

  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!['.ts', '.tsx'].includes(extname(entry.name))) continue;
      const source = readFileSync(full, 'utf8');
      for (const asset of optimized) {
        // ct-logo.png is deliberately unreferenced; only flag assets in use.
        if (source.includes(asset)) offenders.push(`${full} -> ${asset}`);
      }
    }
  };
  walk(resolve('src'));

  assert.deepEqual(offenders, [], 'import the .webp variant instead of the source PNG');
});
