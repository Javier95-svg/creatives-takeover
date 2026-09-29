import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicPlatformBrief } from '../src/lib/publicPlatformFacts.ts';
import { WHO_IS_THIS_FOR_ACCOUNT_TYPES, WHO_IS_THIS_FOR_PROFILES } from '../src/components/whoIsThisForProfiles.ts';
import { PLAN_PRICING } from '../src/config/pricing.ts';

const brief = buildPublicPlatformBrief();

test('the public brief covers every account type and who can join', () => {
  for (const account of WHO_IS_THIS_FOR_ACCOUNT_TYPES) {
    assert.ok(brief.includes(`- ${account.label} ("${account.promise}")`), account.label);
  }
  assert.match(brief, /Mentor[^\n]*invitation/);
  assert.match(brief, /Marketplace[^\n]*invitation/);
  assert.match(brief, /Founder[^\n]*Anyone can join/);
});

test('the public brief lists both founder paths with their tool links', () => {
  for (const profile of WHO_IS_THIS_FOR_PROFILES) {
    assert.ok(brief.includes(profile.headline), profile.id);
    for (const tool of profile.tools) assert.ok(brief.includes(`${tool.name} (${tool.href})`), tool.name);
  }
});

test('the public brief quotes the prices from the pricing config', () => {
  for (const [plan, price] of Object.entries(PLAN_PRICING)) {
    if (price.monthly === 0) continue;
    assert.ok(brief.includes(`$${price.monthly}/month or $${price.yearly}/year`), plan);
  }
  assert.match(brief, /Rookie \(free\)/);
  assert.ok(brief.includes('/pricing'));
});

test('the public brief does not sell the platform as an AI product', () => {
  assert.match(brief, /Do not describe the platform as an AI product/);
  const withoutRules = brief.slice(0, brief.indexOf('How to answer:'));
  assert.doesNotMatch(withoutRules, /\bAI\b/);
});
