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
  for (const label of ['Tour', 'Build', 'Collab', 'Newspaper', 'Podcast', 'About', 'Pricing']) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }
});

test('visitor links run Tour, Build, Collab, Newspaper, Podcast, then About and Pricing', () => {
  // Newspaper and Podcast replaced the Content menu (2026-09-30), so the array
  // order is the whole navbar layout.
  const start = source.indexOf('const visitorLinks');
  const table = source.slice(start, source.indexOf('];', start));
  const labels = [...table.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ['Tour', 'Build', 'Collab', 'Newspaper', 'Podcast', 'About', 'Pricing']);
  // Collab replaced Guidance and keeps the same destination.
  assert.match(table, /label: "Collab", href: "\/mentorship", icon: Handshake/);
  assert.doesNotMatch(table, /Guidance|Compass|Connect/);
});

test('visitor navbar has no Content menu any more', () => {
  assert.doesNotMatch(source, /const contentMenu|label: "Content"/);
});
