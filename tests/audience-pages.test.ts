import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { AUDIENCE_PAGES, INSTITUTION_ORG_TYPES } from '../src/data/audiencePages.ts';
import { INDEXABLE_ROUTES } from '../scripts/seo-route-config.mjs';

// B2B2C repositioning (2026-10-15): one page per audience, linked from the
// visitor navbar, the homepage and the footer.

const app = readFileSync('src/App.tsx', 'utf8');
const navbar = readFileSync('src/components/VisitorNavbar.tsx', 'utf8');
const footer = readFileSync('src/components/Footer.tsx', 'utf8');
const index = readFileSync('src/pages/Index.tsx', 'utf8');
const form = readFileSync('src/components/audience/InstitutionContactForm.tsx', 'utf8');
const pages = Object.values(AUDIENCE_PAGES);

test('each audience page has a route and a footer link; only programs is in the navbar', () => {
  for (const page of pages) {
    assert.match(app, new RegExp(`<Route path="${page.path}" element=`), `${page.path} route`);
    assert.ok(footer.includes(`to: "${page.path}"`), `${page.path} footer`);
  }
  // The navbar stays short (2026-10-16): the programs page is "Enterprise",
  // founders are the obvious audience and investors wait for case studies.
  assert.match(navbar, /label: "Enterprise", href: "\/for-programs"/);
  assert.doesNotMatch(navbar, /href: "\/for-founders"|href: "\/for-investors"/);
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

test('the homepage introduces all three audiences right after the hero', () => {
  const desktop = index.slice(index.lastIndexOf('<Hero />'));
  assert.ok(desktop.indexOf('<AudienceSection />') < desktop.indexOf('<EntrepreneurProblems />'));
  assert.equal(index.match(/<AudienceSection \/>/g)?.length, 2, 'mobile and desktop branches');
});

test('copy never promises investment or calls the platform an accelerator to founders', () => {
  const founders = JSON.stringify(AUDIENCE_PAGES.founders);
  assert.doesNotMatch(founders, /accelerator program|our accelerator|guaranteed|get funded/i);
  for (const page of pages) {
    assert.doesNotMatch(JSON.stringify(page), /from idea to launch|step by step|No cohort/i, page.path);
  }
  assert.match(AUDIENCE_PAGES.founders.trust.body, /can’t promise investment/);
  assert.match(AUDIENCE_PAGES.investors.trust.body, /opt-in/);
});

test('cohort prices stay off the public pages', () => {
  for (const page of pages) assert.doesNotMatch(JSON.stringify(page), /\$\s?\d/, page.path);
});

test('the institution form reuses the contact function with known roles', () => {
  assert.match(form, /functions\.invoke\("contact-form-submission"/);
  assert.match(form, /reason: "partnership"/);
  for (const option of INSTITUTION_ORG_TYPES) assert.match(option.role, /^[a-z_]+$/);
  // Programs and investors each get the form; founders get a sign-up CTA instead.
  assert.ok(AUDIENCE_PAGES.programs.contact && AUDIENCE_PAGES.investors.contact);
  assert.equal(AUDIENCE_PAGES.founders.contact, undefined);
});
