import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getPmfDecisionAction } from '../src/lib/pmfDecisionAction.ts';

test('only a decision-grade Build routes into MVP Builder', () => {
  const verifiedBuild = getPmfDecisionAction({
    analysisId: 'analysis-1',
    decision: 'build',
    evidenceGrade: 'decision_grade',
  });
  assert.equal(verifiedBuild.destination, 'mvp_builder');
  assert.equal(verifiedBuild.route, '/mvp-builder?source=pmf-decision');

  const directionalBuild = getPmfDecisionAction({
    analysisId: 'analysis-2',
    decision: 'build',
    evidenceGrade: 'directional',
    nextExperiment: 'Interview five more operators.',
  });
  assert.equal(directionalBuild.destination, 'pmf_discovery');
  assert.equal(directionalBuild.route, '/pmf-lab');
});

test('Narrow, Pivot, and Stop remain in customer evidence gathering', () => {
  for (const decision of ['narrow', 'pivot', 'stop'] as const) {
    const action = getPmfDecisionAction({
      analysisId: `analysis-${decision}`,
      decision,
      evidenceGrade: 'decision_grade',
      nextExperiment: 'Test the next falsifiable assumption.',
    });
    assert.equal(action.destination, 'pmf_discovery');
    assert.equal(action.ctaLabel, 'Find the next customer');
  }
});

test('decision action migration is owner-scoped, idempotent, and hardens rate-limit storage', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260727120000_pmf_decision_actions_and_rate_limit_rls.sql', import.meta.url),
    'utf8',
  );

  assert.match(migration, /ALTER TABLE public\.api_rate_limits ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.api_rate_limits FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /assert_rate_limit[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = public/s);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /pmf_analysis_results[\s\S]*user_id = v_user_id/);
  assert.match(migration, /daily_tasks_pmf_decision_action_unique/);
  assert.match(migration, /ON CONFLICT \(user_id, recommendation_key\)/);
  assert.match(migration, /TO authenticated/);
});

test('client handoff and MVP evidence import both enforce the verified Build gate', () => {
  const pmfHook = readFileSync(new URL('../src/hooks/usePMFLab.ts', import.meta.url), 'utf8');
  const mvpEvidence = readFileSync(new URL('../src/lib/mvp-builder/journeyEvidence.ts', import.meta.url), 'utf8');

  assert.match(pmfHook, /saved\.evaluation\.status !== 'verified'/);
  assert.match(pmfHook, /nextAnalysis\.decision !== 'build'/);
  assert.match(pmfHook, /nextAnalysis\.evidenceGrade !== 'decision_grade'/);
  assert.match(mvpEvidence, /pmfOutcome\?\.status === 'verified'/);
  assert.match(mvpEvidence, /decision === 'build'/);
  assert.match(mvpEvidence, /evidenceGrade === 'decision_grade'/);
});
