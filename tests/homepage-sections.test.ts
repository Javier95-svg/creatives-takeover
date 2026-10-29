import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { HOME_PROOF } from '../src/data/homeProof.ts';
import { HOME_FAQS } from '../src/data/homeFaq.ts';
import { PLAN_PRICING } from '../src/config/pricing.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// Routes a signed-out visitor cannot open. A homepage link to one lands on the
// sign-in screen instead of the page the visitor clicked for.
const SIGNED_IN_ONLY = ['/dashboard', '/files', '/tasks', '/routine', '/settings', '/messages', '/account'];

const HOMEPAGE_SECTIONS = [
  '../src/components/EntrepreneurProblems.tsx',
  '../src/components/UserReviews.tsx',
  '../src/components/ValuePropositionCards.tsx',
  '../src/components/home/EcosystemSection.tsx',
  '../src/components/home/PricingTeaser.tsx',
  '../src/components/home/ProofSection.tsx',
  '../src/components/home/ClosingCta.tsx',
];

// Matches `to: "/x"`, `href: "/x"`, `link: "/x"`, `to="/x"` and `to={"/x"}`.
const linkTo = (route: string) => new RegExp(`\\b(to|href|link)(:\\s*|=\\{?)["'\`]${route}(["'\`/?#])`);

test('the signed-in-only link check catches every way a link is written', () => {
  for (const sample of ['to: "/dashboard",', 'to="/dashboard"', 'href={"/dashboard/referral"}', "link: '/tasks?x=1'"]) {
    assert.ok(SIGNED_IN_ONLY.some((route) => linkTo(route).test(sample)), sample);
  }
  assert.ok(!linkTo('/account').test('to="/accountability"'));
});

test('homepage sections never send visitors to a signed-in-only page', () => {
  for (const file of HOMEPAGE_SECTIONS) {
    const source = read(file);
    for (const route of SIGNED_IN_ONLY) {
      assert.doesNotMatch(source, linkTo(route), `${file} links to ${route}`);
    }
  }
});

test('every stage of the Startup Development Cycle opens its tool', () => {
  const source = read('../src/components/UserReviews.tsx');
  const stages = [...source.matchAll(/shortLabel: "([^"]+)"/g)].map((match) => match[1]);
  const tools = [...source.matchAll(/tool: \{ name: "[^"]+", href: "(\/[^"]+)" \}/g)];
  assert.equal(stages.length, 7);
  assert.equal(tools.length, stages.length);
  assert.doesNotMatch(source, /Phase A \(BizMap AI\)/);
});

test('the pricing teaser quotes /pricing sources, never its own numbers', () => {
  const source = read('../src/components/home/PricingTeaser.tsx');
  assert.match(source, /PLAN_PRICING\[plan\.id\]\.monthly/);
  assert.match(source, /PLAN_PACKAGE_PRESENTATION\[plan\.id\]/);
  for (const { monthly } of Object.values(PLAN_PRICING)) {
    if (monthly > 0) assert.doesNotMatch(source, new RegExp(`\\$${monthly}\\b`));
  }
});

test('the homepage FAQ prices match the pricing config', () => {
  const pricing = HOME_FAQS.find((faq) => faq.question.startsWith('How much does it cost'))!.answer;
  for (const [plan, { monthly, yearly }] of Object.entries(PLAN_PRICING)) {
    if (monthly === 0) continue;
    assert.ok(pricing.includes(`$${monthly}/month or $${yearly}/year`), `${plan} price is out of date`);
  }
  // Plans are sold by the framework they unlock, never by the AI model behind them.
  assert.doesNotMatch(pricing, /AI models|MVP models/);
});

test('proof ships empty until real, permitted quotes exist', () => {
  assert.equal(HOME_PROOF.length, 0);
  assert.match(read('../src/components/home/ProofSection.tsx'), /import\.meta\.env\.DEV/);
});

test('new homepage copy uses no dashes', () => {
  const files = [
    '../src/components/home/EcosystemSection.tsx',
    '../src/components/home/PricingTeaser.tsx',
    '../src/components/home/ClosingCta.tsx',
    '../src/components/home/ProofSection.tsx',
  ];
  for (const file of files) {
    const text = [...read(file).matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1]).join(' ');
    assert.doesNotMatch(text, /—|–| - /, `${file} has a dash in its copy`);
  }
});
