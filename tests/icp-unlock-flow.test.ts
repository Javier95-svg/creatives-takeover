import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ICP_GUEST_VISIBLE_SECTIONS,
  buildIcpSaveExistingArtifactRequest,
  buildIcpSaveFallbackPreviewRequest,
  buildIcpUnlockNavigationPath,
  isIcpDraftSaveReady,
  isZeroCreditDeductionFailureDetails,
  runIcpPostSaveSteps,
} from '../src/lib/icpUnlockFlow.ts';

test('guest ICP preview reveals customer and pain before account creation', () => {
  assert.deepEqual([...ICP_GUEST_VISIBLE_SECTIONS], ['customer', 'pain']);
});

test('saved ICP draft unlock is gated only by draft_ready and analysis id', () => {
  const response = {
    success: true,
    status: 'draft_ready',
    analysisId: 'icp-analysis-123',
  };

  assert.equal(isIcpDraftSaveReady(response), true);
  assert.equal(buildIcpUnlockNavigationPath(response.analysisId), '/icp/draft/icp-analysis-123?source=icp-unlock');
});

test('guest preview unlock persists the existing artifact without a credit mode', () => {
  const artifact = { draftDocument: { customer: { personaName: 'Focused Founder' } } };
  const request = buildIcpSaveExistingArtifactRequest(artifact);

  assert.deepEqual(request, {
    operation: 'save_existing_artifact',
    artifact,
  });
  assert.equal('mode' in request, false);
});

test('zero-credit deduction failures use preview then save-existing fallback requests', () => {
  const saveRequest = {
    operation: 'build_draft' as const,
    mode: 'save' as const,
    entryMode: 'fast' as const,
    fastInput: { description: 'A detailed founder idea long enough for the ICP builder.' },
  };

  assert.equal(isZeroCreditDeductionFailureDetails({
    errorCode: 'DEDUCTION_FAILED',
    requiredCredits: 0,
  }), true);
  assert.deepEqual(buildIcpSaveFallbackPreviewRequest(saveRequest), {
    ...saveRequest,
    mode: 'preview',
  });
  assert.deepEqual(buildIcpSaveExistingArtifactRequest({ id: 'artifact' }), {
    operation: 'save_existing_artifact',
    artifact: { id: 'artifact' },
  });
});

test('post-save handoff failures do not reject the ICP unlock flow', async () => {
  const failures: Array<{ step: string; message: string }> = [];
  const completed: string[] = [];

  await assert.doesNotReject(() =>
    runIcpPostSaveSteps(
      [
        {
          name: 'markFirstArtifactCreated',
          run: async () => {
            completed.push('markFirstArtifactCreated');
          },
        },
        {
          name: 'bootstrap-icp-dashboard',
          run: async () => {
            throw new Error('permission denied for table dashboard_files');
          },
        },
        {
          name: 'refreshActivation',
          run: async () => {
            completed.push('refreshActivation');
          },
        },
      ],
      (step, error) => {
        failures.push({
          step,
          message: error instanceof Error ? error.message : String(error),
        });
      },
    ),
  );

  assert.deepEqual(completed, ['markFirstArtifactCreated', 'refreshActivation']);
  assert.deepEqual(failures, [
    {
      step: 'bootstrap-icp-dashboard',
      message: 'permission denied for table dashboard_files',
    },
  ]);
});
