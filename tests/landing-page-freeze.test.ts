import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const frozenFiles = {
  // Rehashed 2026-07-24 (later the same day): the owner asked for the original
  // CTAs back, so b1ce5377's Hero.tsx change was reverted wholesale. Primary is
  // "Have a product? / Launch a live demo" (→ ctaHref, /demo-studio), secondary
  // "Still an idea? / Draft your ICP" (→ /icp-builder). Layout and styling
  // untouched throughout; 133a70f0's activation analytics are retained.
  // Rehashed 2026-07-27: the primary CTAs and hero copy remain unchanged.
  // The small cycle link now opens the approved "Who is this for?" ICP dialog.
  // Rehashed 2026-07-28: removed the decorative arrow from that link.
  // Rehashed 2026-07-28 after restoring Hero byte-for-byte from the repository;
  // the Windows checkout normalized its line endings but changed no source.
  '../src/components/Hero.tsx': '90c6d21009c9d93833a71eed71c878616afe6313a814b841edc37bc9f778ca42',
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
  // Hero/EntrepreneurProblems/Navigation hashes are unchanged.
  //
  // Previous hash (approved homepage restored from 1325b121, the parent of
  // 5dd4dbbb): 20234ac0810e38a9cf7fbc6497bd33ec7d3c1da7fc181d068a00dfe2c8ecb4d0
  '../src/pages/Index.tsx': 'e142b000976a4a4e80aae383fadd76bef4dd573b28af9414725a0152a449dbcb',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), expected, `${path} changed`);
  });
});
