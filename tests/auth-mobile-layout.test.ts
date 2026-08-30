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
