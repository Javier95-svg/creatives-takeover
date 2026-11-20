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
const visuals = readFileSync('src/components/enterprise/EnterpriseVisuals.tsx', 'utf8');
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
  // The three promises show as a list (2026-11-19); lede is the same text as one sentence, for SEO.
  assert.deepEqual(enterprise.ENTERPRISE_HERO.promises.map((p) => p.text), ['One dashboard', 'Weekly follow-up from our team', 'A day-30 report for your stakeholders']);
  for (const piece of ['ENTERPRISE_HERO.titleLead', 'ENTERPRISE_HERO.promises', 'ENTERPRISE_HERO.facts', 'ENTERPRISE_HERO.primaryCta', 'ENTERPRISE_HERO.trust', 'HERO_DASHBOARD']) {
    assert.ok(hero.includes(piece), `hero is missing ${piece}`);
  }
});

test('the pilot promises a process and evidence, and shows proof without inventing customers', () => {
  assert.equal(enterprise.ENTERPRISE_OUTCOMES.items.length, 3);
  assert.match(enterprise.ENTERPRISE_PILOT.honesty, /not a promise of customers or funding/);
  assert.match(enterprisePage, /ENTERPRISE_PILOT\.honesty/);
  assert.doesNotMatch(JSON.stringify(enterprise), /guaranteed|get funded|achieve product-market fit|first (three|3) programs|free.pilot|ISO 27001/i);
  assert.match(enterprise.ENTERPRISE_FAQS[0].answer, /proposal/);
  assert.equal(enterprise.ENTERPRISE_HERO.secondaryCta.href, '#report');
  assert.match(enterprisePage, /id={REPORT_ID}/);
  assert.ok(enterprisePage.indexOf('<OutcomeCards') < enterprisePage.indexOf('<SampleReport'));
  assert.match(visuals, /Real product · Sample data/);
  assert.match(visuals, /Illustrative report · Fictional data/);
  const route = INDEXABLE_ROUTES.find((entry: { path: string }) => entry.path === '/enterprise');
  assert.equal(route.heroHeading, enterprise.ENTERPRISE_HERO.titleLead + ' ' + enterprise.ENTERPRISE_HERO.titleAccent);
  assert.equal(route.heroCopy, enterprise.ENTERPRISE_HERO.lede);
  assert.match(enterprisePage, /ENTERPRISE_REPORT\.points\.map/);
  assert.match(enterprisePage, /<SampleReport \/>/);
  assert.match(visuals, /export const SampleReport/);
  assert.match(visuals, /Example day-30 cohort report for/);
  assert.match(visuals, /const ExampleTag/);
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

test('the pilot is explained in four steps, with who does the work and what each side brings', () => {
  // A program manager follows the pilot from setup to day 30 (four steps since
  // the 2026-11-18 audit), each step owned by someone so their team's time is
  // clear, and each beside a visual.
  assert.deepEqual(
    enterprise.ENTERPRISE_PILOT.steps.map((step) => step.key),
    ['setup', 'join', 'track', 'report'],
  );
  for (const step of enterprise.ENTERPRISE_PILOT.steps) {
    assert.ok(['Our team', 'Your team', 'Your founders', 'Our team and your founders'].includes(step.owner), step.key);
  }
  // Each product screen is the real product, captured light and dark.
  for (const asset of ['cohort-program']) {
    assert.match(enterprisePage, new RegExp(`@/assets/enterprise/${asset}\.webp`));
    assert.match(enterprisePage, new RegExp(`@/assets/enterprise/${asset}-light\.webp`));
  }
  // Plain words for program directors (2026-10-24): no internal plan or feature names.
  assert.doesNotMatch(JSON.stringify(enterprise), /Rising plan|First Customer Proof|Startup Development Cycle/);
  // What stays private and the founders' consent are said plainly.
  const faqs = JSON.stringify(enterprise.ENTERPRISE_FAQS);
  assert.match(faqs, /files, ideas, messages and the companies they research are never shown/);
  assert.match(faqs, /agrees to share progress before joining and can leave at any time/);
  assert.match(JSON.stringify(enterprise.ENTERPRISE_PILOT), /agrees to share progress/);
  // What each side brings (2026-10-24 conditions, kept short).
  assert.equal(enterprise.ENTERPRISE_DEAL.get.items.length, 4);
  assert.equal(enterprise.ENTERPRISE_DEAL.need.items.length, 4);
  assert.ok(enterprise.ENTERPRISE_DEAL.need.items.some((item) => /kickoff/.test(item.title)));
  assert.match(enterprisePage, /ENTERPRISE_DEAL\.get\.items\.map/);
  assert.match(enterprisePage, /ENTERPRISE_DEAL\.need\.items\.map/);
});
