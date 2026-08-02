import test from 'node:test';
import assert from 'node:assert/strict';

import { containsUrl, classifyHeroInput, resolveOutputErrorType } from '../src/lib/heroFunnelRules.ts';

test('a pasted link or bare domain is detected', () => {
  assert.equal(containsUrl('https://acme.io'), true);
  assert.equal(containsUrl('http://acme.io/pricing'), true);
  assert.equal(containsUrl('www.acme.io'), true);
  assert.equal(containsUrl('acme.io'), true);
  assert.equal(containsUrl('check out acme.co.uk for context'), true);
});

// The classifier runs on every submit, so a false positive here would mislabel
// ordinary prose. It only ever sets a property - it never changes the route -
// but a wrong property makes the funnel unreadable.
test('ordinary prose is not mistaken for a URL', () => {
  assert.equal(containsUrl('a CRM for plumbers'), false);
  assert.equal(containsUrl('I am building a tool for freelance designers.'), false);
  assert.equal(containsUrl('It solves scheduling. Then invoicing.'), false);
  assert.equal(containsUrl(''), false);
  assert.equal(containsUrl('   '), false);
});

// Founders describing their stack is a common input in this field, and ".js"
// reads as a TLD to a naive matcher.
test('technology names are not mistaken for domains', () => {
  assert.equal(containsUrl('a testing tool for Node.js teams'), false);
  assert.equal(containsUrl('a Next.js starter kit'), false);
  // ...but an explicit URL always wins, even on a tech-looking host.
  assert.equal(containsUrl('https://next.js'), true);
});

test('every submission routes to ICP regardless of a URL', () => {
  assert.deepEqual(classifyHeroInput('a CRM for plumbers'), { route: 'icp', hasUrl: false });
  assert.deepEqual(classifyHeroInput('https://acme.io'), { route: 'icp', hasUrl: true });
});

test('generation errors collapse into a small queryable set', () => {
  assert.equal(resolveOutputErrorType({ errorCode: 'RATE_LIMITED' }), 'RATE_LIMITED');
  assert.equal(resolveOutputErrorType(new Error('The operation was aborted')), 'TIMEOUT');
  assert.equal(resolveOutputErrorType(new Error('Failed to fetch')), 'NETWORK');
  assert.equal(resolveOutputErrorType(new Error('something odd')), 'UNKNOWN');
  assert.equal(resolveOutputErrorType(null), 'UNKNOWN');
});
