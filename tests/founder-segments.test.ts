import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../supabase/migrations/20261014120000_stated_segments.sql');

test('stated labels are backfilled from onboarding answers, never over a reviewed type', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS segment_stated_at timestamptz/);
  const backfill = migration.slice(migration.indexOf('WITH stated AS'), migration.indexOf('CREATE OR REPLACE FUNCTION public.mark_segment_stated'));
  assert.match(backfill, /WHEN 'existing_project' THEN 'founder'\s*WHEN 'starting_project' THEN 'builder'/);
  // The first quiz version had no situation question; its direct choice counts.
  assert.match(backfill, /ELSE s\.answers->>'founderSegment'/);
  assert.match(backfill, /AND p\.user_type IN \('founder', 'builder'\)/);
  assert.match(backfill, /AND p\.segment_stated_at IS NULL;/);
});

test('finishing onboarding with the situation answer marks the label as stated', () => {
  const trigger = migration.slice(migration.indexOf('FUNCTION public.mark_segment_stated'), migration.indexOf('FUNCTION public.state_founder_segment'));
  assert.match(trigger, /NEW\.answers->>'situation' IN \('existing_project', 'starting_project'\)/);
  assert.match(trigger, /AFTER INSERT OR UPDATE OF status ON public\.onboarding_sessions/);
  assert.match(trigger, /REVOKE ALL ON FUNCTION public\.mark_segment_stated\(\) FROM PUBLIC, anon, authenticated;/);
});

test('only founders and builders can state a segment, and each change is logged', () => {
  const state = migration.slice(migration.indexOf('FUNCTION public.state_founder_segment'), migration.indexOf('FUNCTION public.segment_check_needed'));
  assert.match(state, /IF v_user IS NULL THEN RAISE EXCEPTION/);
  assert.match(state, /p_segment NOT IN \('founder', 'builder'\)/);
  // A mentor, provider or investor can never become a founder this way.
  assert.match(state, /IF v_from IS NULL OR v_from NOT IN \('founder', 'builder'\) THEN\s*RAISE EXCEPTION/);
  assert.match(state, /'segment_stated', jsonb_build_object\('from', v_from, 'to', p_segment, 'source', v_source\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.state_founder_segment\(text, text\) FROM PUBLIC, anon;/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.segment_check_needed\(\) FROM PUBLIC, anon;/);
  // Accounts still in onboarding are asked there.
  assert.match(migration, /segment_stated_at IS NULL AND COALESCE\(p\.onboarding_completed, false\)/);
});

test('the workspace asks once, never on top of the project prompt, and reuses the onboarding statements', () => {
  const gate = read('../src/components/workspace/SegmentCheckGate.tsx');
  assert.match(gate, /const open = selfServe && check\.data === true && !dismissed && !setupLoading && !needsSetup;/);
  assert.match(gate, /if \(error\) return false;/);
  assert.match(gate, /ONBOARDING_SITUATIONS\.find/);
  assert.match(gate, /rpc\('state_founder_segment' as never, \{ p_segment: segment, p_source: 'prompt' \}/);
  assert.match(read('../src/components/workspace/WorkspaceLive.tsx'), /<ProjectSetupGate \/>[\s\S]*?<SegmentCheckGate \/>/);
});

test('builders are only offered answers that can be true when starting from scratch', async () => {
  const { ANSWER_OPTIONS, BUILDER_ANSWER_OPTIONS, isOfferedAnswer } = await import('../src/lib/onboardingAnswerRules.ts');
  for (const field of ['evidenceState', 'primaryGoal', 'blocker'] as const) {
    for (const code of BUILDER_ANSWER_OPTIONS[field]) assert.ok((ANSWER_OPTIONS[field] as readonly string[]).includes(code), `${field}: ${code}`);
  }
  for (const [field, value] of [['primaryGoal', 'raise'], ['primaryGoal', 'reach_three_customers'], ['evidenceState', 'payment'], ['blocker', 'fundraising'], ['blocker', 'sales_conversion']] as const) {
    assert.equal(isOfferedAnswer('builder', field, value), false, `${field}: ${value}`);
    assert.equal(isOfferedAnswer('founder', field, value), true, `${field}: ${value}`);
  }
  assert.equal(isOfferedAnswer('builder', 'primaryGoal', 'validate_problem'), true);
});

test('a builder still exploring starts by comparing ideas; one with an idea is unchanged', async () => {
  const { EMPTY_ONBOARDING_ANSWERS_V1, recommendIntentFromAnswers } = await import('../src/lib/onboardingContext.ts');
  const base = { ...EMPTY_ONBOARDING_ANSWERS_V1, founderSegment: 'builder' as const, primaryGoal: 'validate_problem' as const, blocker: 'customer_clarity' as const, evidenceState: 'none' as const };
  assert.equal(recommendIntentFromAnswers({ ...base, builderStartingPoint: 'exploring' }, 1).intent, 'start_validation');
  assert.equal(recommendIntentFromAnswers({ ...base, builderStartingPoint: 'idea_chosen' }, 1).intent, 'run_icp');
  assert.equal(recommendIntentFromAnswers({ ...base, founderSegment: 'founder', builderStartingPoint: 'exploring' }, 1).intent, 'run_icp');
  // A builder who needs a co-founder is still sent to people first.
  assert.equal(recommendIntentFromAnswers({ ...base, builderStartingPoint: 'exploring', blocker: 'team' }, 1).intent, 'find_mentor');

  const { recommendActivation } = await import('../src/lib/activationJourneyV2.ts');
  const input = { assignedStage: 1 as const, blocker: 'customer_clarity' as const, productStatus: 'idea_only' as const };
  assert.equal(recommendActivation({ ...input, builderExploring: true }).intent, 'start_validation');
  assert.equal(recommendActivation({ ...input, builderExploring: false }).intent, 'run_icp');
  // Without Decision Sprint on their plan, the usual rule applies.
  assert.equal(recommendActivation({ ...input, builderExploring: true, availableIntents: ['run_icp', 'find_mentor'] }).intent, 'run_icp');
});

test('homepage visitors confirm Founder or Builder instead of skipping the question', () => {
  assert.doesNotMatch(read('../src/components/AdaptiveOnboardingForm.tsx'), /skipSituation|skippedSituation/);
  assert.doesNotMatch(read('../src/pages/StartOnboarding.tsx'), /skipSituation/);
});
