import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldRedirectToGuidedOnboarding } from '../src/lib/guidedOnboarding.ts';
import { REVIEWED_USER_TYPES, SELF_SERVE_USER_TYPES } from '../src/lib/accountTypes.ts';

const migration = readFileSync('supabase/migrations/20260920120000_account_context_and_application_submit.sql', 'utf8');
const applications = readFileSync('src/lib/accountApplications.ts', 'utf8');
const hook = readFileSync('src/hooks/useAccountContext.ts', 'utf8');
const entry = readFileSync('src/pages/AppEntry.tsx', 'utf8');
const shell = readFileSync('src/components/dashboard/DashboardShell.tsx', 'utf8');

/** The state the quiz used to leave a mentor in: flag set, nothing completed. */
const STUCK = { user_preferences: { requires_guided_onboarding: true }, onboarding_completed: false };

test('a reviewed type is never sent back into the founder quiz', () => {
  // This is the lockout. Without the guard, / and /dashboard redirected to
  // /onboarding forever, which re-showed the founder quiz at step 0.
  for (const userType of REVIEWED_USER_TYPES) {
    assert.equal(shouldRedirectToGuidedOnboarding({ ...STUCK, user_type: userType }), false, userType);
  }
});

test('founders and builders are still sent to onboarding when they owe it', () => {
  // The guard must not become a hole that skips onboarding for everyone.
  for (const userType of SELF_SERVE_USER_TYPES) {
    assert.equal(shouldRedirectToGuidedOnboarding({ ...STUCK, user_type: userType }), true, userType);
  }
  assert.equal(shouldRedirectToGuidedOnboarding(STUCK), true, 'no user_type at all');
  assert.equal(shouldRedirectToGuidedOnboarding({ ...STUCK, user_type: 'nonsense' }), true);
  // And an account that has finished is still left alone.
  assert.equal(shouldRedirectToGuidedOnboarding({ ...STUCK, onboarding_completed: true }), false);
});

test('the gates read user_type, or the guard could never fire', () => {
  assert.match(entry, /select\('onboarding_completed, dashboard_bootstrap_source, user_preferences, user_type'\)/);
  assert.match(shell, /user_preferences, sidebar_preferences, user_type'\)/);
});

test('submitting settles the account in one statement', () => {
  // An update plus an insert from the client would race anything else touching
  // user_preferences, and would leave the account half settled if the second
  // call failed.
  assert.match(applications, /supabase\.rpc\('submit_account_application' as never/);
  assert.doesNotMatch(applications, /\.from\('account_applications'\)\.insert/);
  assert.match(migration, /onboarding_completed = true,/);
  assert.match(migration, /quiz_completed = true,/);
  assert.match(migration, /user_preferences = COALESCE\(user_preferences, '\{\}'::jsonb\) - 'requires_guided_onboarding'/);
  // Only the three reviewed types may use it, whatever the client sends.
  assert.match(migration, /IF p_user_type NOT IN \('mentor', 'marketplace', 'investor'\) THEN/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = public/);
});

test('account context exposes no category access before a validated response', () => {
  assert.match(hook, /hasCategoryAccess: false/);
  assert.match(hook, /row.hasCategoryAccess === true/);
  assert.ok(hook.includes("throw new Error('Account details are unavailable"));
  const shell = readFileSync('src/components/workspace/WorkspaceLive.tsx', 'utf8');
  assert.ok(shell.includes('if (accountLoading) return'));
  assert.ok(shell.includes('if (accountError) return'));
});

test('the context is one call that the whole workspace shares', () => {
  assert.match(hook, /queryKey: \['account-context', userId\]/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.account_context\(\)/);
  // useProjectSetup reads it rather than asking the same question again.
  const projectSetup = readFileSync('src/hooks/useProjectSetup.ts', 'utf8');
  assert.match(projectSetup, /useAccountContext\(\)/);
  assert.doesNotMatch(projectSetup, /supabase\.rpc/);
});

test('a pending account keeps the platform and loses only its category', () => {
  const banner = readFileSync('src/components/workspace/AccountReviewBanner.tsx', 'utf8');
  assert.match(banner, /if \(!awaitingReview\) return null;/);
  assert.match(banner, /full access to the platform and the network/);
  // Founders and builders are approved by construction, so they can never see it.
  assert.match(migration, /COALESCE\(p\.user_type, 'founder'\) IN \('founder', 'builder'\)\s*\n\s*OR COALESCE\(p\.approval_status, 'approved'\) = 'approved'/);
});
