import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicPlatformBrief, extractPublicPulseLinks, PUBLIC_PULSE_LINKS } from '../src/lib/publicPlatformFacts.ts';
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
  const withoutRules = brief.slice(0, brief.indexOf('How to answer'));
  assert.doesNotMatch(withoutRules, /\bAI\b/);
});

test('reply links become at most two cards, only for allowed pages', () => {
  const reply = 'Start with the [ICP Builder](/icp-builder), then [Demo Studio](/demo-studio/try?x=1). See [Pricing](/pricing) or [this](https://evil.example) and [again](/icp-builder).';
  assert.deepEqual(extractPublicPulseLinks(reply).map((link) => link.route), ['/icp-builder', '/demo-studio/try']);
  assert.deepEqual(extractPublicPulseLinks('Try [admin](/admin) or [x](https://x.example)'), []);
  for (const link of PUBLIC_PULSE_LINKS) assert.ok(brief.includes(`[${link.title}](${link.route})`), link.route);
});

test('the public brief asks for short replies with links', () => {
  assert.match(brief, /at most 60 words/);
  assert.match(brief, /1 or 2 markdown links/);
});
