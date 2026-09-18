import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/VisitorNavbar.tsx', import.meta.url), 'utf8');

test('visitor navbar replaces Free Tools with the desktop brand lockup', () => {
  assert.doesNotMatch(source, /Free Tools/);
  assert.doesNotMatch(source, /FREE_TOOLS_NAV_ITEMS/);
  assert.match(source, /Creatives Takeover/);
  assert.match(source, /Think\. Test\. Ship\./);
  assert.match(source, /leading-tight xl:flex/);
  assert.match(source, /flex shrink-0 items-center gap-4/);
  assert.match(source, /xl:pr-5/);
  assert.match(source, /text-\[13px\]/);
  assert.match(source, /text-\[11px\]/);
  assert.match(source, /xl:pl-4/);
});

test('visitor navigation keeps the intended public destinations', () => {
  for (const label of ['Tour', 'Build', 'Connect', 'Media', 'About', 'Pricing']) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }
});

test('visitor links run Tour, Build, Connect, then About and Pricing', () => {
  // The render splits this array around the Media menu, taking the first three
  // before it and the rest after, so the array order is the navbar layout.
  const table = source.slice(source.indexOf('const visitorLinks'), source.indexOf('const mediaMenu'));
  const labels = [...table.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ['Tour', 'Build', 'Connect', 'About', 'Pricing']);
  // Connect replaced Guidance and keeps the same destination.
  assert.match(table, /label: "Connect", href: "\/mentorship"/);
  assert.doesNotMatch(table, /Guidance|Compass/);
});

test('visitor Media menu lists Newspaper before Podcast', () => {
  assert.match(source, /const mediaMenu:[\s\S]*?label: "Newspaper"[\s\S]*?label: "Podcast"/);
});
