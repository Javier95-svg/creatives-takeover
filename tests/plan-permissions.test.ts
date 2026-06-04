import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CREDIT_COSTS,
  getDashboardModeConfig,
  getQuotaStatus,
  PLAN_HIGHLIGHTS,
  PLAN_MONTHLY_CREDITS,
  normalizePlan,
  resolveDashboardSurfaceAccess,
  resolveDashboardMode,
  resolveEntitlement,
} from '../src/config/planPermissions.ts';

test('normalizePlan keeps legacy creator users on rising', () => {
  assert.equal(normalizePlan('creator'), 'rising');
  assert.equal(normalizePlan('basic'), 'starter');
  assert.equal(normalizePlan('premium'), 'rising');
  assert.equal(normalizePlan('professional'), 'pro');
  assert.equal(normalizePlan('enterprise'), 'pro');
  assert.equal(normalizePlan('free'), 'rookie');
});

test('plan highlights match the authoritative four-plan contract', () => {
  assert.deepEqual(PLAN_HIGHLIGHTS.rookie, [
    'Dashboard Rookie Mode',
    'ICP Builder (free)',
    'MVP Builder per-action billing (uses credits)',
    'Stage 1 guided dashboard',
    'Stages 4-5 preview cards',
    'Unlimited Discovery Calls (10 credits per confirmed booking)',
    '1 Find a Co-Founder post per month',
    'VC Search & Accelerator Hunt (browse only)',
    'Prompt Library (free models only)',
    'Insighta Test',
    'Newspaper',
  ]);

  assert.deepEqual(PLAN_HIGHLIGHTS.starter, [
    'Dashboard Starter Mode',
    'ICP Builder (free)',
    'Stages 1-3 active',
    'Waitlist Maker + PMF Lab (uses credits)',
    'MVP Builder per-action billing (uses credits)',
    'Stages 4-5 (preview only)',
    'Unlimited Discovery Calls (10 credits per confirmed booking)',
    '2 Find a Co-Founder posts per month',
    'VC Search & Accelerator Hunt (2 profiles view per month)',
    'Email Templates (full access)',
    'Prompt Library (free models only)',
    'Insighta Test',
    'Newspaper',
  ]);

  assert.deepEqual(PLAN_HIGHLIGHTS.rising, [
    'Dashboard Rising Mode',
    'Full BizMap AI tools access (generative tools use credits)',
    'All five stages available in one cockpit',
    'MVP Builder per-action billing + GTM Strategist (uses credits)',
    'Unlimited Discovery Calls (10 credits per confirmed booking)',
    'Unlimited Find a Co-Founder posts',
    'VC Search & Accelerator Hunt (10 profile views per month)',
    'Email Templates (full access)',
    'Pitch Deck Analyzer (full access)',
    'Prompt Library (full access)',
    'Insighta Test',
    'Newspaper',
  ]);

  assert.deepEqual(PLAN_HIGHLIGHTS.pro, [
    'Dashboard Pro Mode',
    'Pro War Room with fundraising layer',
    'Find Your Angel (investors)',
    'Full BizMap AI tools access (generative tools use credits)',
    'MVP Builder per-action billing + GTM Strategist (uses credits)',
    'Unlimited Discovery Calls (10 credits per confirmed booking)',
    'Unlimited Find a Co-Founder posts',
    'VC Search & Accelerator Hunt (unlimited profile views)',
    'Email Templates (full access)',
    'Pitch Deck Analyzer (full access)',
    'Prompt Library (full access)',
    'Insighta Test',
    'Newspaper',
  ]);
});

test('dashboard mode config resolves from the canonical plan contract', () => {
  assert.equal(resolveDashboardMode('rookie'), 'rookie');
  assert.equal(resolveDashboardMode('starter'), 'starter');
  assert.equal(resolveDashboardMode('rising'), 'rising');
  assert.equal(resolveDashboardMode('pro'), 'pro');

  const rookieMode = getDashboardModeConfig('rookie');
  assert.equal(rookieMode.label, 'Rookie Mode');
  assert.deepEqual(rookieMode.activeStages, [1]);
  assert.deepEqual(rookieMode.previewStages, [4, 5]);
  assert.deepEqual(rookieMode.navItems.map((item) => item.path), [
    '/dashboard',
    '/dashboard/files',
    '/dashboard/tasks',
    '/dashboard/routine',
    '/dashboard/referral',
    '/dashboard/focus-funnel',
  ]);
  assert.deepEqual(rookieMode.visibleTools, ['icp_builder', 'mvp_builder', 'saved_mentors', 'find_mentor', 'find_cofounder']);

  const proMode = getDashboardModeConfig('pro');
  assert.equal(proMode.label, 'Pro Mode');
  assert.deepEqual(proMode.activeStages, [1, 2, 3, 4, 5]);
  assert.deepEqual(proMode.previewStages, []);
  assert.equal(proMode.navItems[0]?.label, 'Home');
  assert.ok(proMode.visibleTools.includes('find_angel'));
});

test('dashboard surface access follows canonical navigation availability', () => {
  assert.equal(resolveDashboardSurfaceAccess('dashboard_access', 'rookie').hasAccess, true);
  assert.equal(resolveDashboardSurfaceAccess('your_tasks', 'rookie').hasAccess, true);

  assert.equal(resolveDashboardSurfaceAccess('routine', 'rookie').hasAccess, true);
  assert.equal(resolveDashboardSurfaceAccess('focus_funnel', 'rising').hasAccess, true);

  const starterDecisionSprint = resolveDashboardSurfaceAccess('decision_sprint', 'starter');
  assert.equal(starterDecisionSprint.hasAccess, false);
  assert.equal(starterDecisionSprint.requiredPlan, undefined);

  assert.equal(resolveDashboardSurfaceAccess('focus_funnel', 'rising').hasAccess, true);
  assert.equal(resolveDashboardSurfaceAccess('core_metrics', 'pro').hasAccess, false);
});

