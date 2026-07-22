import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('server analytics filters PII and internal accounts without delaying edge requests', () => {
  const source = read('../supabase/functions/_shared/analytics.ts');

  assert.match(source, /PII_PROPERTY_KEYS/);
  assert.match(source, /INTERNAL_EMAILS/);
  assert.match(source, /admin@creatives-takeover\.com/);
  assert.match(source, /internalUserCache/);
  assert.match(source, /auth\/v1\/admin\/users/);
  assert.match(source, /\/i\/v0\/e\//);
  assert.match(source, /if \(await resolveInternalUser\(userId\)\) return/);
  assert.match(source, /edgeRuntime\.waitUntil\(deliver\(\)\)/);
  assert.doesNotMatch(source, /console\.(?:log|warn|error)\([^\n]*email/);
});

test('Stripe webhook emits canonical subscription lifecycle and revenue events', () => {
  const source = read('../supabase/functions/stripe-webhook/index.ts');

  for (const eventName of [
    'subscription_started',
    'subscription_plan_changed',
    'subscription_cancelled',
    'subscription_payment_received',
  ]) {
    assert.match(source, new RegExp(`eventName: ["']${eventName}["']`));
  }

  assert.match(source, /session\.mode !== "subscription"/);
  assert.match(source, /planChanged \|\| statusChanged/);
  assert.match(source, /previousAttributes: event\.data\.previous_attributes/);
  assert.match(source, /days_since_start: daysBetweenUnixSeconds/);
  assert.match(source, /amount_usd/);
  assert.match(source, /stripe_customer_id/);
});

test('PMF survey response analytics are owner-attributed and emitted once per insert', () => {
  const server = read('../supabase/functions/pmf-survey-respond/index.ts');
  const client = read('../src/pages/pmf/PMFSurveyPage.tsx');

  assert.match(server, /const responseInserted = !insertError/);
  assert.match(server, /if \(responseInserted\)/);
  assert.match(server, /eventName: "pmf_survey_response_received"/);
  assert.match(server, /userId: survey\.user_id/);
  assert.match(server, /survey_slug: slug/);
  assert.match(server, /sean_ellis_answer: answer/);
  assert.match(server, /has_email: Boolean\(email\)/);
  assert.doesNotMatch(client, /captureEvent\('pmf_survey_response_received'/);
});

test('all production generators report failures with tool and refund dimensions', () => {
  const generators = [
    ['../supabase/functions/icp-analyzer/index.ts', 'icp_builder'],
    ['../supabase/functions/gtm-analyzer/index.ts', 'gtm_strategist'],
    ['../supabase/functions/pmf-evidence-scorer/index.ts', 'pmf_lab'],
    ['../supabase/functions/mvp-builder-generate/index.ts', 'mvp_builder'],
  ] as const;

  for (const [path, tool] of generators) {
    const source = read(path);
    assert.match(source, /generation_failed/);
    assert.match(source, new RegExp(`tool: ["']${tool}["']`));
    assert.match(source, /error_code/);
    assert.match(source, /credits_refunded/);
  }

  const mvp = read('../supabase/functions/mvp-builder-generate/index.ts');
  assert.match(mvp, /if \(!released\.success \|\| !released\.wasReleased\) return/);
  assert.match(mvp, /"AI_ERROR"/);
  assert.match(mvp, /"EMPTY_OUTPUT"/);
  assert.match(mvp, /"VALIDATION_FAILED"/);
  assert.match(mvp, /"STREAM_ERROR"/);
});
