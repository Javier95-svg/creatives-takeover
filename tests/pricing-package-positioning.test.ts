import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PLAN_PACKAGE_PRESENTATION, SHARED_PLAN_FOUNDATION } from '../src/config/planPackages.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('each plan has one accurate value statement and exactly three differentiators', () => {
  assert.equal(PLAN_PACKAGE_PRESENTATION.rookie.valueStatement, 'Start building and testing for free.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.valueStatement, 'Validate faster with more runway and deeper research.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.rising.valueStatement, 'Turn evidence into products and customer acquisition.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.pro.valueStatement, 'Maximum execution runway with unlimited research.');

  for (const plan of Object.values(PLAN_PACKAGE_PRESENTATION)) {
    assert.equal(plan.differentiators.length, 3);
  }
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.recommended, true);
  assert.equal(Object.values(PLAN_PACKAGE_PRESENTATION).filter((plan) => plan.recommended).length, 1);
});

test('shared foundation is transparent about mentor marketplace fees', () => {
  assert.ok(SHARED_PLAN_FOUNDATION.some((item) => /mentor marketplace access/i.test(item)));
  assert.ok(SHARED_PLAN_FOUNDATION.some((item) => /paid separately/i.test(item)));
});

test('pricing keeps full details collapsed and uses the five comparison groups', () => {
  const comparison = read('../src/components/PricingComparison.tsx');
  assert.match(comparison, /useState\(false\)/);
  assert.match(comparison, /Compare all features/);
  for (const category of ['Credits & AI', 'Build & validation', 'Sell & grow', 'Research & fundraising', 'Network & support']) {
    assert.ok(comparison.includes(category));
  }
  assert.match(comparison, /mentor fees separate/i);
});

test('pricing-facing copy does not advertise removed Pro promises', () => {
  const sources = [
    read('../src/components/Pricing.tsx'),
    read('../src/components/PricingComparison.tsx'),
    read('../src/components/PricingFAQ.tsx'),
    read('../src/pages/PricingPage.tsx'),
    read('../src/config/planPackages.ts'),
  ].join('\n');

  assert.doesNotMatch(sources, /48 hours|expert accountability|Pro War Room|group office hours/i);
});
