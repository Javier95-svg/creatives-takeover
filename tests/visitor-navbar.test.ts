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
  for (const label of ['How it works', 'Explore', 'Enterprise', 'Build', 'Collab', 'News', 'Podcast', 'About', 'Pricing']) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }
});

test('the bar runs How it works, Explore, Enterprise, About, Pricing', () => {
  // Order requested 2026-10-16. Tour became "How it works" on the same route,
  // and Enterprise is the programs page. Explore is the only menu.
  const { table, labels } = linkTable('visitorEntries');
  assert.deepEqual(labels, ['How it works', 'Explore', 'Enterprise', 'About', 'Pricing']);
  assert.match(table, /label: "Explore", links: exploreLinks/);
  assert.match(table, /label: "Enterprise", href: "\/enterprise"/);
  assert.equal(source.match(/<DropdownMenuTrigger/g)?.length, 1, 'one dropdown, rendered for the Explore entry');
});

test('Explore holds Build, Collab, News and Podcast', () => {
  const { table, labels } = linkTable('exploreLinks');
  assert.deepEqual(labels, ['Build', 'Collab', 'News', 'Podcast']);
  // Collab replaced Guidance and keeps the same destination.
  assert.match(table, /label: "Collab", href: "\/mentorship", icon: Handshake/);
  assert.doesNotMatch(table, /Guidance|Compass|Connect/);
});

test('visitor navbar has no Content menu any more', () => {
  assert.doesNotMatch(source, /const contentMenu|label: "Content"/);
});
