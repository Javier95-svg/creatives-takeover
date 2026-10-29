import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST_DIR = join(process.cwd(), 'dist');
const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
// The homepage also preloads its own route chunks (data-route-preload="home",
// added by generate-prerendered-pages.mjs). They are budgeted separately: the
// shell budget below is what every page pays.
const tags = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)].map((match) => match[0]);
const assetOf = (tag) => tag.match(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/)?.[1];
const assetPaths = tags.filter((tag) => !tag.includes('data-route-preload')).map(assetOf).filter(Boolean);
const routePreloadPaths = tags.filter((tag) => tag.includes('data-route-preload')).map(assetOf).filter(Boolean);

const measure = (assetPath) => {
  const filePath = join(DIST_DIR, assetPath.replace(/^\//, ''));
  const contents = readFileSync(filePath);
  return {
    asset: assetPath,
    rawBytes: statSync(filePath).size,
    gzipBytes: gzipSync(contents).length,
  };
};
const assets = assetPaths.map(measure);
const routePreloads = routePreloadPaths.map(measure);
const routePreloadGzipBytes = routePreloads.reduce((sum, asset) => sum + asset.gzipBytes, 0);

const jsAssets = assets.filter(({ asset }) => asset.endsWith('.js'));
const entry = jsAssets.find(({ asset }) => /\/index\.[^/]+\.js$/.test(asset));
const totals = assets.reduce(
  (sum, asset) => ({
    rawBytes: sum.rawBytes + asset.rawBytes,
    gzipBytes: sum.gzipBytes + asset.gzipBytes,
  }),
  { rawBytes: 0, gzipBytes: 0 },
);

const budgets = {
  // New dependencies must earn their way into the first-load path instead of
  // silently growing it. Re-set 2026-10-28 after the readiness audit: icons and
  // Radix moved out of the app-wide ui-foundation/radix-ui chunks, so the shell
  // fell from 358KB to ~302KB gz in 5 requests. The entry is larger (~196KB raw)
  // because the shell's own icons and tooltip now live in it instead of in
  // those chunks.
  initialJsRequests: 6,
  initialGzipBytes: 315 * 1024,
  entryRawBytes: 205 * 1024,
  homeRoutePreloadGzipBytes: 120 * 1024,
};

const failures = [];
if (jsAssets.length > budgets.initialJsRequests) {
  failures.push(`initial JS requests ${jsAssets.length} exceed ${budgets.initialJsRequests}`);
}
if (totals.gzipBytes > budgets.initialGzipBytes) {
  failures.push(`initial gzip bytes ${totals.gzipBytes} exceed ${budgets.initialGzipBytes}`);
}
if (!entry) {
  failures.push('entry JavaScript asset was not found');
} else if (entry.rawBytes > budgets.entryRawBytes) {
  failures.push(`entry raw bytes ${entry.rawBytes} exceed ${budgets.entryRawBytes}`);
}
if (routePreloadGzipBytes > budgets.homeRoutePreloadGzipBytes) {
  failures.push(`homepage route preloads ${routePreloadGzipBytes} gzip bytes exceed ${budgets.homeRoutePreloadGzipBytes}`);
}

console.log(JSON.stringify({
  initialJsRequests: jsAssets.length,
  initialAssetRequests: assets.length,
  initialRawBytes: totals.rawBytes,
  initialGzipBytes: totals.gzipBytes,
  entryRawBytes: entry?.rawBytes ?? null,
  homeRoutePreloadGzipBytes: routePreloadGzipBytes,
  budgets,
  assets,
  routePreloads,
}, null, 2));

if (failures.length > 0) {
  console.error(`Initial bundle budget failed: ${failures.join('; ')}`);
  process.exitCode = 1;
}
