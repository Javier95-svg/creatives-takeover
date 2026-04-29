import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WAITLIST_SECTION_ORDER,
  WAITLIST_TEMPLATE_IDS,
  getDefaultWaitlistContent,
  getWaitlistThemePalette,
  normalizeWaitlistContent,
} from '../src/lib/waitlist.ts';

test('light theme preset exposes a usable light palette', () => {
  const palette = getWaitlistThemePalette('light');

  assert.equal(palette.pageBackground, '#f8fafc');
  assert.equal(palette.textPrimary, '#0f172a');
  assert.equal(palette.buttonText, '#f8fafc');
});

test('normalization falls back to default benefit and step blocks when entries are under the minimum', () => {
  const fallback = getDefaultWaitlistContent('LaunchPad');
  const normalized = normalizeWaitlistContent({
    benefits: ['Only one'],
    howItWorks: ['Step one', 'Step two'],
  }, 'LaunchPad');

  assert.deepEqual(normalized.benefits, fallback.benefits);
  assert.deepEqual(normalized.howItWorks, fallback.howItWorks);
});

test('normalization keeps only enabled custom fields and caps the list length', () => {
  const normalized = normalizeWaitlistContent({
    customFields: [
      { id: 'company', label: 'Company', placeholder: 'Acme', type: 'text', required: true, enabled: true },
      { id: 'url', label: 'Website', placeholder: 'https://example.com', type: 'url', required: false, enabled: true },
      { id: 'notes', label: 'Notes', placeholder: 'Tell us more', type: 'textarea', required: false, enabled: false },
      { id: 'one', label: 'One', placeholder: 'One', type: 'text', required: false, enabled: true },
      { id: 'two', label: 'Two', placeholder: 'Two', type: 'text', required: false, enabled: true },
      { id: 'three', label: 'Three', placeholder: 'Three', type: 'text', required: false, enabled: true },
      { id: 'four', label: 'Four', placeholder: 'Four', type: 'text', required: false, enabled: true },
      { id: 'five', label: 'Five', placeholder: 'Five', type: 'text', required: false, enabled: true },
      { id: 'six', label: 'Six', placeholder: 'Six', type: 'text', required: false, enabled: true },
      { id: 'seven', label: 'Seven', placeholder: 'Seven', type: 'text', required: false, enabled: true },
    ],
  }, 'LaunchPad');

  assert.equal(normalized.customFields?.length, 8);
  assert.ok(normalized.customFields?.every((field) => field.enabled));
  assert.ok(normalized.customFields?.every((field) => field.id !== 'notes'));
});

test('normalization accepts known template ids and falls back for unknown templates', () => {
  const normalized = normalizeWaitlistContent({
    templateId: 'marketplace',
  }, 'LaunchPad');
  const fallback = normalizeWaitlistContent({
    templateId: 'unknown-template',
  }, 'LaunchPad');

  assert.equal(normalized.templateId, 'marketplace');
  assert.equal(fallback.templateId, WAITLIST_TEMPLATE_IDS[0]);
});

test('normalization preserves section order, removes duplicates, and backfills missing sections', () => {
  const normalized = normalizeWaitlistContent({
    sectionOrder: ['faq', 'benefits', 'faq', 'not-real', 'problemSolution'],
  }, 'LaunchPad');

  assert.deepEqual(normalized.sectionOrder?.slice(0, 3), ['faq', 'benefits', 'problemSolution']);
  assert.deepEqual([...normalized.sectionOrder!].sort(), [...WAITLIST_SECTION_ORDER].sort());
});

test('normalization persists uploaded image urls inside waitlist content', () => {
  const imageUrl = 'https://example.com/public-assets/user/waitlist.png';
  const normalized = normalizeWaitlistContent({
    imageUrl,
    logoUrl: 'https://example.com/logo.svg',
  }, 'LaunchPad');

  assert.equal(normalized.imageUrl, imageUrl);
  assert.equal(normalized.logoUrl, 'https://example.com/logo.svg');
});
