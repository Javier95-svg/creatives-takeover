import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FAKE_VALUE_TRAP_GUIDE,
  FAKE_VALUE_TRAPS,
  normalizeFakeValueFlags,
  parseLenientJson,
} from '../supabase/functions/_shared/fake-value.ts';
import { FAKE_VALUE_TRAP_LABELS, readFakeValueFlags } from '../src/lib/fakeValue.ts';

/**
 * GTM Strategist and Demo Studio both flag claims that sound like reasons to
 * buy but are not (how it is made, what every option does, a bolted-on feature,
 * company values, an unbacked promise). The server cleans the model's flags and
 * the browser renders them; both must agree on what a valid flag is.
 */

test('only well-formed flags with a known trap survive, without repeats', () => {
  const flags = normalizeFakeValueFlags([
    { text: 'AI-powered matching', trap: 'process', fix: 'Say what the match saves them.' },
    { text: 'ai-powered matching', trap: 'process', fix: 'Duplicate.' },
    { text: 'Easy to use', trap: 'category_generic', fix: 'Name what only you do.' },
    { text: 'We care about creators', trap: 'shared_values', fix: '' },
    { text: 'Fastest on the market', trap: 'hype', fix: 'Prove it.' },
    'not an object',
  ]);
  assert.deepEqual(flags.map((flag) => flag.trap), ['process', 'category_generic']);
  assert.deepEqual(normalizeFakeValueFlags(undefined), []);
});

test('flags are capped so a noisy answer cannot bury the plan', () => {
  const many = Array.from({ length: 10 }, (_, index) => ({ text: `claim ${index}`, trap: 'messaging_only', fix: 'f' }));
  assert.equal(normalizeFakeValueFlags(many).length, 6);
});

test('the browser accepts exactly what the server produces', () => {
  const produced = normalizeFakeValueFlags(FAKE_VALUE_TRAPS.map((trap) => ({ text: `t-${trap}`, trap, fix: 'f' })));
  assert.deepEqual(readFakeValueFlags(produced), produced);
  assert.deepEqual(Object.keys(FAKE_VALUE_TRAP_LABELS).sort(), [...FAKE_VALUE_TRAPS].sort());
  assert.deepEqual(readFakeValueFlags([{ text: 'x', trap: 'unknown', fix: 'y' }, null]), []);
});

test('the prompt guide names every trap', () => {
  for (const trap of FAKE_VALUE_TRAPS) assert.match(FAKE_VALUE_TRAP_GUIDE, new RegExp(`${trap}:`));
});

test('a trailing comma no longer fails a whole plan', () => {
  assert.deepEqual(parseLenientJson('{"a":[1,2,],"b":{"c":1,},}'), { a: [1, 2], b: { c: 1 } });
  assert.throws(() => parseLenientJson('{"a":'));
});

test('both generators run the check and keep its output', () => {
  const gtm = readFileSync('supabase/functions/gtm-analyzer/index.ts', 'utf8');
  assert.match(gtm, /\$\{FAKE_VALUE_TRAP_GUIDE\}/);
  assert.match(gtm, /fakeValueFlags: normalizeFakeValueFlags\(strategic\.fakeValueFlags\)/);
  const demo = readFileSync('supabase/functions/demo-studio-generator/index.ts', 'utf8');
  assert.match(demo, /\$\{FAKE_VALUE_TRAP_GUIDE\}/);
  assert.match(demo, /fakeValueFlags: normalizeFakeValueFlags\(generated\?\.fakeValueFlags\)/);
});
