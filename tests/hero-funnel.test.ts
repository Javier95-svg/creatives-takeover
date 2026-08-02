import test from 'node:test';
import assert from 'node:assert/strict';

import {
  containsUrl,
  classifyHeroInput,
  resolveOutputErrorType,
  HERO_MODES,
  DEFAULT_HERO_MODE,
} from '../src/lib/heroFunnelRules.ts';

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

// The visitor's chosen mode decides the route. A URL in the text is recorded as
// demand signal for Demo Studio but never overrides the choice - guessing on
// their behalf is what the two-CTA hero did wrong.
test('the selected mode decides the route, not the text', () => {
  assert.deepEqual(classifyHeroInput('a CRM for plumbers', 'idea'), { route: 'icp', hasUrl: false });
  assert.deepEqual(classifyHeroInput('https://acme.io', 'idea'), { route: 'icp', hasUrl: true });
  assert.deepEqual(classifyHeroInput('a CRM for plumbers', 'product'), { route: 'demo', hasUrl: false });
  assert.deepEqual(classifyHeroInput('https://acme.io', 'product'), { route: 'demo', hasUrl: true });
});

test('Idea is preselected so nobody has to choose before typing', () => {
  assert.equal(DEFAULT_HERO_MODE, 'idea');
  assert.equal(HERO_MODES[DEFAULT_HERO_MODE].route, 'icp');
});

// The question, the button and the destination have to agree. A button reading
// "Launch a live demo" that produced a customer profile is the broken promise
// this rebuild exists to remove.
test('each mode pairs its question, CTA and destination coherently', () => {
  assert.equal(HERO_MODES.idea.question, 'Who’s your ideal customer?');
  assert.equal(HERO_MODES.idea.cta, 'Define ICP');
  assert.equal(HERO_MODES.idea.route, 'icp');

  assert.equal(HERO_MODES.product.question, 'What are you building?');
  assert.equal(HERO_MODES.product.cta, 'Launch a live demo');
  assert.equal(HERO_MODES.product.route, 'demo');
});

// The typing animation cycles these. A full loop is roughly 15s per prompt, so
// five carries a visitor well past the point where they have decided what to
// write without ever repeating.
test('each mode offers five distinct placeholder examples', () => {
  for (const [name, config] of Object.entries(HERO_MODES)) {
    assert.equal(config.placeholders.length, 5, `${name} should have 5 placeholders`);
    assert.equal(
      new Set(config.placeholders).size,
      5,
      `${name} placeholders should all be distinct`,
    );
    config.placeholders.forEach((placeholder) => {
      assert.ok(placeholder.trim().length > 0, `${name} placeholder must not be blank`);
      // They are typed into a field the visitor then edits, so they must read
      // as something a founder would actually write - not "e.g. ..." prefixed.
      assert.doesNotMatch(placeholder, /^e\.g\./i, `${name} placeholder should not be prefixed`);
    });
  }
});

test('generation errors collapse into a small queryable set', () => {
  assert.equal(resolveOutputErrorType({ errorCode: 'RATE_LIMITED' }), 'RATE_LIMITED');
  assert.equal(resolveOutputErrorType(new Error('The operation was aborted')), 'TIMEOUT');
  assert.equal(resolveOutputErrorType(new Error('Failed to fetch')), 'NETWORK');
  assert.equal(resolveOutputErrorType(new Error('something odd')), 'UNKNOWN');
  assert.equal(resolveOutputErrorType(null), 'UNKNOWN');
});
