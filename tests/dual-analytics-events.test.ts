import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('browser analytics gateway sends typed business events to Amplitude and PostHog', () => {
  const source = read('../src/lib/analytics.ts');

  assert.match(source, /@amplitude\/analytics-browser/);
  assert.match(source, /posthog-js/);
  assert.match(source, /amplitude\.track\(eventName/);
  assert.match(source, /posthogClient\.capture\(eventName/);
  assert.match(source, /export interface SignupCompletedProps/);
  assert.match(source, /export interface OnboardingCompletedProps/);
  assert.match(source, /export interface FirstToolUsedProps/);
  assert.match(source, /export interface ICPBuilderCompletedProps/);
  assert.match(source, /export interface CreditExhaustedProps/);
  assert.match(source, /export interface UpgradePromptShownProps/);
});

test('identity uses safe user dimensions and excludes profile PII', () => {
  const source = read('../src/contexts/AuthContext.tsx');
  const identifyBlock = source.slice(source.indexOf('identify(userId'), source.indexOf('// ─── Step 3'));

  assert.match(identifyBlock, /subscription_tier/);
  assert.match(identifyBlock, /days_since_signup/);
  assert.match(identifyBlock, /onboarding_completed/);
  assert.doesNotMatch(identifyBlock, /email/);
  assert.doesNotMatch(identifyBlock, /full_name/);
  assert.doesNotMatch(identifyBlock, /username/);
});

test('sign-out and account switches reset both analytics identities and pending queues', () => {
  const analytics = read('../src/lib/analytics.ts');
  const authContext = read('../src/contexts/AuthContext.tsx');

  assert.match(analytics, /export const resetAnalyticsIdentity/);
  assert.match(analytics, /queuedEvents\.length = 0/);
  assert.match(analytics, /queuedIdentifies\.length = 0/);
  assert.match(analytics, /resetAmplitude\(\)/);
  assert.match(analytics, /posthogClient\.reset\(\)/);
  assert.match(analytics, /posthogResetPending/);
  assert.match(authContext, /previousUserIdRef\.current !== nextUserId[\s\S]*resetAnalyticsIdentity\(\)/);
  assert.match(authContext, /event === 'SIGNED_OUT'[\s\S]*resetAnalyticsIdentity\(\)/);
});

test('signup completion is centralized after profile confirmation', () => {
  const authContext = read('../src/contexts/AuthContext.tsx');
  const authPage = read('../src/pages/Auth.tsx');
  const signupPage = read('../src/pages/Signup.tsx');
  const callbackPage = read('../src/pages/AuthCallback.tsx');

  assert.match(authContext, /!profileExistedBeforeSignIn && profileExists/);
  assert.match(authContext, /trackSignupCompleted\(\{/);
  assert.doesNotMatch(authPage, /trackSignupCompleted\(\{/);
  assert.doesNotMatch(signupPage, /trackAnalyticsSignupCompleted/);
  assert.doesNotMatch(callbackPage, /trackSignupCompleted/);
});

test('icp completion uses canonical event and removes legacy raw event', () => {
  const source = read('../src/components/icp/ICPBuilder.tsx');

  assert.match(source, /trackICPBuilderCompleted\(\{/);
  assert.match(source, /time_to_complete_seconds/);
  assert.match(source, /credits_used: 0/);
  assert.doesNotMatch(source, /icp_analysis_completed/);
});

test('backend credit deduction emits first tool and credit exhaustion events with guards', () => {
  const source = read('../supabase/functions/_shared/credit-deduction.ts');
  const emitter = read('../supabase/functions/_shared/analytics.ts');

  assert.match(emitter, /https:\/\/api2\.amplitude\.com\/2\/httpapi/);
  assert.match(emitter, /POSTHOG_PROJECT_API_KEY/);
  assert.match(source, /getCreditAnalyticsContext/);
  assert.match(source, /priorDeductCount === 0/);
  assert.match(source, /eventName: 'first_tool_used'/);
  assert.match(source, /creditsRemaining === 0/);
  assert.match(source, /eventName: 'credit_exhausted'/);
});
