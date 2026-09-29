import {
  deriveOnboardingContextV1,
  EMPTY_ONBOARDING_ANSWERS_V1,
  type OnboardingAnswersV1,
  type OnboardingContextV1,
} from '../../../src/lib/onboardingContext.ts';
import { onboardingAnswersProblem } from '../../../src/lib/onboardingAnswerRules.ts';
import { isActivationIntent } from '../../../src/lib/activationIntent.ts';

/**
 * Server-owned onboarding context.
 *
 * The browser used to send the stage, loop and routine it had worked out, and
 * the database stored them as given. Here the answers are validated and the
 * context is derived again with the same code, so what is stored always
 * follows from the answers. Only the first-action recommendation is taken from
 * the browser, because it depends on plan and feature availability that this
 * function does not see; the stage never is.
 */

type Json = Record<string, unknown>;
type RpcError = { message: string; code?: string } | null;
export type OnboardingRpcClient = {
  rpc: (fn: string, args: Json) => PromiseLike<{ data: unknown; error: RpcError }>;
};

const MAX_BODY_CHARS = 40000;
// Errors raised by the onboarding functions themselves carry a message meant
// for the founder; anything else is an internal failure.
const CLIENT_ERROR_CODES = new Set(['P0001', '22023', 'P0002', '42501']);

function asObject(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : null;
}

export function deriveServerContext(answers: Json, clientContext: Json | null): OnboardingContextV1 {
  const full = { ...EMPTY_ONBOARDING_ANSWERS_V1, ...answers } as OnboardingAnswersV1;
  const derived = deriveOnboardingContextV1(full, {
    flowVersion: clientContext?.flowVersion === 'control_v6' ? 'control_v6' : 'adaptive_v1',
    selectedIntent: isActivationIntent(clientContext?.selectedIntent) ? clientContext.selectedIntent : undefined,
    dataCompleteness: clientContext?.dataCompleteness === 'legacy_partial' ? 'legacy_partial' : 'complete',
  });
  const recommendedIntent = isActivationIntent(clientContext?.recommendedIntent)
    ? clientContext.recommendedIntent
    : derived.recommendedIntent;
  const reasonCodes = Array.isArray(clientContext?.recommendationReasonCodes)
    ? (clientContext.recommendationReasonCodes as unknown[])
      .filter((code): code is string => typeof code === 'string')
      .slice(0, 10)
      .map((code) => code.slice(0, 60))
    : derived.recommendationReasonCodes;
  return {
    ...derived,
    recommendedIntent,
    recommendationAccepted: derived.selectedIntent === recommendedIntent,
    recommendationReasonCodes: reasonCodes,
  };
}

export async function handleOnboardingContext(
  db: OnboardingRpcClient,
  userId: string,
  body: unknown,
): Promise<{ status: number; body: Json }> {
  const request = asObject(body);
  if (!request || JSON.stringify(request).length > MAX_BODY_CHARS) {
    return { status: 400, body: { error: 'Invalid onboarding request' } };
  }
  const action = request.action;
  if (action !== 'complete' && action !== 'focus') {
    return { status: 400, body: { error: 'Unknown onboarding action' } };
  }
  const answers = asObject(request.answers);
  if (!answers) return { status: 400, body: { error: 'Answers must be an object' } };
  const problem = onboardingAnswersProblem(answers);
  if (problem) return { status: 400, body: { error: problem } };

  const clientContext = asObject(request.clientContext);
  // A focus edit sends only the changed answers; the stage must be derived
  // from the full set, which the client merges before sending.
  const fullAnswers = asObject(request.fullAnswers) ?? answers;
  if (fullAnswers !== answers) {
    const fullProblem = onboardingAnswersProblem(fullAnswers);
    if (fullProblem) return { status: 400, body: { error: fullProblem } };
  }
  const context = deriveServerContext(fullAnswers, clientContext);

  // The routine is built in the browser (it needs date formatting). Keep it
  // only when it was built for the goal derived here, otherwise the database
  // keeps the routine it already has.
  const routineConfig = clientContext?.routineGoal === context.routineGoal ? asObject(request.routineConfig) : null;

  const { data, error } = action === 'complete'
    ? await db.rpc('complete_onboarding_as_v1', {
      p_user: userId,
      p_session_id: typeof request.sessionId === 'string' ? request.sessionId : null,
      p_answers: answers,
      p_context: context,
      p_profile_updates: asObject(request.profileUpdates) ?? {},
      p_preference_patch: asObject(request.preferencePatch) ?? {},
      p_routine_goal: context.routineGoal,
      p_routine_config: routineConfig,
    })
    : await db.rpc('update_onboarding_focus_as_v1', {
      p_user: userId,
      p_answer_patch: answers,
      p_context: context,
      p_routine_goal: context.routineGoal,
      p_routine_config: routineConfig,
    });

  if (error) {
    if (error.code && CLIENT_ERROR_CODES.has(error.code)) return { status: 400, body: { error: error.message } };
    console.error('Onboarding context write failed', error);
    return { status: 500, body: { error: 'Could not save your onboarding answers. Please try again.' } };
  }
  return { status: 200, body: { session: data, context } };
}