test('plan monthly credits stay aligned with pricing', () => {
  assert.equal(PLAN_MONTHLY_CREDITS.rookie, 50);
  assert.equal(PLAN_MONTHLY_CREDITS.starter, 100);
  assert.equal(PLAN_MONTHLY_CREDITS.rising, 250);
  assert.equal(PLAN_MONTHLY_CREDITS.pro, 600);
});

test('pricing page presents plan outcome labels', () => {
  const pricingSource = readFileSync(new URL('../src/components/Pricing.tsx', import.meta.url), 'utf8');

  assert.match(pricingSource, /outcomeLabel: "Clarify"/);
  assert.match(pricingSource, /outcomeLabel: "Validate"/);
  assert.match(pricingSource, /outcomeLabel: "Build & Launch"/);
  assert.match(pricingSource, /outcomeLabel: "Fundraise & Scale"/);
});

test('core entitlement rules reflect the pricing contract', () => {
  assert.equal(CREDIT_COSTS.ICP_ANALYSIS, 0);

  const rookieIcp = resolveEntitlement('icp_builder', 'rookie');
  assert.equal(rookieIcp.state, 'full');
  assert.equal(rookieIcp.creditCost, undefined);
  assert.equal(rookieIcp.monetizationModel, 'free');

  const rookieWaitlist = resolveEntitlement('waitlist_maker', 'rookie');
  assert.equal(rookieWaitlist.state, 'full');
  assert.equal(rookieWaitlist.monetizationModel, 'credit_metered');
  assert.equal(rookieWaitlist.creditCost, 4);

  const rookiePmf = resolveEntitlement('pmf_lab', 'rookie');
  assert.equal(rookiePmf.state, 'preview_only');
  assert.equal(rookiePmf.upgradeTarget, 'starter');
  assert.equal(rookiePmf.uiMode, 'preview');
  assert.equal(rookiePmf.monetizationModel, 'plan_gated');

  const starterPmf = resolveEntitlement('pmf_lab', 'starter');
  assert.equal(starterPmf.state, 'full');
  assert.equal(starterPmf.monetizationModel, 'credit_metered');
  assert.equal(starterPmf.creditCost, 6);

  const rookieMvp = resolveEntitlement('mvp_builder', 'rookie');
  assert.equal(rookieMvp.state, 'full');
  assert.equal(rookieMvp.monetizationModel, 'credit_metered');
  assert.equal(rookieMvp.creditCost, 15);

  const proGtm = resolveEntitlement('gtm_strategist', 'pro');
  assert.equal(proGtm.state, 'full');
  assert.equal(proGtm.monetizationModel, 'credit_metered');
  assert.equal(proGtm.creditCost, 5);

  const starterVcProfiles = resolveEntitlement('vc_search_profile', 'starter');
  assert.equal(starterVcProfiles.state, 'quota_limited');
  assert.equal(starterVcProfiles.monthlyLimit, 2);

  const rookieDiscoveryCalls = resolveEntitlement('discovery_calls', 'rookie');
  assert.equal(rookieDiscoveryCalls.state, 'full');
  assert.equal(rookieDiscoveryCalls.monetizationModel, 'credit_metered');
  assert.equal(rookieDiscoveryCalls.creditCost, 10);

  const risingAngelAccess = resolveEntitlement('angels_community', 'rising');
  assert.equal(risingAngelAccess.state, 'locked');
  assert.equal(risingAngelAccess.upgradeTarget, 'pro');
  assert.equal(risingAngelAccess.isVisible, false);

  const proAngelAccess = resolveEntitlement('angels_community', 'pro');
  assert.equal(proAngelAccess.state, 'full');
});

test('quota status stays aligned with the entitlement matrix', () => {
  const rookieVcQuota = getQuotaStatus('vc_search_profile', 'rookie', 0);
  assert.equal(rookieVcQuota.isLocked, true);
  assert.equal(rookieVcQuota.canUse, false);
  assert.equal(rookieVcQuota.upgradeTarget, 'starter');

  const starterVcQuota = getQuotaStatus('vc_search_profile', 'starter', 1);
  assert.equal(starterVcQuota.limit, 2);
  assert.equal(starterVcQuota.remaining, 1);
  assert.equal(starterVcQuota.canUse, true);
  assert.equal(starterVcQuota.upgradeTarget, 'rising');

  const exhaustedStarterVcQuota = getQuotaStatus('vc_search_profile', 'starter', 2);
  assert.equal(exhaustedStarterVcQuota.canUse, false);
  assert.equal(exhaustedStarterVcQuota.remaining, 0);

  const risingDiscoveryQuota = getQuotaStatus('discovery_calls', 'rising', 99);
  assert.equal(risingDiscoveryQuota.limit, Infinity);
  assert.equal(risingDiscoveryQuota.remaining, Infinity);
  assert.equal(risingDiscoveryQuota.hasUnlimited, true);
  assert.equal(risingDiscoveryQuota.canUse, true);
  assert.equal(risingDiscoveryQuota.upgradeTarget, undefined);

  const proAcceleratorQuota = getQuotaStatus('accelerator_profile', 'pro', 99);
  assert.equal(proAcceleratorQuota.hasUnlimited, true);
  assert.equal(proAcceleratorQuota.canUse, true);
  assert.equal(proAcceleratorQuota.remaining, Infinity);
});
