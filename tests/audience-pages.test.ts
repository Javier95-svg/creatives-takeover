import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { AUDIENCE_PAGES, INSTITUTION_ORG_TYPES } from '../src/data/audiencePages.ts';
import * as enterprise from '../src/data/enterprisePage.ts';
import { INDEXABLE_ROUTES } from '../scripts/seo-route-config.mjs';

// B2B2C repositioning (2026-10-15): /enterprise for programs, plus founder and
// investor pages. Only Enterprise is in the navbar (2026-10-16).

const app = readFileSync('src/App.tsx', 'utf8');
const navbar = readFileSync('src/components/VisitorNavbar.tsx', 'utf8');
const form = readFileSync('src/components/audience/InstitutionContactForm.tsx', 'utf8');
const enterprisePage = readFileSync('src/pages/Enterprise.tsx', 'utf8');
const pages = [
  ...Object.values(AUDIENCE_PAGES).map((page) => ({ path: page.path, seo: page.seo, copy: JSON.stringify(page) })),
  { path: enterprise.ENTERPRISE_PATH, seo: enterprise.ENTERPRISE_SEO, copy: JSON.stringify(enterprise) },
];

test('each audience page has a route; only Enterprise is in the navbar', () => {
  for (const page of pages) {
    assert.match(app, new RegExp(`<Route path="${page.path}" element=`), `${page.path} route`);
  }
  // The navbar stays short (2026-10-16): its For founders entry (2026-10-17) is
  // a menu of founder tools, not the /for-founders page, and investors wait
  // for case studies.
  assert.equal(enterprise.ENTERPRISE_PATH, '/enterprise');
  assert.match(navbar, /label: "Enterprise", href: "\/enterprise"/);
  assert.doesNotMatch(navbar, /href: "\/for-founders"|href: "\/for-investors"|for-programs/);
});

test('the audience pages are indexable with the same title and description the page renders', () => {
  // The prerendered shell and the React <SEO> must agree, or the page
  // advertises one title to crawlers and another once it hydrates.
  for (const page of pages) {
    const route = INDEXABLE_ROUTES.find((entry: { path: string }) => entry.path === page.path);
    assert.ok(route, `${page.path} must be in INDEXABLE_ROUTES`);
    assert.equal(route.title, page.seo.title, `${page.path} title`);
    assert.equal(route.description, page.seo.description, `${page.path} description`);
    // SEO.tsx truncates beyond these lengths.
    assert.ok(page.seo.title.length <= 60, `${page.path} title is ${page.seo.title.length} chars`);
    assert.ok(page.seo.description.length <= 160, `${page.path} description is ${page.seo.description.length} chars`);
  }
});

test('copy never promises investment or calls the platform an accelerator to founders', () => {
  const founders = JSON.stringify(AUDIENCE_PAGES.founders);
  assert.doesNotMatch(founders, /accelerator program|our accelerator|guaranteed|get funded/i);
  for (const page of pages) {
    assert.doesNotMatch(page.copy, /from idea to launch|step by step|No cohort/i, page.path);
  }
  assert.match(AUDIENCE_PAGES.founders.trust.body, /can’t promise investment/);
  assert.match(AUDIENCE_PAGES.investors.trust.body, /opt-in/);
});

test('cohort prices stay off the public pages', () => {
  for (const page of pages) assert.doesNotMatch(page.copy, /\$\s?\d/, page.path);
});

test('the enterprise page lands the pilot offer in the hero', () => {
  // Programs should get the offer without scrolling (2026-10-16): the 30-day
  // pilot, its terms at a glance, a way to talk to us, and the pilot itself.
  assert.deepEqual(
    enterprise.ENTERPRISE_HERO.facts.map((fact) => fact.label),
    ['day pilot', 'startups', 'check-ins', 'cohort report'],
  );
  const heroStart = enterprisePage.indexOf('className="ent-hero"');
  const hero = enterprisePage.slice(heroStart, enterprisePage.indexOf('</section>', heroStart));
  for (const piece of ['ENTERPRISE_HERO.titleLead', 'ENTERPRISE_HERO.lede', 'ENTERPRISE_HERO.facts', 'ENTERPRISE_HERO.primaryCta', '<CycleStrip', '<PilotBoardMock />']) {
    assert.ok(hero.includes(piece), `hero is missing ${piece}`);
  }
});

