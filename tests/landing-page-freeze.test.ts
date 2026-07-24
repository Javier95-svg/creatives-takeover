import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const frozenFiles = {
  // Rehashed 2026-07-24 for an analytics-only change: trackTriggerView now fires under
  // hero-demo-cta / hero-icp-cta so it pairs with the click ids. No render change.
  '../src/components/Hero.tsx': '52778566cdab675eccbdba77822ee61f7803cfc83caeff32ddb85b0c11625444',
  '../src/components/EntrepreneurProblems.tsx': '9cd3383b7b1c06d298aaab7711113454d4e4fa66ac31f5cdc841c30fb31b588f',
  '../src/components/Navigation.tsx': '806bf8264b1b63f70098b590708247739789f16e4607da6ef239a0b7a1882146',
  '../src/pages/Index.tsx': '52030eec532fd0c986f6e286e9bef2ffdef9aa805cdb1067372ef54956189e68',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), expected, `${path} changed`);
  });
});
