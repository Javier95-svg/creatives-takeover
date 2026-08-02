import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Hashes are taken over LF-normalised bytes, not raw bytes. This repo runs with
// core.autocrlf=true and no .gitattributes, so a Windows checkout can hold CRLF
// (Hero.tsx and Index.tsx currently hold a mix of both) while Linux CI holds
// pure LF. A raw-byte pin therefore cannot match in both places at once, and the
// pin silently drifts from the committed content. Normalising first makes the
// hash equal to the git blob hash in every environment.
const frozenFiles = {
  // Rehashed 2026-08-01 for the approved hero single-input rebuild. The two CTA
  // buttons ("Define ideal customer" / "Launch a live demo") are replaced by one
  // textarea plus one submit, which generates an ICP draft in place - no
  // navigation, no account. Headline, lede, proof line, the dashboard spotlight
  // and the stats strip are unchanged.
  '../src/components/Hero.tsx': '1dabce0e33ec16c37ca7e2634827ab3d836fd3d758d7eb403dcf8b09c7201de9',
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
  // Rehashed 2026-08-01: Hero no longer takes a ctaHref prop, so both mount
  // sites drop it. Section order and content are unchanged.
  '../src/pages/Index.tsx': 'b01c42308490bc9096edba8642b717f09716f7944a648caa43d48773df60c36d',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(source, 'utf8').digest('hex'), expected, `${path} changed`);
  });
});
