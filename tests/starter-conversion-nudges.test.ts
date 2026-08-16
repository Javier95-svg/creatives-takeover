import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('pricing surfaces make Starter the visible first paid step', () => {
  const pricingSource = readFileSync(new URL('../src/components/Pricing.tsx', import.meta.url), 'utf8');
  const comparisonSource = readFileSync(new URL('../src/components/PricingComparison.tsx', import.meta.url), 'utf8');

  assert.match(pricingSource, /PLAN_CATALOG\.map/);
  assert.match(pricingSource, /starter: \{[^}]*highlight: "Most Popular"/);
  assert.match(pricingSource, /const isPopular = plan\.key === "starter"/);
  assert.match(pricingSource, /buttonVariant: "default"/);
  assert.match(pricingSource, /useState<BillingCycle>\("monthly"\)/);

  assert.match(comparisonSource, /PLAN_CATALOG\.map/);
  assert.match(comparisonSource, /isPopular: plan\.id === 'starter'/);
});

test('upgrade prompt gives Starter first-step treatment', () => {
  const source = readFileSync(new URL('../src/components/UpgradePromptDialog.tsx', import.meta.url), 'utf8');

  assert.match(source, /isStarterRecommendation = recommendedTier === "starter"/);
  assert.match(source, /Starter is your validation step/);
  assert.match(source, /Most popular/);
  assert.match(source, /createCheckout\(recommendedTier, undefined, "monthly", sourceTool \?\? 'upgrade_prompt'\)/);
  assert.match(source, /Upgrade to Starter - \$9\/mo/);
});

test('post-ICP activation opens interview work without an immediate paid prompt', () => {
  const source = readFileSync(new URL('../src/components/icp/ICPBuilder.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /shouldShowPostIcpStarterNudge/);
  assert.doesNotMatch(source, /Upgrade to Starter - \$9\/mo/);
  assert.match(source, /buildIcpUnlockNavigationPath\(analysisId\)/);
  assert.match(source, /Open my ICP brief/);
  assert.match(source, /first incomplete customer-interview task/);
});

test('legacy dashboard nudge logic remains available without cluttering the canonical command center', () => {
  const dashboardSource = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
  const nudgeSource = readFileSync(new URL('../src/components/dashboard/StarterDashboardNudge.tsx', import.meta.url), 'utf8');
  const analyticsSource = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(dashboardSource, /<StarterDashboardNudge \/>/);
  assert.match(nudgeSource, /show_starter_nudge_dismissed/);
  assert.match(nudgeSource, /onboardingCompleted/);
  assert.match(nudgeSource, /totalAvailable < 20/);
  assert.match(nudgeSource, /trigger: "dashboard_nudge"/);
  assert.match(nudgeSource, /createCheckout\("starter", undefined, "monthly", 'starter_dashboard_nudge'\)/);
  assert.match(nudgeSource, /You have \{totalAvailable\} credits left/);
  assert.match(analyticsSource, /'post_icp_nudge'/);
  assert.match(analyticsSource, /'dashboard_nudge'/);
});
