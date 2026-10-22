import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import * as founderId from '../src/data/founderIdPage.ts';
import { INDEXABLE_ROUTES } from '../scripts/seo-route-config.mjs';

// /founder-id (2026-10-21): the landing page for Founder ID, reached from the
// visitor navbar's For founders menu.

const app = readFileSync('src/App.tsx', 'utf8');
const navbar = readFileSync('src/components/VisitorNavbar.tsx', 'utf8');
const page = readFileSync('src/pages/FounderIdPage.tsx', 'utf8');
const copy = JSON.stringify(founderId);

test('the page has a route and the For founders menu links to it', () => {
  assert.equal(founderId.FOUNDER_ID_PATH, '/founder-id');
  assert.match(app, /<Route path="\/founder-id" element=\{<FounderIdPage \/>\} \/>/);
  assert.match(navbar, /label: "Founder ID", href: "\/founder-id"/);
});

test('the prerendered shell and the page agree on title, description and share card', () => {
  // Social scrapers read the prerendered shell, people see the React <SEO>.
  const route = INDEXABLE_ROUTES.find((entry: { path: string }) => entry.path === founderId.FOUNDER_ID_PATH);
  assert.ok(route, '/founder-id must be in INDEXABLE_ROUTES');
  assert.equal(route.title, founderId.FOUNDER_ID_SEO.title);
  assert.equal(route.description, founderId.FOUNDER_ID_SEO.description);
  // SEO.tsx truncates beyond these lengths.
  assert.ok(founderId.FOUNDER_ID_SEO.title.length <= 60, `title is ${founderId.FOUNDER_ID_SEO.title.length} chars`);
  assert.ok(founderId.FOUNDER_ID_SEO.description.length <= 160, `description is ${founderId.FOUNDER_ID_SEO.description.length} chars`);
  // A static card: robots.txt blocks /api/, and LinkedIn and Facebook honour it.
  assert.equal(route.ogImage, `https://creatives-takeover.com${founderId.FOUNDER_ID_SEO.image}`);
  assert.ok(existsSync(`public${founderId.FOUNDER_ID_SEO.image}`), 'the share card is in public/');
  assert.match(page, /image=\{FOUNDER_ID_SEO\.image\}/);
});

test('the page shows its three parts with real screens', () => {
  assert.deepEqual(founderId.FOUNDER_ID_SECTIONS.items.map((item) => item.key), ['profile', 'support', 'updates']);
  for (const item of founderId.FOUNDER_ID_SECTIONS.items) {
    assert.match(page, new RegExp(`\\b${item.key}: \\{\\s*src: `), `${item.key} has a screen`);
  }
});

test('support stays donations through the founder’s own page, and the copy avoids clichés', () => {
  assert.doesNotMatch(copy, /invest|get funded|guaranteed|raise money|from idea to launch|step by step|at your own pace/i);
  assert.match(copy, /not through Creatives Takeover/);
});
