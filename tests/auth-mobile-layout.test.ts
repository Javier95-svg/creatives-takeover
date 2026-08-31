import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const pages = [
  ['signup', '../src/pages/Signup.tsx'],
  ['login', '../src/pages/Login.tsx'],
] as const;

for (const [name, path] of pages) {
  test(`${name} shows only the form on phones`, () => {
    const source = read(path);
    const aside = source.slice(source.indexOf('<aside'), source.indexOf('</aside>'));

    // The promo panel used to take the whole first screen and push the form
    // below the fold, so account creation began with a scroll.
    assert.match(aside, /signup-premium-left-panel/);
    assert.match(aside, /\bhidden\b/);
    assert.match(aside, /md:flex\b/);
    assert.doesNotMatch(aside, /h-\[44vmax\]/);

    // The form panel must not reserve space for a panel that isn't rendered.
    assert.match(source, /signup-premium-right-panel md:ml-\[50vw\]/);
  });

  test(`${name} does not do promo work on phones`, () => {
    const source = read(path);

    // display:none still downloads eager images; lazy ones are never fetched.
    const aside = source.slice(source.indexOf('<aside'), source.indexOf('</aside>'));
    assert.match(aside, /loading="lazy"/);

    // Rotating a hidden carousel re-renders the whole page every 3.6s while
    // someone is typing into the form.
    assert.match(source, /matchMedia\('\(min-width: 768px\)'\)/);
    assert.match(source, /query\.addEventListener\('change', sync\)/);
  });
}

test('sign-in stacks the remember/forgot row on phones', () => {
  const source = read('../src/pages/Login.tsx');
  const start = source.indexOf('Remember Me + Forgot Password');
  assert.ok(start > -1, 'remember/forgot row not found');
  const row = source.slice(start, source.indexOf('Forgot your password?', start));

  // Side by side the two labels overflow a 360px card and wrap mid-phrase.
  assert.match(row, /flex flex-col[^"]*sm:flex-row/);
  assert.doesNotMatch(row, /"flex items-center justify-between"/);

  // Radix renders Checkbox as a button, which the global mobile rule at
  // index.css:2639 stretches to 44x44 — a large empty square, not a checkbox.
  assert.match(row, /className="no-touch-target"/);
  // The row itself stays a comfortable target, and the label toggles it.
  assert.match(row, /min-h-11/);
  assert.match(row, /htmlFor="rememberMe"[^>]*cursor-pointer/);
});

test('both auth pages use a two-step form on phones only', () => {
  for (const [name, path] of pages) {
    const source = read(path);

    // The gate must be the mobile hook, not a CSS breakpoint: the step machine
    // is stateful and desktop must keep rendering one complete form.
    assert.match(source, /useIsMobile/, `${name} must branch on useIsMobile`);
    assert.match(source, /const showStepTwo = !isMobile \|\| mobileStep === 2/, `${name} step gate`);

    // Enter in the email field on step 1 would otherwise submit the whole form
    // and fail validation on fields the user has not been shown yet.
    const submit = source.slice(source.indexOf('handleSubmit = async'), source.indexOf('handleSubmit = async') + 400);
    assert.match(submit, /isMobile && mobileStep === 1/, `${name} must guard submit on step 1`);

    // Providers render above the form on mobile and inside it on desktop, so
    // exactly one of the two instances is ever mounted.
    assert.equal((source.match(/<AuthSocialButtons/g) ?? []).length, 2, `${name} provider blocks`);
    assert.match(source, /\{!isMobile && \(/, `${name} must keep the desktop provider block`);
  }
});

test('the password field stays mounted while hidden on step one', () => {
  // Password managers need the password input in the DOM next to the email one
  // to offer autofill, so step one hides it rather than unmounting it.
  for (const [name, path] of pages) {
    const source = read(path);
    assert.match(
      source,
      /className=\{showStepTwo \? "space-y-2" : "hidden"\}/,
      `${name} must hide rather than unmount the password field`,
    );
  }
});
