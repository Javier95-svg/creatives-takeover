import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPTY_ONBOARDING_ANSWERS_V1 } from '../src/lib/onboardingContext.ts';

const migration = readFileSync('supabase/migrations/20260919120000_project_is_mandatory_for_founders.sql', 'utf8');
const quiz = readFileSync('src/components/AdaptiveOnboardingForm.tsx', 'utf8');
const gate = readFileSync('src/components/workspace/ProjectSetupGate.tsx', 'utf8');
const hook = readFileSync('src/hooks/useProjectSetup.ts', 'utf8');

test('providers are exempt by the same signals that tag them in search', () => {
  // If these ever diverged, somebody labelled Mentor in the account search would
  // still be nagged for a project, or the reverse.
  assert.match(migration, /FROM public\.mentors m\s*\n\s*WHERE m\.user_id = target_id AND COALESCE\(m\.is_active, true\)/);
  assert.match(migration, /FROM public\.services s\s*\n\s*WHERE s\.delivered_by_user_id = target_id AND COALESCE\(s\.is_active, true\)/);
  assert.match(migration, /'requiresProject', auth\.uid\(\) IS NOT NULL AND NOT public\.is_service_provider\(auth\.uid\(\)\)/);
});

test('the rule reads the caller only, and archived projects do not count', () => {
  // Definer because it reads mentors and services, so the search_path is pinned
  // and every predicate is scoped to auth.uid().
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = public/);
  assert.match(migration, /WHERE p\.user_id = auth\.uid\(\) AND p\.archived_at IS NULL/);
});

test('the prompt defaults to asking nobody while the answer is loading', () => {
  // The opposite default would flash the dialog at every mentor on every load.
  // The defaults moved to useAccountContext, which is now the single call the
  // workspace makes for who is signed in; useProjectSetup is a read over it.
  const context = readFileSync('src/hooks/useAccountContext.ts', 'utf8');
  assert.match(context, /requiresProject: false,\s*\n\s*hasProject: true,/);
  assert.match(context, /query\.data \?\? DEFAULT_ACCOUNT_CONTEXT/);
  assert.match(hook, /useAccountContext\(\)/);
  assert.match(hook, /needsSetup: requiresProject && !hasProject/);
  assert.match(gate, /if \(!needsSetup\) return null;/);
});

test('the prompt can be closed, so a misfiring exemption cannot lock anyone out', () => {
  assert.match(gate, /Not now/);
  // And it returns, because it is driven by the status rather than by a
  // remembered dismissal.
  assert.match(gate, /if \(!isLoading && needsSetup\) setOpen\(true\);/);
});

test('the quiz collects a project name so new accounts never reach the prompt', () => {
  assert.ok('projectName' in EMPTY_ONBOARDING_ANSWERS_V1);
  assert.equal(EMPTY_ONBOARDING_ANSWERS_V1.projectName, '');
  assert.match(quiz, /if \(!answers\.projectName\.trim\(\)\) return 'Give your project a name/);
  assert.match(quiz, /startup_name: answers\.projectName\.trim\(\) \|\| undefined,/);
  // The field renders, and the component it uses is imported. tsc does not
  // cover this file, so nothing else would have caught a missing import.
  assert.match(quiz, /<Input\b/);
  assert.match(quiz, /import \{ Input \} from '@\/components\/ui\/input';/);
});
