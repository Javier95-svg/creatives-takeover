import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveServerContext, handleOnboardingContext } from '../supabase/functions/_shared/onboarding-context.ts';
import { onboardingAnswersProblem } from '../src/lib/onboardingAnswerRules.ts';
import { deriveOnboardingContextV1, EMPTY_ONBOARDING_ANSWERS_V1 } from '../src/lib/onboardingContext.ts';

const answers = {
  situation: 'existing_project', projectName: 'Throughline',
  startupBrief: 'We help agencies turn client calls into project briefs.',
  businessModel: 'service', evidenceState: 'none', primaryGoal: 'validate_problem', blocker: 'customer_clarity',
  weeklyCapacityHours: 5, runwayMonths: 'not_applicable', selectedIntent: 'run_icp', sectors: ['FinTech'], workingDays: [1, 3],
};

function stubDb(result: { data?: unknown; error?: { message: string; code?: string } | null } = {}) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: result.data ?? { id: 'session' }, error: result.error ?? null };
    },
  };
}

test('answer rules accept the quiz options and reject anything else', () => {
  assert.equal(onboardingAnswersProblem(answers), null);
  assert.equal(onboardingAnswersProblem({ ...answers, businessModel: '' }), null);
  assert.match(onboardingAnswersProblem({ ...answers, businessModel: 'crypto' }) ?? '', /businessModel/);
  assert.match(onboardingAnswersProblem({ ...answers, weeklyCapacityHours: 7 }) ?? '', /weeklyCapacityHours/);
  assert.match(onboardingAnswersProblem({ ...answers, sectors: ['Not a sector'] }) ?? '', /sectors/);
  assert.match(onboardingAnswersProblem({ ...answers, sectors: new Array(13).fill('SaaS') }) ?? '', /sectors/);
  assert.match(onboardingAnswersProblem({ ...answers, workingDays: [7] }) ?? '', /workingDays/);
  assert.match(onboardingAnswersProblem({ ...answers, selectedIntent: 'hack' }) ?? '', /selectedIntent/);
});

test('the stage is derived on the server, whatever stage the browser claims', async () => {
  const db = stubDb();
  const forged = { assignedStage: 7, founderLoop: 'GROW', selectedIntent: 'run_icp', recommendedIntent: 'run_icp' };
  const result = await handleOnboardingContext(db, 'user-1', { action: 'complete', sessionId: 's-1', answers, clientContext: forged });
  assert.equal(result.status, 200);
  assert.equal(db.calls[0].fn, 'complete_onboarding_as_v1');
  assert.equal(db.calls[0].args.p_user, 'user-1');
  const expected = deriveOnboardingContextV1({ ...EMPTY_ONBOARDING_ANSWERS_V1, ...answers } as never);
  const stored = db.calls[0].args.p_context as Record<string, unknown>;
  assert.equal(stored.assignedStage, expected.assignedStage);
  assert.notEqual(stored.assignedStage, 7);
  assert.equal(stored.founderLoop, expected.founderLoop);
});

test('the browser keeps only its first-action choice, validated', () => {
  const context = deriveServerContext(answers, { selectedIntent: 'find_mentor', recommendedIntent: 'plan_gtm', recommendationReasonCodes: ['entitlement_fallback'] });
  assert.equal(context.selectedIntent, 'find_mentor');
  assert.equal(context.recommendedIntent, 'plan_gtm');
  assert.equal(context.recommendationAccepted, false);
  const invalid = deriveServerContext(answers, { selectedIntent: 'hack', recommendedIntent: 'also_hack' });
  assert.notEqual(invalid.selectedIntent, 'hack');
  assert.notEqual(invalid.recommendedIntent, 'also_hack');
});

test('invalid answers never reach the database', async () => {
  const db = stubDb();
  const result = await handleOnboardingContext(db, 'user-1', { action: 'complete', answers: { ...answers, blocker: 'boredom' } });
  assert.equal(result.status, 400);
  assert.equal(db.calls.length, 0);
  assert.equal((await handleOnboardingContext(db, 'user-1', { action: 'delete', answers })).status, 400);
  assert.equal((await handleOnboardingContext(db, 'user-1', 'not an object')).status, 400);
});

test('a focus edit derives the stage from the full answers, not only the changed ones', async () => {
  const db = stubDb();
  const full = { ...answers, evidenceState: 'payment', customerCountBand: '3' };
  await handleOnboardingContext(db, 'user-1', { action: 'focus', answers: { evidenceState: 'payment', customerCountBand: '3' }, fullAnswers: full });
  assert.equal(db.calls[0].fn, 'update_onboarding_focus_as_v1');
  const expected = deriveOnboardingContextV1({ ...EMPTY_ONBOARDING_ANSWERS_V1, ...full } as never);
  assert.equal((db.calls[0].args.p_context as Record<string, unknown>).assignedStage, expected.assignedStage);
});

test('a routine built for a different goal is not stored', async () => {
  const db = stubDb();
  await handleOnboardingContext(db, 'user-1', { action: 'complete', answers, clientContext: { routineGoal: 'raise_funding' }, routineConfig: { tasks: [] } });
  assert.equal(db.calls[0].args.p_routine_config, null);
  const matching = stubDb();
  const goal = deriveServerContext(answers, null).routineGoal;
  await handleOnboardingContext(matching, 'user-1', { action: 'complete', answers, clientContext: { routineGoal: goal }, routineConfig: { tasks: [] } });
  assert.deepEqual(matching.calls[0].args.p_routine_config, { tasks: [] });
});

test('database messages meant for the founder pass through; internal errors do not', async () => {
  const known = await handleOnboardingContext(stubDb({ error: { message: 'Project name is required', code: 'P0001' } }), 'u', { action: 'complete', answers });
  assert.deepEqual([known.status, known.body.error], [400, 'Project name is required']);
  const internal = await handleOnboardingContext(stubDb({ error: { message: 'relation does not exist', code: '42P01' } }), 'u', { action: 'complete', answers });
  assert.equal(internal.status, 500);
  assert.doesNotMatch(String(internal.body.error), /relation/);
});
