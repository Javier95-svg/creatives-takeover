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

test('homepage visitors confirm Founder or Builder instead of skipping the question', () => {
  assert.doesNotMatch(read('../src/components/AdaptiveOnboardingForm.tsx'), /skipSituation|skippedSituation/);
  assert.doesNotMatch(read('../src/pages/StartOnboarding.tsx'), /skipSituation/);
});
