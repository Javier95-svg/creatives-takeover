import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  ACTIVATION_CATALOG,
  createActivationJourney,
  normalizeActivationIntent,
  recommendActivation,
} from '../src/lib/activationJourneyV2.ts';

const available = ['find_mentor', 'build_demo', 'run_icp', 'start_validation', 'build_mvp', 'first_customer_sprint', 'plan_gtm', 'log_traction', 'analyze_pitch_deck'] as const;

test('blockers map to stage-aligned first wins', () => {
  const cases = [
    ['customer_clarity', 'idea_only', 'run_icp'],
    ['demand_validation', 'idea_only', 'start_validation'],
    ['demand_validation', 'prototype_demo', 'build_demo'],
    ['product_build', 'mvp_beta', 'build_mvp'],
    ['go_to_market', 'live_product', 'first_customer_sprint'],
    ['traction_growth', 'scaling_product', 'log_traction'],
    ['fundraising', 'live_product', 'analyze_pitch_deck'],
    ['solo', 'idea_only', 'find_mentor'],
  ] as const;

  for (const [blocker, productStatus, expected] of cases) {
    const result = recommendActivation({ assignedStage: 1, blocker, productStatus, availableIntents: [...available] });
    assert.equal(result.intent, expected);
  }
});

test('unfinished work takes precedence over quiz blocker', () => {
  const result = recommendActivation({
    assignedStage: 1,
    blocker: 'customer_clarity',
    productStatus: 'idea_only',
    availableIntents: [...available],
    userPreferences: { activationIntent: 'build_demo', activationReturnUrl: '/demo-studio/try?hydrate=1' },
  });
  assert.equal(result.intent, 'build_demo');
  assert.equal(result.source, 'resume');
  assert.match(result.resumeUrl, /hydrate=1/);
});

test('locked recommendation falls back to an available useful action', () => {
  const result = recommendActivation({
    assignedStage: 7,
    blocker: 'fundraising',
    productStatus: 'live_product',
    availableIntents: ['run_icp', 'find_mentor'],
  });
  assert.equal(result.intent, 'run_icp');
});

test('legacy pitch intent normalizes and explicit selection replaces resume route', () => {
  assert.equal(normalizeActivationIntent('unlock_pitch_deck'), 'analyze_pitch_deck');
  const recommended = recommendActivation({ assignedStage: 2, blocker: 'demand_validation', productStatus: 'prototype_demo', availableIntents: [...available] });
  const journey = createActivationJourney(recommended, 'find_mentor');
  assert.equal(journey.recommendedIntent, 'build_demo');
  assert.equal(journey.selectedIntent, 'find_mentor');
  assert.equal(journey.resumeUrl, ACTIVATION_CATALOG.find_mentor.route);
});

test('every V2 catalog destination has three steps and a completion artifact', () => {
  for (const intent of available) {
    const entry = ACTIVATION_CATALOG[intent];
    assert.ok(entry.route.startsWith('/'));
    assert.equal(entry.steps.length, 3);
    assert.ok(entry.artifactType);
    assert.ok(entry.estimatedMinutes > 0);
  }
});

test('migration persists atomically and exposes an admin-only unique-journey funnel', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260711120000_onboarding_activation_v2.sql', import.meta.url), 'utf8');
  assert.match(sql, /SECURITY INVOKER/);
  assert.match(sql, /v_user uuid := auth\.uid\(\)/);
  assert.match(sql, /user_preferences = COALESCE\(p\.user_preferences/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /user_roles[\s\S]*role = 'admin'/);
  assert.match(sql, /count\(DISTINCT user_id\)/);
  for (const breakdown of ['byIntent', 'byStage', 'bySource', 'byPlan', 'byDevice']) assert.match(sql, new RegExp(`'${breakdown}'`));
});

/*
 * Publish-first routing.
 *
 * The catalog's defining problem was that every intent terminated in a document
 * only its author reads, which is precisely the half of the product a general AI
 * assistant already does for twenty dollars a month. `publish_proof` is the only
 * entry whose output leaves the platform, and these pin both that it can be
 * reached and that the flag genuinely reverses.
 */

const availableWithProof = [...available, 'publish_proof'] as const;

test('a demand blocker routes to publishing once the flag is on', () => {
  for (const productStatus of ['idea_only', 'prototype_demo'] as const) {
    const on = recommendActivation({
      assignedStage: 2, blocker: 'demand_validation', productStatus,
      availableIntents: [...availableWithProof], publishProofFirst: true,
    });
    assert.equal(on.intent, 'publish_proof', `${productStatus} should publish when the flag is on`);
  }
});

test('the flag off reproduces the previous routing exactly', () => {
  const cases = [
    ['idea_only', 'start_validation'],
    ['prototype_demo', 'build_demo'],
  ] as const;
  for (const [productStatus, expected] of cases) {
    for (const publishProofFirst of [false, undefined]) {
      const result = recommendActivation({
        assignedStage: 2, blocker: 'demand_validation', productStatus,
        availableIntents: [...availableWithProof], publishProofFirst,
      });
      assert.equal(result.intent, expected, `flag ${String(publishProofFirst)} must not change routing`);
    }
  }
});

test('publishing never displaces a blocker it does not answer', () => {
  // A founder blocked on fundraising is not helped by publishing a demo. The
  // flag is scoped to the demand blocker and the two earliest stages, and this
  // is what stops it becoming a blanket redirect.
  for (const [blocker, expected] of [
    ['customer_clarity', 'run_icp'],
    ['product_build', 'build_mvp'],
    ['fundraising', 'analyze_pitch_deck'],
  ] as const) {
    const result = recommendActivation({
      assignedStage: 5, blocker, productStatus: 'live_product',
      availableIntents: [...availableWithProof], publishProofFirst: true,
    });
    assert.equal(result.intent, expected);
  }
});

test('publish_proof survives intent normalization', () => {
  assert.equal(normalizeActivationIntent('publish_proof'), 'publish_proof');
});

test('the publish intent is the only one whose output leaves the platform', () => {
  const entry = ACTIVATION_CATALOG.publish_proof;
  assert.ok(entry, 'publish_proof must exist in the catalog');
  assert.doesNotMatch(entry.output, /^A saved /, 'the output must not be another private document');
  assert.match(entry.output, /URL/i, 'the output must name the live address');
  assert.match(entry.steps[2], /Publish/i, 'the last step must be publishing, not saving');

  // The property that made this necessary, asserted so it cannot silently return:
  // every other entry does terminate in something only the founder sees.
  const othersEndPrivate = Object.values(ACTIVATION_CATALOG)
    .filter((candidate) => candidate.intent !== 'publish_proof')
    .every((candidate) => !/URL/i.test(candidate.output));
  assert.equal(othersEndPrivate, true, 'if another intent now publishes, widen this test rather than deleting it');
});
