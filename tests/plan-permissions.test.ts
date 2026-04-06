import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAN_HIGHLIGHTS,
  PLAN_MONTHLY_CREDITS,
  normalizePlan,
  resolveEntitlement,
} from '../src/config/planPermissions.ts';

test('normalizePlan keeps legacy creator users on rising', () => {
  assert.equal(normalizePlan('creator'), 'rising');
  assert.equal(normalizePlan('professional'), 'pro');
  assert.equal(normalizePlan('free'), 'rookie');
});

test('plan highlights match the authoritative four-plan contract', () => {
  assert.deepEqual(PLAN_HIGHLIGHTS.rookie, [
    'Dashboard Rookie Mode',
    'ICP Builder (free)',
    'Waitlist Maker',
    'Stages 3-5 (preview only)',
    '1 free discovery call/month (mentorship)',
    '1 Find a Co-Founder post per month',
    'VC Search & Accelerator Hunt (view only)',
    'Prompt Library (free models only)',
    'Insighta Test',
    'Newspaper',
  ]);

  assert.deepEqual(PLAN_HIGHLIGHTS.starter, [
    'Dashboard Starter Mode',
    'ICP Builder (free)',
    'Waitlist Maker + PMF Lab',
    'Stages 4-5 (preview only)',
    '2 free discovery calls/month (mentorship)',
    '2 Find a Co-Founder posts per month',
    'VC Search & Accelerator Hunt (2 profiles view per month)',
    'Email Templates (full access)',
    'Prompt Library (free models only)',
    'Insighta Test',
    'Newspaper',
  ]);

  assert.deepEqual(PLAN_HIGHLIGHTS.rising, [
    'Dashboard Rising Mode',
    'Full BizMap AI tools access',
    'MVP Builder + GTM Strategist (credits apply)',
    '3 free discovery calls/month (mentorship)',
    'Unlimited Find a Co-Founder posts',
    'VC Search & Accelerator Hunt (5 profiles view per month)',
    'Email Templates (full access)',
    'Pitch Deck Analyzer (full access)',
    'Prompt Library (full access)',
    'Insighta Test',
    'Newspaper',
  ]);

  assert.deepEqual(PLAN_HIGHLIGHTS.pro, [
    'Dashboard Pro Mode',
    'Find Your Angel (investors)',
    'Full BizMap AI tools access',
    'MVP Builder + GTM Strategist (credits apply)',
    'Unlimited discovery calls (mentorship)',
    'Unlimited Find a Co-Founder posts',
    'VC Search & Accelerator Hunt (unlimited profile views)',
    'Email Templates (full access)',
    'Pitch Deck Analyzer (full access)',
    'Prompt Library (full access)',
    'Insighta Test',
    'Newspaper',
  ]);
});

test('plan monthly credits stay aligned with pricing', () => {
  assert.equal(PLAN_MONTHLY_CREDITS.rookie, 25);
  assert.equal(PLAN_MONTHLY_CREDITS.starter, 50);
  assert.equal(PLAN_MONTHLY_CREDITS.rising, 100);
  assert.equal(PLAN_MONTHLY_CREDITS.pro, 300);
});

test('core entitlement rules reflect the pricing contract', () => {
  const rookiePmf = resolveEntitlement('pmf_lab', 'rookie');
  assert.equal(rookiePmf.state, 'preview_only');
  assert.equal(rookiePmf.upgradeTarget, 'starter');
  assert.equal(rookiePmf.uiMode, 'preview');

  const starterPmf = resolveEntitlement('pmf_lab', 'starter');
  assert.equal(starterPmf.state, 'credit_gated');
  assert.equal(starterPmf.creditCost, 8);

  const risingMvp = resolveEntitlement('mvp_builder', 'rising');
  assert.equal(risingMvp.state, 'credit_gated');
  assert.equal(risingMvp.creditCost, 5);

  const proGtm = resolveEntitlement('gtm_strategist', 'pro');
  assert.equal(proGtm.state, 'credit_gated');
  assert.equal(proGtm.creditCost, 5);

  const starterVcProfiles = resolveEntitlement('vc_search_profile', 'starter');
  assert.equal(starterVcProfiles.state, 'quota_limited');
  assert.equal(starterVcProfiles.monthlyLimit, 2);

  const risingAngelAccess = resolveEntitlement('angels_community', 'rising');
  assert.equal(risingAngelAccess.state, 'locked');
  assert.equal(risingAngelAccess.upgradeTarget, 'pro');
  assert.equal(risingAngelAccess.isVisible, false);

  const proAngelAccess = resolveEntitlement('angels_community', 'pro');
  assert.equal(proAngelAccess.state, 'full');
});