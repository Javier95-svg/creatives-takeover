import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PLAN_PACKAGE_PRESENTATION } from '../src/config/planPackages.ts';
import { MONTHLY_FREE_QUOTAS } from '../src/config/planPermissions.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const words = (text: string) => text.trim().split(/\s+/).length;

// Outcome first (2026-10-17): each card says what the plan gets a founder done,
// then at most three short unlocks backed by entitlements.
test('each plan leads with a short outcome and at most three short unlocks', () => {
  assert.equal(PLAN_PACKAGE_PRESENTATION.rookie.outcome, 'Know who your customer is.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.outcome, 'Prove people want it.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.rising.outcome, 'Build it and reach your first buyers.');
  assert.equal(PLAN_PACKAGE_PRESENTATION.pro.outcome, 'Build at full pace and research freely.');

  for (const plan of Object.values(PLAN_PACKAGE_PRESENTATION)) {
    assert.ok(words(plan.outcome) <= 8, plan.outcome);
    assert.ok(words(plan.bestFor) <= 4, plan.bestFor);
    assert.ok(words(plan.outcomeDetail) <= 16, plan.outcomeDetail);
    assert.ok(plan.perks.length >= 1 && plan.perks.length <= 3);
    for (const perk of plan.perks) assert.ok(words(perk) <= 10, perk);
    assert.match(plan.usageLabel, /credits \/ month/);
  }
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.recommended, true);
  assert.equal(Object.values(PLAN_PACKAGE_PRESENTATION).filter((plan) => plan.recommended).length, 1);
  // Outcomes describe what a plan lets you do, never a promised result.
  assert.doesNotMatch(JSON.stringify(PLAN_PACKAGE_PRESENTATION), /guarantee|get funded|raise money|investment/i);
});

test('unlock numbers come from the quotas the product enforces', () => {
  const starter = PLAN_PACKAGE_PRESENTATION.starter.perks.join(' ');
  const rising = PLAN_PACKAGE_PRESENTATION.rising.perks.join(' ');
  assert.ok(starter.includes(`${MONTHLY_FREE_QUOTAS.vc_profiles.starter} investor and ${MONTHLY_FREE_QUOTAS.accelerator_profiles.starter} accelerator`));
  assert.ok(rising.includes(`${MONTHLY_FREE_QUOTAS.directory_visits.rising} directory visits`));
  // Every plan can publish a demand page, so it is not sold as a Starter unlock.
  assert.doesNotMatch(starter, /demand/i);
  // The credits section once said Starter gets 2 profile views; the quota is 5.
  const credits = read('../src/components/SubscriptionFeatures.tsx');
  assert.doesNotMatch(credits, /2 profile views/);
  assert.match(credits, /CREDIT_COSTS\.PITCH_DECK_ANALYZER/);
});

test('pricing keeps the always-visible comparison with five groups and an every-plan list', () => {
  const comparison = read('../src/components/PricingComparison.tsx');
  assert.match(comparison, /Compare plans/);
  assert.doesNotMatch(comparison, /Collapsible|Compare all features/);
  for (const category of ['Credits & AI', 'Build & validation', 'Sell & grow', 'Research & fundraising', 'Network & support']) {
    assert.ok(comparison.includes(category));
  }
  assert.match(comparison, /mentor fees separate/i);
  assert.match(comparison, /Included on every plan/);
  assert.match(comparison, /isSameOnEveryPlan/);
  // Internal workspace names mean nothing to a visitor.
  assert.doesNotMatch(comparison, /PROVE workspace|SELL \+ GROW workspace/);
});

test('the plan cards do not render a shared-foundation band above them', () => {
  const pricing = read('../src/components/Pricing.tsx');
  assert.doesNotMatch(pricing, /Included with every plan|SHARED_PLAN_FOUNDATION/);
});

test('cards are neutral with one highlight and compute the yearly maths', () => {
  const pricing = read('../src/components/Pricing.tsx');
  assert.match(pricing, /plan\.outcome/);
  assert.match(pricing, /plan\.bestFor/);
  assert.match(pricing, /plan\.usageLabel/);
  assert.doesNotMatch(pricing, /workspaceLabel/);
  assert.match(pricing, /plan\.perksTitle/);
  assert.match(pricing, /plan\.perks\.map/);
  assert.equal(PLAN_PACKAGE_PRESENTATION.starter.perksTitle, 'Everything in Rookie, plus:');
  assert.equal(PLAN_PACKAGE_PRESENTATION.rising.perksTitle, 'Everything in Starter, plus:');
  assert.equal(PLAN_PACKAGE_PRESENTATION.pro.perksTitle, 'Everything in Rising, plus:');
  // One calm style: no per-tier button colours, and a written "Recommended" label.
  assert.doesNotMatch(pricing, /bg-success text-success-foreground|bg-warning text-warning-foreground|bg-destructive text-destructive-foreground/);
  assert.match(pricing, />\s*Recommended\s*</);
  // Savings and yearly equivalents come from PLAN_PRICING, not typed strings.
  assert.match(pricing, /yearlySavingsPercent/);
  assert.doesNotMatch(pricing, /"Save \d+%"|"\$\d+\.\d{2}\/mo"/);
  assert.match(pricing, /Secure checkout by Stripe/);
});

test('the FAQ matches the Terms, invents no seats and has no fake voting', () => {
  const faq = read('../src/components/PricingFAQ.tsx');
  assert.doesNotMatch(faq, /standard refund policy/i);
  assert.match(faq, /to: "\/terms"/);
  assert.doesNotMatch(faq, /seat/i);
  assert.doesNotMatch(faq, /helpfulVotes|Was this helpful/);
  // Prices and credit counts are built from config.
  assert.match(faq, /PLAN_PRICING/);
  assert.match(faq, /PLAN_MONTHLY_CREDITS/);
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
