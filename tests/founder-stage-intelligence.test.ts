import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('operating stage excludes goals, blockers, and fundraising as maturity evidence', async () => {
  const diagnostic = await read('../src/lib/stageDiagnostic.ts');

  assert.match(diagnostic, /type CapitalMotion = "inactive" \| "preparing" \| "active"/);
  assert.match(diagnostic, /const assignedStage = maxStageFromScores\(scores\)/);
  assert.doesNotMatch(diagnostic, /add\(scores,\s*7/);
  assert.match(diagnostic, /fundraising_intent_without_market_evidence/);
});

test('stage intelligence persists an owner-scoped evidence ledger and stable state', async () => {
  const migration = await read('../supabase/migrations/20260730150000_founder_stage_intelligence_v1.sql');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.founder_stage_evidence/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.founder_stage_state/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.founder_stage_assessments/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /record_founder_stage_evidence_v1/);
  assert.match(migration, /sync_founder_stage_state_v1/);
  assert.match(migration, /v_verified_count >= 1 OR v_support_count >= 2/);
  assert.match(migration, /user_override_until/);
  assert.match(migration, /stage_stale = p_candidate_stage < v_next_stage/);
});

test('founders receive explanations, corrections, and one adjacent boundary question', async () => {
  const [model, hook, card, dashboard] = await Promise.all([
    read('../src/lib/stageIntelligence.ts'),
    read('../src/hooks/useStageIntelligence.ts'),
    read('../src/components/dashboard/FounderStageIntelligenceCard.tsx'),
    read('../src/pages/Dashboard.tsx'),
  ]);

  assert.match(model, /key: `stage-boundary-\$\{lowerStage\}-\$\{upperStage\}`/);
  assert.match(model, /Math\.abs\(firstStage - secondStage\) !== 1/);
  assert.match(model, /getStageExplanation/);
  assert.match(hook, /confirmFounderStage/);
  assert.match(hook, /answerFounderStageBoundary/);
  assert.match(card, /We placed you here because/);
  assert.match(card, /Looks right/);
  assert.match(card, /Not quite/);
  assert.match(card, /Fundraising \{state\.capital_motion\}/);
  assert.match(dashboard, /<DashboardFocusEditor \/>[\s\S]*<FounderStageIntelligenceCard \/>[\s\S]*<FounderJourneyPanel \/>/);
});

test('meaningful artifacts trigger evidence recording and immediate recalculation', async () => {
  const [model, retention] = await Promise.all([
    read('../src/lib/stageIntelligence.ts'),
    read('../src/lib/retentionSystem.ts'),
  ]);

  assert.match(model, /demo_studio_draft:[\s\S]*stageSupported: 2/);
  assert.match(model, /pmf_decision_report:[\s\S]*stageSupported: 3[\s\S]*reliability: 0\.85/);
  assert.match(model, /mvp_scope:[\s\S]*stageSupported: null/);
  assert.match(model, /gtm_plan:[\s\S]*stageSupported: null/);
  assert.match(model, /traction_weekly_log:[\s\S]*stageSupported: 6/);
  assert.match(model, /pitch_deck_analysis:[\s\S]*stageSupported: null/);
  assert.match(model, /syncFounderStageState\(assessment, `artifact:\$\{params\.artifactType\}`\)/);
  assert.match(retention, /recordArtifactStageEvidence/);
  assert.doesNotMatch(retention, /\}, true\);\s*[\r\n]+\s*\/\/ FIX\(retention\)/);
  assert.doesNotMatch(retention, /\}, !hasFirstArtifact\);/);
});

test('confidence changes dashboard behavior and calibration is unique-user based', async () => {
  const [mission, journeyHook, onboardingHook, admin, migration] = await Promise.all([
    read('../supabase/functions/generate-daily-mission/index.ts'),
    read('../src/hooks/useFounderJourneySnapshot.ts'),
    read('../src/hooks/useOnboardingContext.ts'),
    read('../src/pages/AdminAnalytics.tsx'),
    read('../supabase/migrations/20260730150000_founder_stage_intelligence_v1.sql'),
  ]);

  assert.match(mission, /founder_stage_state/);
  assert.match(mission, /confidence_band === "low"/);
  assert.match(mission, /stageFromIntelligence/);
  assert.match(mission, /Stage VI - Traction/);
  assert.match(journeyHook, /stageIntelligence\?\.current_stage/);
  assert.match(onboardingHook, /refreshedContext/);
  assert.match(onboardingHook, /persisted\.capitalMotion \?\? refreshedContext\.capitalMotion/);
  assert.match(admin, /Founder stage calibration/);
  assert.match(admin, /get_founder_stage_accuracy_v1/);
  assert.match(migration, /SELECT DISTINCT ON \(user_id\) \*/);
  assert.match(migration, /confidenceBands/);
  assert.match(migration, /confusionMatrix/);
});
