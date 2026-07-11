import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  ACTIVATION_CATALOG,
  createActivationJourney,
  normalizeActivationIntent,
  recommendActivation,
} from '../src/lib/activationJourneyV2.ts';

const available = ['find_mentor', 'build_demo', 'run_icp', 'start_validation', 'build_mvp', 'plan_gtm', 'log_traction', 'analyze_pitch_deck'] as const;

test('blockers map to stage-aligned first wins', () => {
  const cases = [
    ['customer_clarity', 'idea_only', 'run_icp'],
    ['demand_validation', 'idea_only', 'start_validation'],
    ['demand_validation', 'prototype_demo', 'build_demo'],
    ['product_build', 'mvp_beta', 'build_mvp'],
    ['go_to_market', 'live_product', 'plan_gtm'],
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
