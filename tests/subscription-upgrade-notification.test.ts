import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmed plan checkouts create an idempotent bell notification with the selected tier', () => {
  const webhook = read('../supabase/functions/stripe-webhook/index.ts');
  const migration = read('../supabase/migrations/20260903130000_subscription_upgrade_bell_notifications.sql');

  assert.match(webhook, /notification_type: "subscription_upgrade_completed"/);
  assert.match(webhook, /Your plan has been upgraded to \$\{planName\} successfully\./);
  assert.match(webhook, /stripe_event_id: stripeEventId/);
  assert.match(webhook, /await createSubscriptionUpgradeNotification\(supabaseAdmin, \{/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS community_notifications_subscription_upgrade_event_unique/);
  assert.match(migration, /metadata ->> 'stripe_event_id'/);
});

test('the bell presents the upgrade copy and opens purchase history', () => {
  const bell = read('../src/components/community/NotificationBell.tsx');

  assert.match(bell, /notification\.notification_type === 'subscription_upgrade_completed'/);
  assert.match(bell, /navigateTo\(metadataRoute \|\| '\/purchase-history'\)/);
  assert.match(bell, /case 'subscription_upgrade_completed':/);
  assert.match(bell, /metadata\?\.message \|\| 'Your plan has been upgraded successfully\.'/);
});
