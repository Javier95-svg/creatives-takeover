import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateServiceSlug,
  getDeckTypeFromFile,
  inferServiceBookingProvider,
} from '../src/utils/serviceMarketplace.ts';
import { readFileSync } from 'node:fs';

const serviceNotificationMigration = readFileSync(
  new URL('../supabase/migrations/20260716130000_notify_all_users_on_service_publish.sql', import.meta.url),
  'utf8',
);

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

test('publishing a service notifies every account exactly once', () => {
  assert.match(serviceNotificationMigration, /AFTER INSERT OR UPDATE OF is_active/);
  assert.match(serviceNotificationMigration, /FROM auth\.users account/);
  assert.match(serviceNotificationMigration, /NEW\.is_active = true AND OLD\.is_active IS DISTINCT FROM true/);
  assert.match(serviceNotificationMigration, /existing\.metadata->>'service_id' = NEW\.id::text/);
  assert.match(serviceNotificationMigration, /'%s by %s available now at Marketplace'/);
  assert.match(serviceNotificationMigration, /'route', '\/marketplace\/' \|\| NEW\.slug/);
});

test('the service notification migration backfills already-active services', () => {
  assert.match(serviceNotificationMigration, /FROM public\.services service/);
  assert.match(serviceNotificationMigration, /CROSS JOIN auth\.users account/);
  assert.match(serviceNotificationMigration, /WHERE service\.is_active = true/);
  assert.match(serviceNotificationMigration, /existing\.metadata->>'service_id' = service\.id::text/);
});
