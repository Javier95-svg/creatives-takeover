import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { LAUNCHPAD_TOPICS, launchpadTopic, postPath, RETIRED_ROOMS, roomPath } from '../src/lib/launchpadTopics.ts';
import { previousRoundStart, roundEnd, roundStart, timeLeft } from '../src/lib/launchpadRoundTime.ts';
import { FOUNDER_TOOL_CATALOG } from '../src/config/founderToolCatalog.ts';
import { isWorkspaceRoute } from '../src/lib/workspacePolicy.ts';
import { navSectionsForType, navToolsForType } from '../src/lib/workspaceNavForType.ts';

// workspaceNavigation.ts imports without an extension, so read its route map
// from source and merge the tool catalog it spreads in.
const navigationSource = readFileSync(new URL('../src/lib/workspaceNavigation.ts', import.meta.url), 'utf8');
const WORKSPACE_ROUTES: Record<string, string> = {
  ...Object.fromEntries(FOUNDER_TOOL_CATALOG.map((tool) => [tool.name, tool.route])),
  ...Object.fromEntries([...navigationSource.matchAll(/^  (?:'([^']+)'|([A-Za-z]+)): '(\/[^']*)',/gm)].map((match) => [match[1] ?? match[2], match[3]])),
};

const migration = readFileSync(new URL('../supabase/migrations/20261007130000_launchpad_posts_topics_profiles.sql', import.meta.url), 'utf8');

test('the app rooms match launchpad_topics after every migration, and retired rooms point at live ones', () => {
  const seeded = [...migration.matchAll(/^\s+\('([a-z0-9-]+)', '[^']+', \d+\)/gm)].map((match) => match[1]);
  const simplify = readFileSync(new URL('../supabase/migrations/20261009120000_community_simplify_craft_rooms.sql', import.meta.url), 'utf8');
  const removed = (simplify.match(/DELETE FROM public\.launchpad_topics WHERE slug IN \(([^)]+)\)/)?.[1] ?? '')
    .split(',').map((slug) => slug.trim().replace(/'/g, ''));
  const live = seeded.filter((slug) => !removed.includes(slug));
  assert.deepEqual([...live].sort(), LAUNCHPAD_TOPICS.map((topic) => topic.slug).sort());
  assert.deepEqual([...removed].sort(), Object.keys(RETIRED_ROOMS).sort());
  for (const [from, to] of Object.entries(RETIRED_ROOMS)) {
    assert.ok(launchpadTopic(to), `${from} → ${to}`);
    assert.match(simplify, new RegExp(`SET topic = '${to}' WHERE topic = '${from}'`));
  }
  // Four skill rooms, none duplicating another section.
  assert.equal(LAUNCHPAD_TOPICS.filter((topic) => topic.group === 'craft').length, 4);
});

test('each topic links to tools that have a workspace route', () => {
  for (const topic of LAUNCHPAD_TOPICS) {
    assert.ok(topic.tools.length > 0, topic.slug);
    for (const tool of topic.tools) assert.ok(WORKSPACE_ROUTES[tool], `${topic.slug} → ${tool}`);
  }
  assert.equal(launchpadTopic('pricing')?.label, 'Pricing');
  assert.equal(launchpadTopic('not-a-topic'), null);
});

test('Community sits between Insighta and Content and renders inside the workspace', () => {
  const sidebar = readFileSync(new URL('../src/components/workspace/WorkspaceSidebar.tsx', import.meta.url), 'utf8');
  const order = [...sidebar.matchAll(/\{ label: "([A-Za-z ]+)", icon: /g)].map((match) => match[1]);
  assert.deepEqual(order.slice(order.indexOf('Insighta'), order.indexOf('Insighta') + 3), ['Insighta', 'Community', 'Content']);
  for (const tab of ['Rooms', 'Launches']) {
    assert.ok(WORKSPACE_ROUTES[tab]?.startsWith('/launchpad'), tab);
    assert.equal(isWorkspaceRoute(WORKSPACE_ROUTES[tab]), true, tab);
  }
  assert.equal(isWorkspaceRoute('/launchpad/rooms/posts/abc'), true);
  assert.equal(isWorkspaceRoute('/launchpad/rooms/pricing'), true);
});

test('reviewed account types get a Launchpad slice of their own', () => {
  const all = ['Dashboard', 'BizMap', 'Network', 'Insighta', 'Community', 'Content', 'Resources', 'Pricing'];
  for (const type of ['mentor', 'marketplace', 'investor'] as const) {
    assert.ok(navSectionsForType(type, all).includes('Community'), type);
    assert.ok(navToolsForType(type, 'Community', {})?.includes('Rooms'), type);
  }
});

test('the migration closes the open read policy and pins server-owned columns', () => {
  assert.match(migration, /DROP POLICY IF EXISTS "Public can view community posts"/);
  assert.match(migration, /\(is_public = true AND hidden_at IS NULL\)/);
  assert.match(migration, /NEW\.upvotes := OLD\.upvotes;/);
  assert.match(migration, /public_stage_visible/);
});

test('rounds run Monday 00:00 UTC to the next Monday, matching launchpad_current_week()', () => {
  // Wednesday 8 October 2026, 15:30 UTC.
  const wednesday = new Date(Date.UTC(2026, 9, 8, 15, 30));
  assert.equal(roundStart(wednesday).toISOString(), '2026-10-05T00:00:00.000Z');
  assert.equal(roundEnd(wednesday).toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(previousRoundStart(wednesday), '2026-09-28');
  // Sunday late evening still belongs to the week that started on Monday.
  assert.equal(roundStart(new Date(Date.UTC(2026, 9, 11, 23, 59))).toISOString(), '2026-10-05T00:00:00.000Z');
  // Monday midnight starts a new round.
  assert.equal(roundStart(new Date(Date.UTC(2026, 9, 12, 0, 0))).toISOString(), '2026-10-12T00:00:00.000Z');
  assert.deepEqual(timeLeft(roundEnd(wednesday), wednesday), { days: 3, hours: 8, minutes: 30 });
  assert.deepEqual(timeLeft(wednesday, roundEnd(wednesday)), { days: 0, hours: 0, minutes: 0 });
});

test('the rounds migration guards self-votes, closed rounds and double rewards', () => {
  const rounds = readFileSync(new URL('../supabase/migrations/20261008120000_launchpad_launch_rounds.sql', import.meta.url), 'utf8');
  assert.match(rounds, /date_trunc\('week', now\(\) AT TIME ZONE 'UTC'\)/);
  assert.match(rounds, /You cannot upvote your own launch/);
  assert.match(rounds, /Voting for this round has closed/);
  assert.match(rounds, /UNIQUE \(user_id, demo_project_id\)/);
  assert.match(rounds, /weekly_cap constant integer := 5/);
});

test('rooms and posts live under /launchpad/rooms, and old addresses redirect there', () => {
  assert.equal(roomPath('pricing'), '/launchpad/rooms/pricing');
  assert.equal(postPath('abc'), '/launchpad/rooms/posts/abc');
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  for (const legacy of ['/launchpad/posts', '/launchpad/topics', '/launchpad/profiles', '/mentorship/progress']) {
    assert.match(app, new RegExp(`path="${legacy}" element={<Navigate to="/launchpad/rooms" replace />}`), legacy);
  }
  assert.match(app, /path="\/launchpad\/posts\/:id" element={<LegacyLaunchpadRedirect \/>}/);
  assert.match(app, /path="\/launchpad\/topics\/:slug" element={<LegacyLaunchpadRedirect \/>}/);
  // No room slug may collide with the post route segment.
  assert.ok(!LAUNCHPAD_TOPICS.some((room) => room.slug === 'posts'));
});
