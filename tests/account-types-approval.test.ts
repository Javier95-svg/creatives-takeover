import { ONBOARDING_SITUATIONS, classifyOnboardingSituation } from '../src/lib/onboardingClassification.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REVIEWED_USER_TYPES, SELF_SERVE_USER_TYPES, USER_TYPE_LABEL,
  hasCategoryAccess, isReviewedUserType,
} from '../src/lib/accountTypes.ts';

const migration = readFileSync('supabase/migrations/20260919150000_account_types_and_approval.sql', 'utf8');
const quiz = readFileSync('src/components/AdaptiveOnboardingForm.tsx', 'utf8');
const fn = readFileSync('supabase/functions/send-account-application-email/index.ts', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

test('situational answers automatically classify all five categories', () => {
  assert.deepEqual(ONBOARDING_SITUATIONS.map(([answer]) => classifyOnboardingSituation(answer)), ['founder','builder','mentor','marketplace','investor']);
  for (const value of ['founder','mentor','marketplace','invalid',null,undefined]) assert.equal(classifyOnboardingSituation(value),'');
  assert.ok(ONBOARDING_SITUATIONS.every(([,title,description]) => title.length>15 && description.length>15));
});

test('the reviewed types end the quiz and file a request', () => {
  assert.deepEqual([...REVIEWED_USER_TYPES], ['mentor', 'marketplace', 'investor']);
  assert.deepEqual([...SELF_SERVE_USER_TYPES], ['founder', 'builder']);
  assert.equal(isReviewedUserType('mentor'), true);
  assert.equal(isReviewedUserType('founder'), false);
  assert.match(quiz, /if \(currentStep === 0 && isReviewedType\(answers\.founderSegment\)\) \{/);
  assert.match(quiz, /await submitAccountApplication\(\{/);
  assert.match(quiz, /Thanks, your request has been sent\./);
  assert.match(quiz, /We will email you after review\./);
  // The branch returns, so nothing after the first step runs for them.
  const branch = quiz.slice(
    quiz.indexOf('if (currentStep === 0 && isReviewedType'),
    quiz.indexOf('if (currentStep === CORE_STEPS - 1)'),
  );
  assert.match(branch, /^\s*return;\s*$/m);
});

test('category access needs approval for the reviewed types only', () => {
  for (const type of SELF_SERVE_USER_TYPES) {
    assert.equal(hasCategoryAccess(type, 'pending'), true, type);
  }
  for (const type of REVIEWED_USER_TYPES) {
    assert.equal(hasCategoryAccess(type, 'pending'), false, type);
    assert.equal(hasCategoryAccess(type, 'rejected'), false, type);
    assert.equal(hasCategoryAccess(type, 'approved'), true, type);
  }
});

test('founder and builder can never be left waiting for a review', () => {
  assert.match(migration, /CHECK \(user_type NOT IN \('founder', 'builder'\) OR approval_status = 'approved'\)/);
  assert.match(migration, /ALTER COLUMN approval_status SET DEFAULT 'approved'/);
  // Only the three reviewed types can reach the applications table at all.
  assert.match(migration, /user_type text NOT NULL CHECK \(user_type IN \('mentor', 'marketplace', 'investor'\)\)/);
});

test('an applicant cannot approve themselves', () => {
  // No UPDATE policy for the applicant, and the decision RPC checks the role
  // itself rather than trusting the caller or the route guard.
  assert.match(migration, /CREATE POLICY "Admins review requests"[\s\S]*?USING \(public\.is_admin_user\(\)\) WITH CHECK \(public\.is_admin_user\(\)\);/);
  assert.match(migration, /IF NOT public\.is_admin_user\(\) THEN\s*\n\s*RAISE EXCEPTION 'Only an administrator can review account applications';/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.queue_account_application_email\(uuid, text\) FROM PUBLIC, anon, authenticated;/);
  assert.match(app, /path="\/admin\/account-requests" element=\{<AdminRoute>/);
});

test('a decision is recorded once and emailed once', () => {
  assert.match(migration, /IF v_app\.status <> 'pending' THEN\s*\n\s*RETURN jsonb_build_object\('status', v_app\.status, 'alreadyReviewed', true\);/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS account_application_email_once/);
  assert.match(migration, /ON CONFLICT \(application_id, kind\) DO NOTHING/);
  // One pending request per account, but re-applying after a rejection is fine
  // because the index only covers the pending row.
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS account_applications_one_pending\s*\n\s*ON public\.account_applications \(user_id\) WHERE status = 'pending';/);
});

test('the three emails exist, are service only, and carry no dashes', () => {
  for (const kind of ['admin_alert', 'approved', 'rejected']) {
    assert.ok(fn.includes('"' + kind + '"'), 'missing ' + kind);
  }
  assert.match(fn, /verify_outbox_secret/);
  assert.match(fn, /outboxSecretValid !== true/);
  assert.match(fn, /status: 401/);
  // The applicant address comes from auth, not from the submitted row, so a
  // decision email cannot be redirected by what was typed into the quiz.
  assert.match(fn, /supabase\.auth\.admin\.getUserById\(application\.user_id\)/);
  const copy = (fn.match(/subject: `[^`]*`/g) ?? []).join(' ');
  assert.ok(copy.length > 0, 'expected subjects to parse');
  assert.doesNotMatch(copy, /[—–]/);
  assert.match(fn, /Creatives Takeover is a business development platform/);
});

test('every category has a label for the review screen', () => {
  for (const type of ['founder', 'builder', ...REVIEWED_USER_TYPES] as const) {
    assert.ok(USER_TYPE_LABEL[type], type);
  }
});