test('the pilot promises a process and evidence, and adapts to each program', () => {
  // Thirty days can't prove product-market fit, so the page says so instead of
  // implying it. The steps and the scope explain the pilot (2026-10-23); the
  // separate outcomes section was removed as redundant.
  assert.equal('ENTERPRISE_OUTCOMES' in enterprise, false);
  assert.doesNotMatch(enterprisePage, /ENTERPRISE_OUTCOMES/);
  assert.match(enterprise.ENTERPRISE_PILOT.honesty, /won’t prove product-market fit/);
  assert.doesNotMatch(JSON.stringify(enterprise), /guaranteed|get funded|achieve product-market fit/i);
  // Programs differ in size, founder focus and length.
  assert.deepEqual(
    enterprise.ENTERPRISE_ADAPT.items.map((item) => item.key),
    ['size', 'focus', 'length'],
  );
  assert.match(JSON.stringify(enterprise.ENTERPRISE_ADAPT), /[Ff]intech/);
});

test('the institution form reuses the contact function with known roles', () => {
  assert.match(form, /functions\.invoke\("contact-form-submission"/);
  assert.match(form, /reason = "partnership"/);
  for (const option of INSTITUTION_ORG_TYPES) assert.match(option.role, /^[a-z_]+$/);
  // Enterprise and investors get the form; founders get a sign-up CTA instead.
  assert.match(enterprisePage, /<InstitutionContactForm\s+audience="enterprise"/);
  assert.ok(AUDIENCE_PAGES.investors.contact);
  assert.equal(AUDIENCE_PAGES.founders.contact, undefined);
});

test('the pilot is explained step by step, with who does the work and its scope', () => {
  // A program manager follows the pilot from setup to after day 30
  // (2026-10-23), each step owned by someone so their team's time is clear.
  assert.deepEqual(
    enterprise.ENTERPRISE_PILOT.steps.map((step) => step.key),
    ['setup', 'join', 'work', 'track', 'weekly', 'report', 'after'],
  );
  for (const step of enterprise.ENTERPRISE_PILOT.steps) {
    assert.ok(['Our team', 'Your team', 'Your founders', 'Automatic'].includes(step.owner), step.key);
    if ('visual' in step && step.visual) assert.match(enterprisePage, new RegExp(`\\b${step.visual}: \\(`), `${step.key} has a screen`);
  }
  // Each screen is the real product, captured light and dark.
  for (const asset of ['cohort-join', 'cohort-founder', 'cohort-program']) {
    assert.match(enterprisePage, new RegExp(`@/assets/enterprise/${asset}\.webp`));
    assert.match(enterprisePage, new RegExp(`@/assets/enterprise/${asset}-light\.webp`));
  }
  // What the program can't see or expect is said plainly, next to what it gets.
  const scope = JSON.stringify(enterprise.ENTERPRISE_SCOPE);
  assert.ok(enterprise.ENTERPRISE_SCOPE.included.length >= 5);
  // Plain words for program directors (2026-10-24): no internal plan or feature names.
  assert.match(scope, /at no cost to them/);
  assert.doesNotMatch(JSON.stringify(enterprise), /Rising plan|First Customer Proof|Startup Development Cycle/);
  assert.match(scope, /Files, idea details and messages stay private/);
  assert.match(scope, /only if its founder agrees/);
  assert.match(scope, /won’t prove product-market fit/);
  assert.match(enterprisePage, /ENTERPRISE_SCOPE\.excluded\.map/);
  // The pilot's conditions for both sides (2026-10-24).
  assert.match(enterprisePage, /ENTERPRISE_CONDITIONS\.program/);
  assert.match(enterprisePage, /ENTERPRISE_CONDITIONS\.startups/);
  assert.ok(enterprise.ENTERPRISE_CONDITIONS.program.items.some((item) => /kickoff/.test(item.title)));
  // Few rules for founders (2026-10-24): three asks, consent included.
  assert.ok(enterprise.ENTERPRISE_CONDITIONS.startups.items.length <= 3);
  assert.match(JSON.stringify(enterprise.ENTERPRISE_CONDITIONS.startups), /progress is shared with your program/);
  assert.match(JSON.stringify(enterprise.ENTERPRISE_CONDITIONS.startups), /can stop at any time/);
});
