import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gate = readFileSync('src/components/AdminRoute.tsx', 'utf8');
const auth = readFileSync('src/contexts/AuthContext.tsx', 'utf8');

test('the admin gate waits for the session before deciding', () => {
  // AuthContext starts with user null and loading true. Deciding on that first
  // render sent every directly opened or hard refreshed admin URL to the
  // homepage, which read as the page loading forever rather than as a bounce.
  assert.match(auth, /const \[user, setUser\] = useState<User \| null>\(null\);/);
  assert.match(auth, /const \[loading, setLoading\] = useState\(true\);/);
  assert.match(gate, /const \{ user, loading \} = useAuth\(\);/);
  const decision = gate.indexOf('Navigate to="/"');
  const wait = gate.indexOf('if (loading)');
  assert.ok(wait > 0 && wait < decision, 'the loading check must come before the redirect');
});

test('the wait is bounded, so the gate cannot hang', () => {
  // A gate that waits forever on a stalled session would be worse than the
  // bounce it replaces.
  assert.match(auth, /AUTH_BOOTSTRAP_TIMEOUT_MS = 5_000/);
});

test('a resolved non-admin is still turned away', () => {
  assert.match(gate, /user\?\.email\?\.toLowerCase\(\) !== ADMIN_EMAIL/);
  assert.match(gate, /Navigate to="\/" replace/);
});
