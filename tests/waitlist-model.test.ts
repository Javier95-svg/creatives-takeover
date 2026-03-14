import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
