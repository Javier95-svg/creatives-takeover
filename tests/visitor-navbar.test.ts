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
  for (const label of ['How it works', 'For founders', 'Explore', 'Enterprise', 'Build', 'Collab', 'Founder ID', 'Newspaper', 'Podcast', 'About', 'Pricing']) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }
});

test('the bar runs How it works, For founders, Enterprise, Explore, About, Pricing', () => {
  // Order requested 2026-10-17. Tour became "How it works" on the same route,
  // and Enterprise is the programs page. For founders and Explore are menus.
  const { table, labels } = linkTable('visitorEntries');
  assert.deepEqual(labels, ['How it works', 'For founders', 'Enterprise', 'Explore', 'About', 'Pricing']);
  assert.match(table, /label: "For founders", links: founderLinks/);
  assert.match(table, /label: "Explore", links: exploreLinks/);
  assert.match(table, /label: "Enterprise", href: "\/enterprise"/);
  assert.equal(source.match(/<DropdownMenuTrigger/g)?.length, 1, 'one dropdown trigger, rendered for each menu entry');
});

test('every bar entry keeps its icon on the left', () => {
  // Requested 2026-10-17: the icons were lost in the redesign. Menus carry one
  // too, and the desktop bar shows them from 2xl, where six entries fit.
  const { table } = linkTable('visitorEntries');
  const entries = table.split('\n').filter((line) => line.includes('label: "'));
  assert.equal(entries.length, 6);
  for (const line of entries) assert.match(line, /icon: [A-Z]\w+/, line.trim());
  assert.equal(source.match(/<entry\.icon className="hidden h-4 w-4 shrink-0 2xl:block"/g)?.length, 2, 'icon on links and on menu triggers');
});

test('For founders holds Build, Collab and Founder ID', () => {
  const { table, labels } = linkTable('founderLinks');
  assert.deepEqual(labels, ['Build', 'Collab', 'Founder ID']);
  // Collab replaced Guidance and keeps the same destination.
  assert.match(table, /label: "Collab", href: "\/mentorship", icon: Handshake/);
  // Added 2026-10-21: the Founder ID landing page.
  assert.match(table, /label: "Founder ID", href: "\/founder-id", icon: IdCard/);
  assert.doesNotMatch(table, /Guidance|Compass|Connect/);
});

test('Explore holds Newspaper, Podcast and Startup Pedia', () => {
  // Startup Pedia added 2026-10-25 under Newspaper and Podcast, as requested,
  // instead of a seventh bar entry.
  const { table, labels } = linkTable('exploreLinks');
  assert.deepEqual(labels, ['Newspaper', 'Podcast', 'Startup Pedia']);
  assert.match(table, /label: "Startup Pedia", href: "\/startup-pedia", icon: BookMarked/);
});

test('Join Today goes to signup on desktop and mobile', () => {
  // Restored 2026-10-17: the starting-experiences change (2026-10-13) had
  // pointed it at /#get-started.
  const joinLinks = [...source.matchAll(/<Link to="([^"]+)" onClick=\{\(\) => \{ trackNavClick\("(?:Mobile )?Join Today"\)/g)].map((match) => match[1]);
  assert.deepEqual(joinLinks, ['/signup', '/signup']);
});

test('visitor navbar has no Content menu any more', () => {
  assert.doesNotMatch(source, /const contentMenu|label: "Content"/);
});
