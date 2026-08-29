import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const displaySource = readFileSync(new URL('../src/components/CreditDisplay.tsx', import.meta.url), 'utf8');
const responsiveSource = readFileSync(new URL('../src/styles/responsive-overrides.css', import.meta.url), 'utf8');

test('navigation credit balance stays inside the viewport with a thin scrollbar', () => {
  assert.match(displaySource, /credit-balance-dropdown-scroll/);
  assert.match(displaySource, /max-h-\[var\(--radix-dropdown-menu-content-available-height\)\]/);
  assert.match(displaySource, /overflow-y-auto/);
  assert.match(responsiveSource, /\.credit-balance-dropdown-scroll[\s\S]*?scrollbar-width: thin/);
  assert.match(responsiveSource, /\.credit-balance-dropdown-scroll::\-webkit-scrollbar \{[\s\S]*?width: 6px/);
});
