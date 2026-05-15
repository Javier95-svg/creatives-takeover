import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('pricing surfaces make Starter the visible first paid step', () => {
  const pricingSource = readFileSync(new URL('../src/components/Pricing.tsx', import.meta.url), 'utf8');
  const comparisonSource = readFileSync(new URL('../src/components/PricingComparison.tsx', import.meta.url), 'utf8');

  assert.match(pricingSource, /key: "rookie"[\s\S]*key: "starter"[\s\S]*key: "rising"[\s\S]*key: "pro"/);
  assert.match(pricingSource, /key: "starter"[\s\S]*highlight: "Most Popular"/);
  assert.match(pricingSource, /const isPopular = plan\.key === "starter"/);
  assert.match(pricingSource, /buttonVariant: "default"/);
  assert.match(pricingSource, /useState<BillingCycle>\("monthly"\)/);

  assert.match(comparisonSource, /\{ key: "starter", name: "Starter", price: "\$9", period: "\/month", isPopular: true \}/);
  assert.doesNotMatch(comparisonSource, /\{ key: "rising", name: "Rising", price: "\$29", period: "\/month", isPopular: true \}/);
});

test('upgrade prompt gives Starter first-step treatment', () => {
  const source = readFileSync(new URL('../src/components/UpgradePromptDialog.tsx', import.meta.url), 'utf8');

  assert.match(source, /isStarterRecommendation = recommendedTier === "starter"/);
  assert.match(source, /Starter is your validation step/);
  assert.match(source, /Most popular/);
  assert.match(source, /createCheckout\(recommendedTier, undefined, "monthly"\)/);
  assert.match(source, /Upgrade to Starter - \$9\/mo/);
});

test('post-ICP nudge appears only after first Rookie ICP and uses Starter checkout', () => {
  const source = readFileSync(new URL('../src/components/icp/ICPBuilder.tsx', import.meta.url), 'utf8');

  assert.match(source, /shouldShowPostIcpStarterNudge/);
  assert.match(source, /normalizePlan\(subscriptionTier\) !== "rookie"/);
  assert.match(source, /\.select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(source, /\.neq\("id", analysisId\)/);
  assert.match(source, /Your ICP is live\. Now validate the demand behind it\./);
  assert.match(source, /Starter gives you 100 credits\/month/);
  assert.match(source, /trigger: "post_icp_nudge"/);
  assert.match(source, /createCheckout\("starter", undefined, "monthly"\)/);
  assert.match(source, /location: "post_icp_nudge"/);
});

test('dashboard nudge targets low-credit onboarded Rookie users', () => {
  const dashboardSource = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
  const nudgeSource = readFileSync(new URL('../src/components/dashboard/StarterDashboardNudge.tsx', import.meta.url), 'utf8');
  const analyticsSource = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');

  assert.match(dashboardSource, /<StarterDashboardNudge \/>/);
  assert.match(nudgeSource, /show_starter_nudge_dismissed/);
  assert.match(nudgeSource, /onboardingCompleted/);
  assert.match(nudgeSource, /totalAvailable < 20/);
  assert.match(nudgeSource, /trigger: "dashboard_nudge"/);
  assert.match(nudgeSource, /createCheckout\("starter", undefined, "monthly"\)/);
  assert.match(nudgeSource, /You have \{totalAvailable\} credits left/);
  assert.match(analyticsSource, /'post_icp_nudge'/);
  assert.match(analyticsSource, /'dashboard_nudge'/);
});
