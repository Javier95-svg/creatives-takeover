import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('pre-build lineage is additive, owner scoped, and leaves legacy artifacts unassigned', () => {
  const migration = read('supabase/migrations/20260801180000_prebuild_value_chain_hardening.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.prebuild_validation_contexts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.pmf_interviews/);
  assert.match(migration, /validation_context_id UUID/);
  assert.match(migration, /is_explicitly_unscoped/);
  assert.doesNotMatch(migration, /UPDATE\s+public\.(demo_studio_projects|pmf_surveys|pmf_analysis_results)[\s\S]*validation_context_id/i);
});

test('ICP hands its exact draft to Demo before PMF', () => {
  const icp = read('src/components/icp/ICPBuilder.tsx');
  const draft = read('src/pages/IcpDraftPage.tsx');
  const service = read('supabase/functions/journey-outcome-service/index.ts');
  assert.match(icp, /destinationTool:\s*'demo_studio'/);
  assert.match(icp, /validationContextId:\s*context\.id/);
  assert.match(draft, /navigate\(`\/demo-studio\?icp=/);
  assert.match(draft, /I already have conversations/);
  assert.match(service, /icp_builder:\s*\['demo_studio'\]/);
});

test('public evidence can only become authoritative through verified edge ingestion', () => {
  const migration = read('supabase/migrations/20260801180000_prebuild_value_chain_hardening.sql');
  const events = read('src/lib/demoStudio/events.ts');
  const scorer = read('supabase/functions/pmf-evidence-scorer/index.ts');
  assert.match(migration, /DROP POLICY IF EXISTS "demo_studio_events_public_insert"/);
  assert.match(migration, /demo_events_verified_participant_unique/);
  assert.match(events, /functions\.invoke\('demo-studio-event'/);
  assert.match(scorer, /fetchStoredInterviews/);
  assert.match(scorer, /fetchSurveyEvidence/);
  assert.match(scorer, /\.eq\('verified', true\)/);
  assert.doesNotMatch(scorer, /body\.surveyEvidence/);
});

test('Demo completion action follows the selected validation goal', () => {
  const player = read('src/components/demo-studio/player/DemoPlayer.tsx');
  const launch = read('src/pages/demo-studio/PublicLaunchPage.tsx');
  assert.match(player, /demoGoal === 'validate_interest'/);
  assert.match(player, /sendResponse\('interested'\)/);
  assert.match(player, /sendResponse\('not_for_me'\)/);
  assert.match(player, /demoGoal === 'book_calls'/);
  assert.match(player, /'commitment'/);
  assert.match(launch, /demoGoal === 'collect_signups'/);
});

test('PMF refuses implicit latest-record mixing and persists interview CRUD by context', () => {
  const page = read('src/pages/PMFLabPage.tsx');
  const form = read('src/components/pmf/PMFEvidenceForm.tsx');
  const store = read('src/hooks/usePMFInterviews.ts');
  assert.match(page, /Which idea are you evaluating\?/);
  assert.match(page, /Create an unscoped evidence case/);
  assert.match(page, /usePMFInterviews\(user\?\.id, validationContextId/);
  assert.match(form, /onSaveInterview/);
  assert.match(form, /onDeleteInterview/);
  assert.match(form, /onImportInterviews/);
  assert.match(store, /validation_context_id/);
  assert.match(store, /\.upsert\(/);
  assert.match(store, /\.delete\(\)/);
});

