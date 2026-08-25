import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST_DIR = join(process.cwd(), 'dist');
const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
const assetPaths = [
  ...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/g),
].map((match) => match[1]);

const assets = assetPaths.map((assetPath) => {
  const filePath = join(DIST_DIR, assetPath.replace(/^\//, ''));
  const contents = readFileSync(filePath);
  return {
    asset: assetPath,
    rawBytes: statSync(filePath).size,
    gzipBytes: gzipSync(contents).length,
  };
});

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
  // Keep the shell below the audited 328KB gzip baseline. New dependencies
  // must earn their way into the first-load path instead of silently growing it.
  initialJsRequests: 6,
  initialGzipBytes: 340 * 1024,
  entryRawBytes: 140 * 1024,
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

console.log(JSON.stringify({
  initialJsRequests: jsAssets.length,
  initialAssetRequests: assets.length,
  initialRawBytes: totals.rawBytes,
  initialGzipBytes: totals.gzipBytes,
  entryRawBytes: entry?.rawBytes ?? null,
  budgets,
  assets,
}, null, 2));

if (failures.length > 0) {
  console.error(`Initial bundle budget failed: ${failures.join('; ')}`);
  process.exitCode = 1;
}
