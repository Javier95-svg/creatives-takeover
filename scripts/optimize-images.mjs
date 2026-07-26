/**
 * Image optimization: converts heavy PNG/JPEG assets to WebP, keeping the
 * originals as fallback. Idempotent — a target whose .webp is newer than its
 * source is skipped, so re-running is cheap.
 *
 * Outputs are committed, so this does NOT run during the build (that would put
 * sharp's native binary on the deploy critical path for no gain). Instead
 * tests/image-optimization.test.ts fails if a target is missing a .webp or the
 * source has been touched since — run this script when that test goes red.
 *
 * Usage: npm run images:optimize
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export const TARGETS = [
  // public/mvp-builder-showcase/ — the /build carousel. Rendered in a 620px-wide
  // aspect-[16/10] slot, so the native 1282px width is kept for 2x screens; the
  // win here is purely the PNG → WebP format change.
  { input: 'public/mvp-builder-showcase/ironlog.png',         quality: 80 },
  { input: 'public/mvp-builder-showcase/linguaexpat.png',     quality: 80 },
  { input: 'public/mvp-builder-showcase/sentrynest.png',      quality: 80 },
  { input: 'public/mvp-builder-showcase/shiftcode.png',       quality: 80 },
  { input: 'public/mvp-builder-showcase/sora-botanicals.png', quality: 80 },
  { input: 'public/mvp-builder-showcase/steeped.png',         quality: 80 },
  // 1024x1024 mark shipped at 888KB but never rendered larger than 48px
  // (h-12 w-12 in MVPBuilderPreview, h-8 w-8 in MVPBuilderChat). 256px covers
  // 48px at 3x DPR with headroom.
  { input: 'src/assets/ct-brand-logo.png',               quality: 85, resize: 256 },
  // src/assets/ — imported via Vite, large PNGs
  { input: 'src/assets/ct-logo.png',                     quality: 80 },
  { input: 'src/assets/ct-logo-polished-borders.png',    quality: 80 },
  { input: 'src/assets/team-javier-pena.png',            quality: 82 },
  { input: 'src/assets/team-domagoj-markota.png',        quality: 82 },
  { input: 'src/assets/team-daniela-hagg.png',           quality: 82 },
  { input: 'src/assets/team-aamir-khan.png',             quality: 82 },
  { input: 'src/assets/team-tyler-tennant.png',          quality: 82 },
  // public/auth/ — referenced by string URL in Login/Signup
  { input: 'public/auth/solopreneur-female.png',                  quality: 80 },
  { input: 'public/auth/creatives-takeover-polished-borders.png', quality: 80 },
  { input: 'public/auth/signup-founder-hero.png',                 quality: 80 },
  { input: 'public/auth/creatives-takeover-circle.png',           quality: 80 },
];

async function convertToWebP({ input, quality, resize }) {
  const inputPath = path.join(ROOT, input);
  const outputPath = inputPath.replace(/\.(png|jpe?g)$/i, '.webp');

  try {
    await fs.access(inputPath);
  } catch {
    console.warn(`  SKIP  ${input} (not found)`);
    return;
  }

  const statBefore = await fs.stat(inputPath);

  // Idempotent: leave an output that already reflects the current source.
  const existing = await fs.stat(outputPath).catch(() => null);
  if (existing && existing.mtimeMs >= statBefore.mtimeMs) {
    console.log(`  --  ${path.relative(ROOT, outputPath)} (up to date)`);
    return;
  }

  // Imported lazily so the module can be imported for TARGETS alone (by the
  // freshness test) without requiring sharp's native binary.
  const { default: sharp } = await import('sharp');
  const pipeline = sharp(inputPath);
  if (resize) pipeline.resize(resize, resize, { fit: 'inside', withoutEnlargement: true });
  await pipeline.webp({ quality }).toFile(outputPath);
  const statAfter = await fs.stat(outputPath);

  const savingKB = ((statBefore.size - statAfter.size) / 1024).toFixed(0);
  const pct = ((1 - statAfter.size / statBefore.size) * 100).toFixed(0);
  console.log(`  OK  ${path.relative(ROOT, outputPath)}  (${(statBefore.size / 1024).toFixed(0)} KB → ${(statAfter.size / 1024).toFixed(0)} KB, -${pct}% / -${savingKB} KB)`);
}

// Only convert when run directly. tests/image-optimization.test.ts imports
// TARGETS to check freshness, and must not pull in sharp or touch any file.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log('Converting images to WebP…\n');
  for (const target of TARGETS) {
    await convertToWebP(target);
  }
  console.log('\nDone. Update imports from .png → .webp where applicable.');
}
