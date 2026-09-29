import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPublicPlatformBrief, extractPublicPulseLinks, findPublicPulseQuestion, publicPulseFollowUps,
  PUBLIC_PULSE_LINKS, PUBLIC_PULSE_QUESTIONS, PUBLIC_PULSE_STARTERS,
} from '../src/lib/publicPlatformFacts.ts';
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

test('tool cards go through the guest quiz and pick the right account type', () => {
  const icp = PUBLIC_PULSE_LINKS.find((link) => link.route === '/icp-builder')!;
  assert.equal(icp.destination, '/start?return=%2Ficp-builder');
  assert.equal(icp.accountType, 'builder');
  assert.equal(PUBLIC_PULSE_LINKS.find((link) => link.route === '/traction-engine')!.accountType, 'founder');
  assert.equal(PUBLIC_PULSE_LINKS.find((link) => link.route === '/pricing')!.destination, '/pricing');
});

test('every written answer is short, links an allowed page, and avoids AI-first copy', () => {
  for (const question of PUBLIC_PULSE_QUESTIONS) {
    assert.ok(question.answer.split(/\s+/).length <= 70, question.id);
    assert.ok(extractPublicPulseLinks(question.answer).length >= 1, question.id);
    assert.doesNotMatch(question.answer, /\bAI\b/, question.id);
  }
  const cost = PUBLIC_PULSE_QUESTIONS.find((question) => question.id === 'cost')!.answer;
  for (const [plan, price] of Object.entries(PLAN_PRICING)) if (price.monthly > 0) assert.ok(cost.includes(`$${price.monthly}/month`), plan);
});

test('starters come first, then up to two questions not asked yet', () => {
  assert.equal(PUBLIC_PULSE_STARTERS.length, 4);
  assert.equal(findPublicPulseQuestion('  is it free? what does it cost? ')?.id, 'cost');
  assert.deepEqual(publicPulseFollowUps(['I have an idea. Where do I start?']), ['How do I get started?', 'Is it free? What does it cost?']);
  assert.deepEqual(publicPulseFollowUps(['How do I get started?', 'Is it free? What does it cost?', 'something typed']), ['I have an idea. Where do I start?', 'I already have a product. How can it help?']);
});
