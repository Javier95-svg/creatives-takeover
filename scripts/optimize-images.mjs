/**
 * One-time image optimization script.
 * Converts heavy PNG/JPEG assets to WebP, keeping originals as fallback.
 *
 * Usage: node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TARGETS = [
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

async function convertToWebP({ input, quality }) {
  const inputPath = path.join(ROOT, input);
  const outputPath = inputPath.replace(/\.(png|jpe?g)$/i, '.webp');

  try {
    await fs.access(inputPath);
  } catch {
    console.warn(`  SKIP  ${input} (not found)`);
    return;
  }

  const statBefore = await fs.stat(inputPath);
  await sharp(inputPath).webp({ quality }).toFile(outputPath);
  const statAfter = await fs.stat(outputPath);

  const savingKB = ((statBefore.size - statAfter.size) / 1024).toFixed(0);
  const pct = ((1 - statAfter.size / statBefore.size) * 100).toFixed(0);
  console.log(`  OK  ${path.relative(ROOT, outputPath)}  (${(statBefore.size / 1024).toFixed(0)} KB → ${(statAfter.size / 1024).toFixed(0)} KB, -${pct}% / -${savingKB} KB)`);
}

console.log('Converting images to WebP…\n');
for (const target of TARGETS) {
  await convertToWebP(target);
}
console.log('\nDone. Update imports from .png → .webp where applicable.');
