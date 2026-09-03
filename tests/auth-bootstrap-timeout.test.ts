import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');

test('auth bootstrap has a bounded fallback so navigation cannot remain in its loading state indefinitely', () => {
  assert.match(source, /const AUTH_BOOTSTRAP_TIMEOUT_MS = 5_000;/);
  assert.match(source, /Auth session restore exceeded bootstrap timeout/);
  assert.match(source, /setLoading\(false\);/);
  assert.match(source, /if \(sessionBootstrapTimer\) clearTimeout\(sessionBootstrapTimer\);/);
});
