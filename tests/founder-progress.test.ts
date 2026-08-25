import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveFounderProgress } from '../src/lib/founderProgress.ts';

const ready = (tool: string, status = 'ready') => ({ tool, status, updated_at: '2026-08-25T00:00:00.000Z' });

test('draft-only artifacts never advance founder progress', () => {
  const progress = deriveFounderProgress({
    outcomes: [ready('icp_builder', 'draft')], firstCustomerSprintCompletedAt: null,
    fundraisingReadinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0,
  });
  assert.equal(progress.currentStage, 'IDENTITY');
  assert.equal(progress.completedAt.IDENTITY, null);
});

test('Launch needs both a ready GTM play and a completed First Customer Sprint', () => {
  const base = [ready('icp_builder'), ready('demo_studio'), ready('pmf_lab'), ready('mvp_builder'), ready('gtm_strategist')];
  const incomplete = deriveFounderProgress({ outcomes: base, firstCustomerSprintCompletedAt: null, fundraisingReadinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0 });
  assert.equal(incomplete.currentStage, 'LAUNCH');
  const complete = deriveFounderProgress({ outcomes: base, firstCustomerSprintCompletedAt: '2026-08-25T00:00:00.000Z', fundraisingReadinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0 });
  assert.equal(complete.currentStage, 'TRACTION');
});

test('Fundraising is eligible only after verified traction and never advances the operating stage', () => {
  const outcomes = ['icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist'].map((tool) => ready(tool));
  outcomes.push(ready('traction_engine', 'verified'));
  const progress = deriveFounderProgress({
    outcomes, firstCustomerSprintCompletedAt: '2026-08-25T00:00:00.000Z',
    fundraisingReadinessCompletedAt: '2026-08-25T01:00:00.000Z', pitchDeckCompletedAt: '2026-08-25T02:00:00.000Z', savedInvestorCount: 1,
  });
  assert.equal(progress.currentStage, 'TRACTION');
  assert.equal(progress.fundraisingOverlay.status, 'outreach_ready');
});
