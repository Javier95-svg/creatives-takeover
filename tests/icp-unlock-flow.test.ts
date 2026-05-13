import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ICP_GUEST_VISIBLE_SECTIONS,
  buildIcpUnlockNavigationPath,
  isIcpDraftSaveReady,
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
