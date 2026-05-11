import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIcpDraftSaveFailureMessage,
  buildIcpDashboardHandoffMessage,
  readFunctionErrorDetails,
  readFunctionFailureDetails,
  toErrorMessage,
} from '../src/lib/icpHandoff.ts';

test('handoff message names task setup failures explicitly', () => {
  assert.equal(
    buildIcpDashboardHandoffMessage('insert_tasks'),
    "Your ICP Draft was saved, but we couldn't finish the first dashboard tasks. Open your draft now and retry the dashboard in a moment.",
  );
});

test('handoff message names recommendation setup failures explicitly', () => {
  assert.equal(
    buildIcpDashboardHandoffMessage('insert_recommendations'),
    "Your ICP Draft was saved, but we couldn't finish the dashboard recommendations. Open your draft now and retry the dashboard in a moment.",
  );
});

test('function failure details read the structured bootstrap step payload', async () => {
  const issue = await readFunctionFailureDetails({
    context: new Response(JSON.stringify({
      error: 'column "origin" does not exist',
      step: 'upsert_dashboard_file',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    }),
  });

  assert.deepEqual(issue, {
    step: 'upsert_dashboard_file',
    message: 'column "origin" does not exist',
  });
});

test('function failure details fall back to the client error message when the payload is opaque', async () => {
  const issue = await readFunctionFailureDetails(new Error('Request failed'));

  assert.deepEqual(issue, {
    step: 'bootstrap_dashboard',
    message: 'Request failed',
  });
  assert.equal(toErrorMessage('raw string'), 'raw string');
});

test('generic function error details parse credit metadata from the edge payload', async () => {
  const details = await readFunctionErrorDetails({
    context: new Response(JSON.stringify({
      error: 'Invalid credit amount',
      errorCode: 'DEDUCTION_FAILED',
      requiredCredits: 0,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 402,
    }),
  }, 'build_draft');

  assert.deepEqual(details, {
    step: 'build_draft',
    message: 'Invalid credit amount',
    errorCode: 'DEDUCTION_FAILED',
    requiredCredits: 0,
  });
});

test('ICP save failure message explains the zero-credit billing failure without generic copy', () => {
  assert.equal(
    buildIcpDraftSaveFailureMessage({
      message: 'Invalid credit amount',
      errorCode: 'DEDUCTION_FAILED',
      requiredCredits: 0,
    }),
    "We couldn't save your ICP Draft because the free-save check failed unexpectedly. Your answers are still on this page, so please try again in a moment.",
  );
});

test('ICP save failure message explains required credits when the user is out of credits', () => {
  assert.equal(
    buildIcpDraftSaveFailureMessage({
      message: 'Insufficient credits',
      errorCode: 'INSUFFICIENT_CREDITS',
      requiredCredits: 8,
    }),
    'You need 8 credits to save this ICP Draft. Upgrade or wait for your credits to reset, then try again.',
  );
});
