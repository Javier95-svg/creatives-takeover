import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const frozenFiles = {
  // Rehashed 2026-07-28 for the approved CTA simplification: ICP remains the
  // outcome-led primary path and Demo Studio the product-ready secondary path,
  // while the supporting microcopy beneath both actions has been removed.
  '../src/components/Hero.tsx': 'c21d2adac83ef57d3f5e28aa7a3dc9ba916c4ac179eea5e4df4ba7cf5d56e39b',
  // Rehashed 2026-07-28 for the performance audit: mobile and desktop journey
  // branches are now mutually exclusive, preventing duplicate 147 MB GIF loads.
  // Content, visual order, actions, and responsive layout remain unchanged.
  '../src/components/EntrepreneurProblems.tsx': '82ef110ab254c5dc9e459afe5368761668c8d8fcfb6b1d076231f11ad03cf19d',
  '../src/components/Navigation.tsx': '806bf8264b1b63f70098b590708247739789f16e4607da6ef239a0b7a1882146',
  // Re-pinned 2026-07-25 (delivery audit, Phase 1): AISpecializationTrends moved
  // from a static import to lazy() + Suspense, matching how HomeFAQ and
  // FounderAnswerLibraryTeaser are already loaded. It is the only homepage
  // section using Recharts, and as a static import it pulled ~77KB gz of
  // charting into the fold-blocking bundle for a section far below the fold.
  //
  // Load timing only — no section added, removed, reordered, restyled or
  // re-copied. The Suspense fallback reserves the section's measured rendered
  // height (969px at 390px wide, 753px at lg) so the swap shifts nothing.
  // Hero/EntrepreneurProblems/Navigation hashes were unchanged at that
  // performance checkpoint.
  //
  // Previous hash (approved homepage restored from 1325b121, the parent of
  // 5dd4dbbb): 20234ac0810e38a9cf7fbc6497bd33ec7d3c1da7fc181d068a00dfe2c8ecb4d0
  // Rehashed 2026-07-28 for the approved homepage wallpaper redesign: Index
  // opts into the landing-only gradient while section order stays unchanged.
  '../src/pages/Index.tsx': 'da2cf00c370d9e05954b83dcfc7d6516171a3f8b14a1925a4b3bb9d98a150dad',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), expected, `${path} changed`);
  });
});
