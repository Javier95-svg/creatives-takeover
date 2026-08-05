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

test('dashboard keeps the journey prominent and founder signals focused', () => {
  const source = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');
  const founderSignals = readFileSync(new URL('../src/components/dashboard/StartupHomeCommandCenter.tsx', import.meta.url), 'utf8');

  assert.match(source, /<DashboardTodayCockpit \/>[\s\S]*<FounderJourneyPanel \/>/);
  assert.match(source, /<DashboardDisclosure[\s\S]*<StartupHomeCommandCenter \/>[\s\S]*<\/DashboardDisclosure>/);
  assert.doesNotMatch(source, /<JourneyNextStepCard \/>|<StarterDashboardNudge \/>/);
  assert.match(founderSignals, /title="Your startup info"/);
  assert.match(founderSignals, /Connect, Share & Grow/);
  assert.doesNotMatch(
    founderSignals,
    /Ideal Customer|Positioning And Competition|Validation And PMF|Tech Stack And Budget|Startup Development Cycle Outputs/,
  );
});

test('journey recommendation card uses saved outputs, dismissal, and checkout flow', () => {
  const source = readFileSync(new URL('../src/components/dashboard/JourneyNextStepCard.tsx', import.meta.url), 'utf8');

  for (const table of [
    'icp_analysis_results',
    'pmf_analysis_results',
    'pmf_validation_evidence',
    'mvp_builder_artifacts',
    'tech_stack_reports',
    'gtm_plans',
    'pitch_deck_analyses',
  ]) {
    assert.match(source, new RegExp(table));
  }

  // The prototype stage is no longer a direct waitlist_pages read: Demo Studio replaced
  // the waitlist builder, so the signal comes from loadPrototypeStageArtifact, which
  // checks demo_studio_demos and waitlist_pages together.
  assert.match(source, /loadPrototypeStageArtifact/);

  assert.match(source, /ct_journey_next_step/);
  assert.match(source, /buildJourneyRecommendation/);
  assert.match(source, /createCheckout\(recommendation\.targetPlan, undefined, "monthly", 'journey_next_step'\)/);
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
