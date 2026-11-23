import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  EMPTY_APPLICATION,
  SERVICES_BY_FOCUS,
  STEP_IDS,
  buildApplicationMessage,
  companyLabel,
  firstName,
  stepError,
  type PartnerApplication,
} from '../src/lib/marketplacePartnerApplication.ts';

// The Marketplace partner questionnaire (/marketplace/join, 2026-11-23): eight
// personalised questions whose answers are emailed to admin@ and javier@
// through contact-form-submission.

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const complete: PartnerApplication = {
  ...EMPTY_APPLICATION,
  name: 'Ana López',
  company: 'Northlight Labs',
  website: 'northlight.example',
  focus: 'tech_support',
  services: ['MVP and product builds', 'UI/UX design'],
  stages: ['building', 'first_customers'],
  startModel: 'project',
  startBudget: '5k_15k',
  deck: 'yes',
  deckUrl: 'https://docsend.com/view/abc',
  email: 'ana@northlight.example',
  note: 'We work in Spanish and English.',
};

test('the questionnaire has eight questions and a complete answer passes every one', () => {
  assert.equal(STEP_IDS.length, 8);
  for (const step of STEP_IDS) assert.equal(stepError(step, complete), null, step);
});

test('questions are personalised with the first name and the company', () => {
  assert.equal(firstName('  Ana   López '), 'Ana');
  assert.equal(companyLabel('Northlight Labs'), 'Northlight Labs');
  assert.equal(companyLabel('  '), 'your company');
  const page = read('src/pages/community/MarketplaceJoin.tsx');
  assert.match(page, /Nice to meet you, \$\{first\}/);
  assert.match(page, /What does \$\{company\} mainly help founders with\?/);
  assert.match(page, /Thanks, \{first\}\. \{company\}'s application is in\./);
});

test('services follow the focus picked before them', () => {
  for (const focus of ['tech_support', 'sales', 'marketing', 'ops'] as const) {
    assert.ok(SERVICES_BY_FOCUS[focus].length >= 4, focus);
  }
  assert.deepEqual(SERVICES_BY_FOCUS.other, []);
  // "Something else" has no list, so a written description is enough.
  assert.equal(stepError('services', { ...complete, focus: 'other', services: [], servicesOther: 'Legal support' }), null);
  assert.ok(stepError('services', { ...complete, services: [], servicesOther: '' }));
});

test('required answers and links are checked before moving on', () => {
  assert.ok(stepError('name', { ...complete, name: 'A' }));
  assert.ok(stepError('company', { ...complete, website: 'not a site' }));
  assert.equal(stepError('company', { ...complete, website: '' }), null);
  assert.ok(stepError('focus', { ...complete, focus: 'other', focusOther: '' }));
  assert.ok(stepError('start', { ...complete, startBudget: '' }));
  assert.ok(stepError('deck', { ...complete, deck: 'yes', deckUrl: '' }));
  assert.equal(stepError('deck', { ...complete, deck: 'not_yet', deckUrl: '' }), null);
  assert.ok(stepError('email', { ...complete, email: 'ana@' }));
});

test('the email to the team carries every answer, labelled', () => {
  const message = buildApplicationMessage(complete, '/marketplace/join');
  assert.match(message, /^MARKETPLACE PARTNER APPLICATION/);
  for (const line of [
    'Company: Northlight Labs',
    'Website: northlight.example',
    'Main focus: Tech Support',
    'Services: MVP and product builds, UI/UX design',
    'Best-fit founders: Building an MVP, First customers',
    'How founders usually start: Fixed-price project',
    'Typical starting budget: $5,000 – $15,000',
    'Pitch deck: Yes: https://docsend.com/view/abc',
    'Anything else: We work in Spanish and English.',
    'Sent from: /marketplace/join',
  ]) {
    assert.ok(message.includes(line), line);
  }
  assert.ok(message.length < 5000, 'contact-form-submission keeps the first 5,000 characters');
});

test('applications post to contact-form-submission, which emails admin@ and javier@', () => {
  const page = read('src/pages/community/MarketplaceJoin.tsx');
  assert.match(page, /functions\.invoke\("contact-form-submission"/);
  assert.match(page, /role: "partner"/);
  assert.match(page, /reason: "Marketplace partner application"/);
  const fn = read('supabase/functions/contact-form-submission/index.ts');
  assert.match(fn, /admin@creatives-takeover\.com/);
  assert.match(fn, /javier@creatives-takeover\.com/);
});

test('/marketplace links the questionnaire and emails the team for feedback', () => {
  const hub = read('src/pages/community/ServiceMarketplaceHub.tsx');
  assert.match(hub, /const PARTNER_APPLY_PATH = "\/marketplace\/join"/);
  assert.match(hub, /Apply to join <ArrowRight/);
  assert.match(hub, /mailto:admin@creatives-takeover\.com/);
  const app = read('src/App.tsx');
  assert.match(app, /<Route path="\/marketplace\/join" element=\{<MarketplaceJoin \/>\} \/>/);
  // /marketplace/:slug goes to the public-entity API on Vercel, so /join needs its own rewrite before it.
  const vercel = read('vercel.json');
  assert.ok(vercel.indexOf('"/marketplace/join"') > -1 && vercel.indexOf('"/marketplace/join"') < vercel.indexOf('"/marketplace/:slug"'));
});
