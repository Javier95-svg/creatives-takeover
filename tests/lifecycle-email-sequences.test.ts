import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('lifecycle email migration adds tracking columns without storing secrets', () => {
  const migration = read('../supabase/migrations/20260515160000_lifecycle_email_sequences.sql');

  assert.match(migration, /ADD COLUMN IF NOT EXISTS opened_at timestamptz/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS clicked_at timestamptz/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false/);
  assert.match(migration, /<SERVICE_ROLE_KEY>/);
  assert.doesNotMatch(migration, /Bearer eyJ/);
});

test('email-sequences handles cron, events, dedupe, unsubscribe, and dynamic plan links', () => {
  const source = read('../supabase/functions/email-sequences/index.ts');

  assert.match(source, /mode: "cron"/);
  assert.match(source, /mode: "event"/);
  assert.match(source, /signup_completed/);
  assert.match(source, /onboarding_complete/);
  assert.match(source, /credit_warning/);
  assert.match(source, /credit_exhausted/);
  assert.match(source, /alreadySent/);
  assert.match(source, /isUnsubscribed/);
  assert.match(source, /stripe_payment_link_monthly/);
  assert.match(source, /Build My ICP Free/);
  assert.match(source, /Starter/);
  assert.match(source, /Unsubscribe/);
});

test('credit deduction triggers email events for rookie low-credit and exhausted moments', () => {
  const source = read('../supabase/functions/_shared/credit-deduction.ts');

  assert.match(source, /triggerEmailSequenceEvent/);
  assert.match(source, /'credit_exhausted'/);
  assert.match(source, /'credit_warning'/);
  assert.match(source, /subscriptionTier === 'rookie'/);
});

test('frontend onboarding and signup trigger lifecycle events', () => {
  const authContext = read('../src/contexts/AuthContext.tsx');
  const retentionSystem = read('../src/lib/retentionSystem.ts');
  const day1Welcome = read('../src/components/dashboard/Day1Welcome.tsx');
  const checklist = read('../src/components/OnboardingChecklist.tsx');

  assert.match(authContext, /triggerEmailSequenceEvent\('signup_completed'/);
  assert.match(retentionSystem, /triggerEmailSequenceEvent\('onboarding_complete'/);
  assert.match(day1Welcome, /triggerEmailSequenceEvent\('onboarding_complete'/);
  assert.match(checklist, /triggerEmailSequenceEvent\('onboarding_complete'/);
});

test('resend webhooks update retention email tracking columns by resend id', () => {
  const resendWebhook = read('../supabase/functions/resend-webhook/index.ts');
  const existingWebhook = read('../supabase/functions/resend-email-events/index.ts');

  assert.match(resendWebhook, /retention_email_log/);
  assert.match(resendWebhook, /opened_at/);
  assert.match(resendWebhook, /clicked_at/);
  assert.match(resendWebhook, /resend_id/);

  assert.match(existingWebhook, /retention_email_log/);
  assert.match(existingWebhook, /retentionUpdated/);
});
