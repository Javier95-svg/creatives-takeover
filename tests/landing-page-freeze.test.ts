import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const frozenFiles = {
  // Rehashed 2026-07-24: hero CTA copy and order changed at the owner's request —
  // "Start my validation sprint" (→ /icp-builder) is now primary, "I already have
  // a live product" (→ /demo-studio/try) secondary. Layout and styling untouched.
  '../src/components/Hero.tsx': 'c7be9482cefa0c8860e21987ae8b52cf6426bd53b7e249696bbe49d7696be23f',
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
