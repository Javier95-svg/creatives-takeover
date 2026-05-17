import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('journey upgrade catalog maps tools to plan outcomes without fabricated metrics', () => {
  const source = readFileSync(new URL('../src/lib/journeyUpgradeCatalog.ts', import.meta.url), 'utf8');

  assert.match(source, /PLAN_JOURNEY_PROMISES/);
  assert.match(source, /rookie: "Orient and clarify"/);
  assert.match(source, /starter: "Validate demand"/);
  assert.match(source, /rising: "Build and launch"/);
  assert.match(source, /pro: "Fundraise and scale"/);
  assert.match(source, /PMF Lab/);
  assert.match(source, /MVP Builder/);
  assert.match(source, /Find Your Angel/);
  assert.doesNotMatch(source, /2x faster/);
});

test('dashboard shows journey recommendation before low-credit nudge', () => {
  const source = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
  const recommendationSource = readFileSync(new URL('../src/components/dashboard/JourneyNextStepCard.tsx', import.meta.url), 'utf8');
  const nudgeSource = readFileSync(new URL('../src/components/dashboard/StarterDashboardNudge.tsx', import.meta.url), 'utf8');

  assert.match(source, /<JourneyNextStepCard \/>[\s\S]*<StartupHomeCommandCenter \/>[\s\S]*<StarterDashboardNudge \/>/);
  assert.match(recommendationSource, /data-journey-next-step-card="true"/);
  assert.match(nudgeSource, /primaryJourneyCardVisible/);
  assert.match(nudgeSource, /ct:journey-next-step-visibility/);
});

test('journey recommendation card uses saved outputs, dismissal, and checkout flow', () => {
  const source = readFileSync(new URL('../src/components/dashboard/JourneyNextStepCard.tsx', import.meta.url), 'utf8');

  for (const table of [
    'icp_analysis_results',
    'waitlist_pages',
    'pmf_analysis_results',
    'pmf_validation_evidence',
    'mvp_builder_artifacts',
    'tech_stack_reports',
    'gtm_plans',
    'pitch_deck_analyses',
  ]) {
    assert.match(source, new RegExp(table));
  }

  assert.match(source, /ct_journey_next_step/);
  assert.match(source, /buildJourneyRecommendation/);
  assert.match(source, /createCheckout\(recommendation\.targetPlan, undefined, "monthly"\)/);
  assert.match(source, /trackJourneyRecommendationShown/);
  assert.match(source, /trackJourneyRecommendationClicked/);
});

test('milestones and preview cards expose tier-aware upgrade hints without passive modals', () => {
  const progressSource = readFileSync(new URL('../src/components/dashboard/BizMapJourneyProgress.tsx', import.meta.url), 'utf8');
  const gridSource = readFileSync(new URL('../src/components/dashboard/JourneyStageGrid.tsx', import.meta.url), 'utf8');

  assert.match(progressSource, /STAGE_REQUIRED_PLAN/);
  assert.match(progressSource, /validation: 'starter'/);
  assert.match(progressSource, /build: 'rising'/);
  assert.match(progressSource, /PLAN_JOURNEY_PROMISES/);
  assert.match(progressSource, /trackMilestoneUpgradeHintShown/);

  assert.match(gridSource, /trackSoftPreviewShown/);
  assert.match(gridSource, /trackSoftPreviewClicked/);
  assert.match(gridSource, /Preview/);
  assert.doesNotMatch(gridSource, /grayscale/);
  assert.doesNotMatch(gridSource, /cursor-not-allowed/);
});

test('analytics gateway exposes journey recommendation and preview events', () => {
  const source = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');

  for (const eventName of [
    'journey_recommendation_shown',
    'journey_recommendation_clicked',
    'soft_preview_shown',
    'soft_preview_clicked',
    'milestone_upgrade_hint_shown',
  ]) {
    assert.match(source, new RegExp(eventName));
  }
});
