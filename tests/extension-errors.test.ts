import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isBrowserExtensionError } from '../src/lib/extensionErrors.ts';

const withStack = (stack: string) => Object.assign(new TypeError("Cannot read properties of undefined (reading 'M_ID')"), { stack });

test('errors thrown inside a browser extension are recognised', () => {
  // The exact error seen on 2026-11-19, ten times a second on the homepage.
  const real = withStack("TypeError: Cannot read properties of undefined (reading 'M_ID')\n    at h (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js:1:761)\n    at C (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js:1:1442)");
  assert.equal(isBrowserExtensionError(real), true);
  assert.equal(isBrowserExtensionError(withStack('Error\n    at f (moz-extension://abc/content.js:3:9)')), true);
  assert.equal(isBrowserExtensionError(new Error('x'), 'chrome-extension://abc/content.js'), true);
});

test('our own errors are always reported', () => {
  assert.equal(isBrowserExtensionError(withStack('Error\n    at a (https://creatives-takeover.com/assets/index.js:2:10)')), false);
  // Our code called from an extension frame still counts as ours.
  assert.equal(isBrowserExtensionError(withStack('Error\n    at a (chrome-extension://abc/x.js:1:1)\n    at b (https://creatives-takeover.com/assets/index.js:2:10)')), false);
  assert.equal(isBrowserExtensionError(new Error('no stack frames')), false);
  assert.equal(isBrowserExtensionError('string reason'), false);
  assert.equal(isBrowserExtensionError(undefined), false);
});

test('both global listeners skip extension errors before reporting', () => {
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.match(main, /unhandledrejection[\s\S]{0,200}isBrowserExtensionError\(event\.reason\)/);
  assert.match(main, /addEventListener\('error'[\s\S]{0,120}isBrowserExtensionError\(event\.error, event\.filename\)/);
});
