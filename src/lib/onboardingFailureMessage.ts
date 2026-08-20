export const ONBOARDING_SUPPORT_EMAIL = 'javier@creatives-takeover.com';

/**
 * Account setup is mandatory and has no way around it, so a founder who hits a
 * deterministic server failure here is trapped: the generic "please try again"
 * invites an endless retry loop that can never succeed. (This is exactly what
 * happened when a NOT NULL violation in a co-founder task trigger aborted
 * complete_onboarding_v1 -- founders retried five or more times and gave up.)
 *
 * So the first failure reads as transient, because usually it is. From the
 * second onwards we stop promising that retrying helps and hand over a real
 * route out, with a reference support can use to find the exact attempt.
 */
export function buildOnboardingFailureMessage(attempt: number, sessionId: string): string {
  if (attempt <= 1) {
    return 'We could not save your setup. Your answers are still here - please try again.';
  }

  const reference = sessionId ? ` Quote setup reference ${sessionId.slice(0, 8)}.` : '';
  return `Saving your setup is still failing on our side, so trying again will not fix it. `
    + `Your answers are safe.${reference} Email ${ONBOARDING_SUPPORT_EMAIL} and we will finish `
    + `setting up your account for you.`;
}
