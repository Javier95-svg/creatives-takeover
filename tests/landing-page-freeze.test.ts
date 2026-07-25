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
  '../src/components/Hero.tsx': '52778566cdab675eccbdba77822ee61f7803cfc83caeff32ddb85b0c11625444',
  '../src/components/EntrepreneurProblems.tsx': '9cd3383b7b1c06d298aaab7711113454d4e4fa66ac31f5cdc841c30fb31b588f',
  '../src/components/Navigation.tsx': '806bf8264b1b63f70098b590708247739789f16e4607da6ef239a0b7a1882146',
  // Re-pinned 2026-07-24 (later the same day): the previous hash matched no
  // commit in history — it was generated against uncommitted local edits, so
  // the guard was protecting a state that never shipped. This hash is the
  // approved homepage restored from 1325b121 (the parent of 5dd4dbbb, which
  // had replaced Hero/EntrepreneurProblems/UserReviews/AISpecializationTrends/
  // ValuePropositionCards/HomeFAQ with a flat Card layout).
  '../src/pages/Index.tsx': '20234ac0810e38a9cf7fbc6497bd33ec7d3c1da7fc181d068a00dfe2c8ecb4d0',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), expected, `${path} changed`);
  });
});
