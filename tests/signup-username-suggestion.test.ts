import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const signup = read('../src/pages/Signup.tsx');
const lib = read('../src/lib/username.ts');

test('the username field asks for a handle rather than offering to skip it', () => {
  const field = signup.slice(signup.indexOf('{/* Username Field */}'), signup.indexOf('{/* Email Field */}'));

  assert.doesNotMatch(field, /\(optional\)/);
  assert.doesNotMatch(field, /You can customize this now or change it later/);
  assert.match(field, /placeholder=\{`e\.g\. \$\{usernameExample\}`\}/);
  assert.match(field, /Create one for me\./);
  assert.match(field, /onClick=\{handleSuggestUsername\}/);
  // A <button type="button"> — a bare <a> or <p> would either submit the form
  // or not be reachable by keyboard.
  assert.match(field, /<button\s+type="button"/);
});

test('suggestions are built from the name the form already has', () => {
  assert.match(lib, /export function suggestUsername/);
  assert.match(lib, /firstName/);
  assert.match(lib, /lastName/);
  // `avoid` is what makes a second click produce a second handle.
  assert.match(lib, /suggestUsername\(seed: UsernameSeed, avoid\?: string\)/);
  assert.match(signup, /suggestUsername\(\s*\{ firstName: formData\.firstName, lastName: formData\.lastName, email: formData\.email \},\s*formData\.username,/);
});

test('suggestions cannot contain a character the validator strips', () => {
  // normalizeUsernameInput removes dots, so a jordan.s style candidate would
  // silently arrive as "jordans" and read as a bug.
  const candidates = lib.slice(lib.indexOf('const buildCandidates'), lib.indexOf('export interface UsernameSeed'));
  assert.doesNotMatch(candidates, /\$\{first\}\.\$|\$\{last\}\.\$|\."/);
  // Every candidate is run through the shared normalizer before being returned.
  assert.match(lib, /const finalize = \(raw: string\): string => \{[\s\S]*?normalizeUsernameInput\(raw\)/);
  assert.match(lib, /VALIDATION\.MIN_USERNAME_LENGTH/);
  assert.match(lib, /VALIDATION\.MAX_USERNAME_LENGTH/);
});

test('the placeholder rotates between five examples, fixed per mount', () => {
  const examples = lib.slice(
    lib.indexOf('export const USERNAME_PLACEHOLDER_EXAMPLES'),
    lib.indexOf('export function randomUsernameExample'),
  );
  assert.equal((examples.match(/"/g) ?? []).length / 2, 5, 'expected exactly five examples');

  // Every example must survive the normalizer untouched, or the field would
  // advertise a handle it refuses to accept.
  for (const example of examples.match(/"([a-z0-9_]+)"/g) ?? []) {
    const value = example.replaceAll('"', '');
    assert.match(value, /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/, `${value} must be a valid username`);
  }

  // useState(fn) rather than a call during render: otherwise the example would
  // reshuffle on every keystroke elsewhere in the form.
  assert.match(signup, /useState\(randomUsernameExample\)/);
  assert.doesNotMatch(signup, /randomUsernameExample\(\)/);
});
