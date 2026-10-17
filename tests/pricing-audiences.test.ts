import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as pricing from '../src/data/pricingPage.ts';
import { INDEXABLE_ROUTES } from '../scripts/seo-route-config.mjs';

// /pricing sells to two audiences (2026-10-17): founders and builders get the
// four self-serve plans, institutions get custom pricing and "Talk with sales".

const page = readFileSync('src/pages/PricingPage.tsx', 'utf8');
const institutionView = readFileSync('src/components/pricing/InstitutionPricing.tsx', 'utf8');
const contactFunction = readFileSync('supabase/functions/contact-form-submission/index.ts', 'utf8');

test('the pricing page switches between founders and institutions through ?for=', () => {
  assert.deepEqual(pricing.PRICING_AUDIENCES.map((option) => option.value), ['founders', 'institutions']);
  assert.match(page, /const AUDIENCE_PARAM = "for"/);
  assert.match(page, /useSearchParams/);
  // Founders keep the four plans and everything below them.
  for (const piece of ['<Pricing showHeading={false} />', '<PricingComparison />', '<SubscriptionFeatures />', '<PricingFAQ />']) {
    assert.ok(page.includes(piece), `founders view is missing ${piece}`);
  }
  assert.ok(page.includes('<InstitutionPricing />'), 'institutions view is missing');
});

test('institutions see no price, only Talk with sales', () => {
  const copy = JSON.stringify({ ...pricing.INSTITUTION_PRICING, ...pricing.SALES_DIALOG });
  assert.doesNotMatch(copy, /\$\s?\d|per month|\/mo\b/i);
  assert.equal(pricing.INSTITUTION_PRICING.cta, 'Talk with sales');
  assert.equal(pricing.SALES_DIALOG.title, 'Talk with sales');
});

test('every sales request reaches admin@creatives-takeover.com', () => {
  // The pop-up reuses the institution form and marks the lead as a sales request.
  assert.match(institutionView, /<InstitutionContactForm[\s\S]*?reason=\{SALES_DIALOG\.reason\}/);
  assert.equal(pricing.SALES_DIALOG.reason, 'Sales request');
  // The edge function emails these addresses on every submission, whatever the env says.
  const required = contactFunction.match(/REQUIRED_ADMIN_RECIPIENTS = \[([\s\S]*?)\]/);
  assert.ok(required, 'REQUIRED_ADMIN_RECIPIENTS not found');
  assert.match(required[1], /"admin@creatives-takeover\.com"/);
});

test('the pricing page and its prerendered shell agree on title and description', () => {
  const route = INDEXABLE_ROUTES.find((entry: { path: string }) => entry.path === '/pricing');
  assert.ok(route, '/pricing must be in INDEXABLE_ROUTES');
  assert.equal(route.title, pricing.PRICING_SEO.title);
  assert.equal(route.description, pricing.PRICING_SEO.description);
  assert.ok(pricing.PRICING_SEO.title.length <= 60, `title is ${pricing.PRICING_SEO.title.length} chars`);
  assert.ok(pricing.PRICING_SEO.description.length <= 160, `description is ${pricing.PRICING_SEO.description.length} chars`);
});

test('the institutions timeline animates once in view and respects reduced motion', () => {
  // 2026-10-17: the line draws between the steps and each step appears as it
  // is reached; visitors who prefer reduced motion see it finished.
  assert.match(institutionView, /whileInView="shown"/);
  assert.match(institutionView, /viewport=\{\{ once: true/);
  assert.match(institutionView, /useReducedMotion\(\)/);
  assert.match(institutionView, /initial=\{reduceMotion \? "shown" : "hidden"\}/);
});
