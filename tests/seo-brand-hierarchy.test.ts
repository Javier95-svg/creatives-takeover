import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INDEXABLE_ROUTES } from '../scripts/seo-route-config.mjs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const homeTitle = 'Creatives Takeover | From Idea to Customer Conversations';
const aboutTitle = 'About Creatives Takeover | Our Mission and Team';

test('the homepage owns the brand-led search title across every rendering path', () => {
  const indexHtml = read('../index.html');
  const homepage = read('../src/pages/Index.tsx');
  const rootRoute = INDEXABLE_ROUTES.find((route) => route.path === '/');

  assert.ok(indexHtml.includes(`<title>${homeTitle}</title>`));
  assert.ok(homepage.includes(`title="${homeTitle}"`));
  assert.equal(rootRoute?.title, homeTitle);
  assert.ok(rootRoute?.description.startsWith('Creatives Takeover is'));
});

test('the About page is differentiated from the homepage brand intent', () => {
  const aboutPage = read('../src/pages/About.tsx');
  const aboutRoute = INDEXABLE_ROUTES.find((route) => route.path === '/about');

  assert.ok(aboutPage.includes(`title="${aboutTitle}"`));
  assert.equal(aboutRoute?.title, aboutTitle);
  assert.notEqual(aboutRoute?.title, homeTitle);
  assert.doesNotMatch(aboutRoute?.title ?? '', /From Idea to Customer Conversations/);
});

test('crawler shells expose canonical primary links and reserve WebSite identity for home', () => {
  const generator = read('../scripts/generate-prerendered-pages.mjs');

  for (const link of ['/', '/build', '/mentorship', '/podcast', '/newspaper', '/about', '/pricing']) {
    assert.ok(generator.includes(`href: "${link}"`), `missing canonical navigation link ${link}`);
  }
  assert.doesNotMatch(generator, /href: "\/stories"/);
  assert.doesNotMatch(generator, /const WEBSITE_SCHEMA/);
  assert.match(generator, /const data = \[ORGANIZATION_SCHEMA\]/);
});
