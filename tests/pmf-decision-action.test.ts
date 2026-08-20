import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getPmfDecisionAction } from '../src/lib/pmfDecisionAction.ts';

test('verified Build routes to evidence-backed handoff while provisional Build remains manual', () => {
  const verifiedBuild = getPmfDecisionAction({
    analysisId: 'analysis-1',
    decision: 'build',
    evidenceGrade: 'decision_grade',
    pathwayEnabled: true,
  });
  assert.equal(verifiedBuild.destination, 'mvp_builder');
  assert.equal(verifiedBuild.route, '/mvp-builder?source=pmf-decision&pmf=analysis-1');

  const directionalBuild = getPmfDecisionAction({
    analysisId: 'analysis-2',
    decision: 'build',
    evidenceGrade: 'directional',
    nextExperiment: 'Interview five more operators.',
    pathwayEnabled: true,
  });
  assert.equal(directionalBuild.destination, 'mvp_builder');
  assert.equal(directionalBuild.route, '/mvp-builder?source=provisional-pmf&pmf=analysis-2');
  assert.match(directionalBuild.description, /stays Draft/);
});

test('Narrow and Pivot edit the exact ICP while Stop only reviews the recorded decision', () => {
  const narrow = getPmfDecisionAction({ analysisId: 'analysis-narrow', decision: 'narrow', evidenceGrade: 'decision_grade', icpAnalysisId: 'icp-1', validationContextId: 'context-1', pathwayEnabled: true });
  const pivot = getPmfDecisionAction({ analysisId: 'analysis-pivot', decision: 'pivot', evidenceGrade: 'decision_grade', icpAnalysisId: 'icp-1', pathwayEnabled: true });
  const stop = getPmfDecisionAction({ analysisId: 'analysis-stop', decision: 'stop', evidenceGrade: 'decision_grade', validationContextId: 'context-1', pathwayEnabled: true });
  assert.equal(narrow.route, '/icp/draft/icp-1?decision=narrow&context=context-1');
  assert.equal(pivot.route, '/icp/draft/icp-1?decision=pivot');
  assert.equal(stop.route, '/pmf-lab?outcome=analysis-stop&context=context-1');
  assert.equal(stop.ctaLabel, 'Review recorded decision');
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
