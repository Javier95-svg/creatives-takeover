import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const frozenFiles = {
  '../src/components/Hero.tsx': 'cf950e78ebdc308ce6d020223c43f6095b441039d1caf7f25a08e4b979fccfc7',
  '../src/components/EntrepreneurProblems.tsx': '9cd3383b7b1c06d298aaab7711113454d4e4fa66ac31f5cdc841c30fb31b588f',
  '../src/components/Navigation.tsx': '806bf8264b1b63f70098b590708247739789f16e4607da6ef239a0b7a1882146',
  '../src/pages/Index.tsx': 'e0da4792ea6fa51c92e2bfde12459f76e613fa37720a8002f47fd7d9e80fa486',
} as const;

test('the approved unauthenticated landing page remains frozen during core-tool work', () => {
  Object.entries(frozenFiles).forEach(([path, expected]) => {
    const source = readFileSync(new URL(path, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), expected, `${path} changed`);
  });
});
