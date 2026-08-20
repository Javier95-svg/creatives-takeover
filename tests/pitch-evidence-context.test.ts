import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPitchEvidenceContext } from '../src/lib/pitchEvidenceContext.ts';

test('pitch evidence context keeps the newest attributed outcome per journey tool', () => {
  const context = buildPitchEvidenceContext([
    { tool: 'pmf_lab', artifact_id: 'pmf-new', status: 'verified', updated_at: '2026-08-20T00:00:00Z', quality_checks: { decision: 'build', decision_grade: true }, evidence_manifest: { sources: [{}, {}] } },
    { tool: 'pmf_lab', artifact_id: 'pmf-old', status: 'draft', updated_at: '2026-08-10T00:00:00Z' },
    { tool: 'mvp_builder', artifact_id: 'mvp-1', status: 'ready', quality_checks: { primary_flow_works: true } },
    { tool: 'icp_builder', artifact_id: 'icp-ignored', status: 'ready' },
  ]);

  assert.match(context, /PMF Lab \| artifact pmf-new \| verified/);
  assert.match(context, /decision: build/);
  assert.match(context, /evidence sources: 2/);
  assert.match(context, /MVP Builder \| artifact mvp-1/);
  assert.doesNotMatch(context, /pmf-old|icp-ignored/);
});
