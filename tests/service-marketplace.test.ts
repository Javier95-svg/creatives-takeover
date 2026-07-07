import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateServiceSlug,
  getDeckTypeFromFile,
  inferServiceBookingProvider,
} from '../src/utils/serviceMarketplace.ts';

test('service marketplace slugs are URL safe and stable', () => {
  assert.equal(generateServiceSlug(' Sales Automation Sprint! '), 'sales-automation-sprint');
  assert.equal(generateServiceSlug('Technical Support & Workflow Ops'), 'technical-support-workflow-ops');
});

test('service marketplace infers booking providers from booking urls', () => {
  assert.equal(inferServiceBookingProvider('https://calendly.com/team/service'), 'calendly');
  assert.equal(inferServiceBookingProvider('https://koalendar.com/e/service'), 'koalendar');
  assert.equal(inferServiceBookingProvider('https://example.com/book'), 'other');
  assert.equal(inferServiceBookingProvider('', 'manual'), 'manual');
});

test('service marketplace decks are limited to PDF and PPTX', () => {
  assert.equal(getDeckTypeFromFile(new File([''], 'deck.pdf', { type: 'application/pdf' })), 'pdf');
  assert.equal(
    getDeckTypeFromFile(
      new File([''], 'deck.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
    ),
    'pptx',
  );
  assert.equal(getDeckTypeFromFile(new File([''], 'legacy.ppt', { type: 'application/vnd.ms-powerpoint' })), null);
});
