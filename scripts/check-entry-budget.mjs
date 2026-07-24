import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * Startup performance budget. Fails the build when the synchronous entry
 * graph — the JS a first-time visitor must download before React can render
 * anything — grows past the budget, or when a known-heavy chunk sneaks back
 * into it (the jsPDF preload-helper regression cost ~140KB gz for months
 * before it was noticed; this makes that class of regression loud).
 */
const DIST_DIR = path.resolve(process.cwd(), "dist");
const INDEX_PATH = path.join(DIST_DIR, "index.html");

// Measured ~330KB gz after the July 2026 perf passes. Headroom allows normal
// drift; a breach means something heavy joined the startup path — split it
// out instead of raising the budget.
const BUDGET_GZIP_BYTES = 400 * 1024;

// Chunks that must never be in the entry graph: on-demand document tooling
// and the deferred analytics SDKs.
const FORBIDDEN_ENTRY_CHUNKS = /document-tools-|vendor-amplitude-|vendor-jspdf|vendor-pdfjs|vendor-html2canvas/;

const html = fs.readFileSync(INDEX_PATH, "utf8");

const entryFiles = [
  ...[...html.matchAll(/<script type="module"[^>]*src="([^"]+\.js)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/<link rel="modulepreload"[^>]*href="([^"]+\.js)"/g)].map((m) => m[1]),
];

if (entryFiles.length === 0) {
  console.error("check-entry-budget: no entry scripts found in dist/index.html — run vite build first.");
  process.exit(1);
}

const forbidden = entryFiles.filter((file) => FORBIDDEN_ENTRY_CHUNKS.test(file));
if (forbidden.length > 0) {
  console.error(
    `check-entry-budget: forbidden chunk(s) in the startup path:\n  ${forbidden.join("\n  ")}\n` +
      "These must load on demand. Look for a new static import chain (or a mis-chunked shared helper) pulling them into the entry graph."
  );
  process.exit(1);
}

let totalGzip = 0;
const rows = entryFiles
  .map((file) => {
    const gz = zlib.gzipSync(fs.readFileSync(path.join(DIST_DIR, file.replace(/^\//, "")))).length;
    totalGzip += gz;
    return { file, gz };
  })
  .sort((a, b) => b.gz - a.gz);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;
console.log(`Entry graph: ${entryFiles.length} files, ${kb(totalGzip)} gzip (budget ${kb(BUDGET_GZIP_BYTES)})`);
for (const row of rows.slice(0, 8)) {
  console.log(`  ${kb(row.gz).padStart(8)}  ${row.file}`);
}

if (totalGzip > BUDGET_GZIP_BYTES) {
  console.error(
    `check-entry-budget: startup JS is ${kb(totalGzip)} gzip, over the ${kb(BUDGET_GZIP_BYTES)} budget. ` +
      "Split the newly added weight out of the synchronous path (lazy import / manualChunks) rather than raising the budget."
  );
  process.exit(1);
}
