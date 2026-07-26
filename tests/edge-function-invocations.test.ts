import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// The July 2026 audit found three edge functions the frontend called that
// returned HTTP 404 in production. One of them, gmail-oauth-init, did not exist
// in the repo at all — nothing would ever have caught it, because CI only
// builds the Vite app and the Supabase workflow deploys a fixed list.
//
// This is the cheap half of the guard: every function name the frontend invokes
// must exist under supabase/functions/. It needs no credentials, so it runs on
// every PR. The other half — "in the repo but never deployed" — is handled by
// deploying the changed set in .github/workflows/supabase-production-deploy.yml.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = path.join(ROOT, 'src');
const FUNCTIONS_DIR = path.join(ROOT, 'supabase', 'functions');

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

// Only static names can be checked. A computed name (`invoke(fnName)`) is
// skipped rather than guessed at.
const INVOKE_PATTERN = /functions\.invoke\(\s*['"`]([a-zA-Z0-9._-]+)['"`]/g;

const collectInvocations = () => {
  const found = new Map<string, string[]>();
  for (const file of collectSourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    INVOKE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = INVOKE_PATTERN.exec(source))) {
      const name = match[1];
      const line = source.slice(0, match.index).split('\n').length;
      const ref = `${path.relative(ROOT, file).replace(/\\/g, '/')}:${line}`;
      found.set(name, [...(found.get(name) ?? []), ref]);
    }
  }
  return found;
};

const deployableFunctions = () =>
  new Set(
    readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name)
  );

test('every edge function the frontend invokes exists in supabase/functions', () => {
  const invoked = collectInvocations();
  const available = deployableFunctions();

  assert.ok(invoked.size > 0, 'expected to find functions.invoke() calls in src/');

  const missing = [...invoked.entries()]
    .filter(([name]) => !available.has(name))
    .map(([name, refs]) => `${name} (called from ${refs.join(', ')})`);

  assert.deepEqual(
    missing,
    [],
    'these function names have no directory under supabase/functions/ — they will 404 in production'
  );
});

test('every invoked edge function has an entrypoint that could be deployed', () => {
  const invoked = collectInvocations();
  const available = deployableFunctions();

  const withoutEntrypoint = [...invoked.keys()]
    .filter((name) => available.has(name))
    .filter((name) => {
      try {
        return !statSync(path.join(FUNCTIONS_DIR, name, 'index.ts')).isFile();
      } catch {
        return true;
      }
    });

  assert.deepEqual(withoutEntrypoint, [], 'each invoked function needs an index.ts to deploy');
});
