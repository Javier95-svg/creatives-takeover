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
  // The navbar stays short (2026-10-16): founders are the obvious audience and
  // investors wait for case studies.
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

test('the enterprise page lands its offer in the hero', () => {
  // Programs should get the value proposition without scrolling: the promise,
  // the three things they get, a way to talk to us, and the product itself.
  assert.equal(enterprise.ENTERPRISE_HERO.points.length, 3);
  const heroStart = enterprisePage.indexOf('className="ent-hero"');
  const hero = enterprisePage.slice(heroStart, enterprisePage.indexOf('</section>', heroStart));
  for (const piece of ['ENTERPRISE_HERO.titleLead', 'ENTERPRISE_HERO.lede', 'ENTERPRISE_HERO.primaryCta', 'ENTERPRISE_HERO.points', '<CohortBoardMock />']) {
    assert.ok(hero.includes(piece), `hero is missing ${piece}`);
  }
});

test('the institution form reuses the contact function with known roles', () => {
  assert.match(form, /functions\.invoke\("contact-form-submission"/);
  assert.match(form, /reason: "partnership"/);
  for (const option of INSTITUTION_ORG_TYPES) assert.match(option.role, /^[a-z_]+$/);
  // Enterprise and investors get the form; founders get a sign-up CTA instead.
  assert.match(enterprisePage, /<InstitutionContactForm\s+audience="enterprise"/);
  assert.ok(AUDIENCE_PAGES.investors.contact);
  assert.equal(AUDIENCE_PAGES.founders.contact, undefined);
});
