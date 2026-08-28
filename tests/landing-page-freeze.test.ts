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
  // Rehashed 2026-08-02 for the approved output-led funnel upgrade. The single
  // input now creates a durable, claimable ICP result in place; Product mode
  // auto-starts Demo Studio; and unresolved/off rollout state safely uses the
  // established route handoff. Headline, lede, proof line, and stats are intact.
  '../src/components/Hero.tsx': 'b5be330356a031169f65e47b0fd1e3032d6f1c007e74042f24847a184d437133',
  // Rehashed 2026-07-28 for the performance audit: mobile and desktop journey
  // branches are now mutually exclusive, preventing duplicate 147 MB GIF loads.
  // Content, visual order, actions, and responsive layout remain unchanged.
  // Rehashed 2026-08-25 for the approved copy-only replacement of the Tech
  // Stack row with the MVP Builder offer and its /build destination.
  '../src/components/EntrepreneurProblems.tsx': '6185e02284d0487acb29e5f66b339e6a819ad2672f51d1389cb89ce93b62b2ad',
  // Updated for the canonical core-tool navigation: support tools no longer
  // appear as stage prerequisites, while Stage VII retains its original name
  // and order.
  // Rehashed 2026-08-28 for the approved authenticated-nav regrouping: Podcast
  // and Newspaper now live under Content, while Accelerator Hunt and Tech Stack
  // Builder live under Resources. The signed-out navbar remains unchanged.
  '../src/components/Navigation.tsx': '84b5c09ad4df6bbf0c21da7a32b565eca92900b21cf01a387ce14fa18eda0e8b',
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
  // Rehashed 2026-08-24: the First Customer Sprint pilot announcement moved
  // from the public homepage to the authenticated Command Center, where
  // platform upgrades and founder-accountability work belong.
  '../src/pages/Index.tsx': 'a30910fd67677bb08b01a31a8d820ffa93f608aa6c87a4e80dc71578ba75d8c8',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(source, 'utf8').digest('hex'), expected, `${path} changed`);
  });
});
