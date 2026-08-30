import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PLAN_PACKAGE_PRESENTATION } from '../src/config/planPackages.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('each plan has one accurate value statement and four plain-language perks', () => {
  assert.equal(PLAN_PACKAGE_PRESENTATION.rookie.valueStatement, 'Start your journey.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.valueStatement, 'Test your assumptions.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.rising.valueStatement, 'Turn evidence into growth.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.pro.valueStatement, 'Execute without limits.');

  for (const plan of Object.values(PLAN_PACKAGE_PRESENTATION)) {
    assert.ok(plan.valueStatement.trim().split(/\s+/).length <= 4);
    assert.ok(plan.perks.length >= 3 && plan.perks.length <= 5);
    assert.equal(plan.perks.length, 4);
    for (const perk of plan.perks) {
      assert.match(perk, /[.!?]$/);
    }
    assert.match(plan.usageLabel, /credits \/ month/);
  }
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.recommended, true);
  assert.equal(Object.values(PLAN_PACKAGE_PRESENTATION).filter((plan) => plan.recommended).length, 1);
  assert.doesNotMatch(
    Object.values(PLAN_PACKAGE_PRESENTATION).flatMap((plan) => plan.perks).join(' '),
    /Email Templates/i,
  );
});

test('pricing keeps the original always-visible comparison layout and five accurate groups', () => {
  const comparison = read('../src/components/PricingComparison.tsx');
  assert.match(comparison, /Compare Our Plans/);
  assert.doesNotMatch(comparison, /Collapsible|Compare all features/);
  for (const category of ['Credits & AI', 'Build & validation', 'Sell & grow', 'Research & fundraising', 'Network & support']) {
    assert.ok(comparison.includes(category));
  }
  assert.match(comparison, /mentor fees separate/i);
});

test('the plan cards do not render a shared-foundation band above them', () => {
  const pricing = read('../src/components/Pricing.tsx');
  assert.doesNotMatch(pricing, /Included with every plan|SHARED_PLAN_FOUNDATION/);
});

test('cards use progressive membership language and only show the credit context chip', () => {
  const pricing = read('../src/components/Pricing.tsx');
  assert.match(pricing, /plan\.usageLabel/);
  assert.doesNotMatch(pricing, /workspaceLabel/);
  assert.match(pricing, /plan\.perksTitle/);
  assert.match(pricing, /plan\.perks\.map/);
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.perksTitle, 'Everything in Rookie, plus:');
  assert.equal(PLAN_PACKAGE_PRESENTATION.rising.perksTitle, 'Everything in Starter, plus:');
  assert.equal(PLAN_PACKAGE_PRESENTATION.pro.perksTitle, 'Everything in Rising, plus:');
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
