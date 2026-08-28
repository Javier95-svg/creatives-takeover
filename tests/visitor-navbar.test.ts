import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/VisitorNavbar.tsx', import.meta.url), 'utf8');

test('visitor navbar replaces Free Tools with the desktop brand lockup', () => {
  assert.doesNotMatch(source, /Free Tools/);
  assert.doesNotMatch(source, /FREE_TOOLS_NAV_ITEMS/);
  assert.match(source, /Creatives Takeover/);
  assert.match(source, /Think\. Build\. Ship\. Connect\./);
  assert.match(source, /leading-tight xl:flex/);
});

test('visitor navigation keeps the intended public destinations', () => {
  for (const label of ['Build', 'Guidance', 'Marketplace', 'Content', 'About', 'Pricing']) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }
});
