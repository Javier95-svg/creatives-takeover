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

const linkTable = (name: string) => {
  const start = source.indexOf(`const ${name}`);
  const table = source.slice(start, source.indexOf('];', start));
  return { table, labels: [...table.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]) };
};

test('visitor navigation keeps the intended public destinations', () => {
  for (const label of ['For programs', 'How it works', 'Build', 'Collab', 'News', 'Podcast', 'About', 'Pricing']) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }
});

test('the bar is For programs plus Explore', () => {
  // B2B2C repositioning (2026-10-16): the bar stays short. Founders are the
  // obvious audience and investors wait for case studies, so neither has an
  // entry. Tour became "How it works" on the same route.
  const { table, labels } = linkTable('visitorLinks');
  assert.deepEqual(labels, ['For programs']);
  assert.match(table, /label: "For programs", href: "\/for-programs"/);
  assert.equal(source.match(/<DropdownMenuTrigger/g)?.length, 1, 'one dropdown: Explore');
  assert.match(source, /<DropdownMenuTrigger[\s\S]*?Explore/);
});

test('everything else sits in the Explore menu', () => {
  const { table, labels } = linkTable('exploreLinks');
  assert.deepEqual(labels, ['How it works', 'Build', 'Collab', 'News', 'Podcast', 'About', 'Pricing']);
  // Collab replaced Guidance and keeps the same destination.
  assert.match(table, /label: "Collab", href: "\/mentorship", icon: Handshake/);
  assert.doesNotMatch(table, /Guidance|Compass|Connect/);
});

test('visitor navbar has no Content menu any more', () => {
  assert.doesNotMatch(source, /const contentMenu|label: "Content"/);
});
