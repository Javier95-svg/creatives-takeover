import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isOnboardingSettled, markOnboardingSettled, clearOnboardingSettled } from '../src/lib/onboardingSettled.ts';

const frame = readFileSync('src/components/WorkspaceRouteFrame.tsx', 'utf8');
const entry = readFileSync('src/pages/AppEntry.tsx', 'utf8');
const skeleton = readFileSync('src/components/workspace/WorkspaceSkeleton.tsx', 'utf8');

test('the way in never shows a bare line of text on an empty page', () => {
  // Five words on a black background reads as broken rather than loading, and
  // it was what every gate rendered while two round trips resolved.
  for (const [name, source] of [['frame', frame], ['entry', entry]] as const) {
    assert.doesNotMatch(source, /className="min-h-screen bg-background p-8 text-foreground">Loading/, name);
    assert.doesNotMatch(source, /className="p-8">Loading your workspace/, name);
    assert.match(source, /<WorkspaceSkeleton \/>/, name);
  }
  assert.match(skeleton, /animate-pulse/);
});

test('the skeleton draws only the content area when the shell is already up', () => {
  // Otherwise the onboarding gate, which renders inside the shell on /, would
  // paint a second sidebar and header over the real ones.
  assert.match(skeleton, /const inShell = useWorkspaceFrame\(\);/);
  assert.match(skeleton, /if \(inShell\) return <WorkspaceContentSkeleton/);
  assert.match(skeleton, /export function WorkspaceContentSkeleton/);
});

test('a settled account does not pay for the onboarding check again', () => {
  assert.match(entry, /if \(profile\.isPending && !isOnboardingSettled\(user\.id\)\) return <WorkspaceSkeleton \/>;/);
  // The query still runs, so a remembered answer can only save a wait.
  assert.match(entry, /if \(redirectToOnboarding\) return <Navigate to="\/onboarding/);
  // And a failed read does not strip the workspace from someone already cleared.
  assert.match(entry, /if \(profile\.isError && !isOnboardingSettled\(user\.id\)\)/);
});

test('only the settled answer is remembered, and it is cleared on redirect', () => {
  // Remembering "still owed" would be the dangerous direction: it could trap a
  // founder in onboarding they had finished.
  const source = readFileSync('src/lib/onboardingSettled.ts', 'utf8');
  assert.match(source, /setItem\(`\$\{KEY_PREFIX\}\$\{userId\}`, '1'\)/);
  assert.match(entry, /if \(redirectToOnboarding\) clearOnboardingSettled\(user\.id\);/);
  assert.match(entry, /else markOnboardingSettled\(user\.id\);/);
});

test('the flag is per account and survives storage being unavailable', () => {
  const store = new Map<string, string>();
  const original = globalThis.window;
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
  try {
    assert.equal(isOnboardingSettled('user-a'), false);
    markOnboardingSettled('user-a');
    assert.equal(isOnboardingSettled('user-a'), true);
    assert.equal(isOnboardingSettled('user-b'), false, 'the flag must not leak between accounts');
    clearOnboardingSettled('user-a');
    assert.equal(isOnboardingSettled('user-a'), false);
    assert.equal(isOnboardingSettled(undefined), false);
  } finally {
    (globalThis as { window?: unknown }).window = original;
  }

  // Throwing storage, as in a private window, must not break the gate.
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    },
  };
  try {
    assert.equal(isOnboardingSettled('user-a'), false);
    markOnboardingSettled('user-a');
    clearOnboardingSettled('user-a');
  } finally {
    (globalThis as { window?: unknown }).window = original;
  }
});
