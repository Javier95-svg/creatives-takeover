import test from 'node:test';
import assert from 'node:assert/strict';

import { groupToolItemsByStage } from '../src/lib/sidebarJourneyGroups.ts';

const item = (path: string, label = path) => ({ path, label });

test('groups tools by journey stage in BIZMAP_STAGE_ORDER', () => {
  const groups = groupToolItemsByStage([
    item('/vc-search'),
    item('/icp-builder'),
    item('/go-to-market'),
    item('/demo-studio'),
    item('/pmf-lab'),
    item('/tech-stack'),
    item('/mvp-builder'),
  ]);

  assert.deepEqual(
    groups.map((group) => group.id),
    ['IDENTITY', 'PROTOTYPE', 'VALIDATING', 'BUILDING', 'LAUNCH', 'FUNDRAISING'],
  );
  const building = groups.find((group) => group.id === 'BUILDING');
  // Input order preserved within a group.
  assert.deepEqual(building?.items.map((entry) => entry.path), ['/tech-stack', '/mvp-builder']);
  assert.equal(groups.find((group) => group.id === 'IDENTITY')?.label, 'I · Identity');
  assert.equal(groups.find((group) => group.id === 'VALIDATING')?.label, 'III · Validation');
});

test('/traction-engine lands in the TRACTION group via the route override', () => {
  const groups = groupToolItemsByStage([item('/traction-engine')]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 'TRACTION');
});

test('stageless tools fall into a trailing More tools group', () => {
  const groups = groupToolItemsByStage([
    item('/prompt-library'),
    item('/icp-builder'),
    item('/saved-mentors'),
  ]);

  assert.deepEqual(groups.map((group) => group.id), ['IDENTITY', 'MORE']);
  const more = groups[groups.length - 1];
  assert.equal(more.label, 'More tools');
  assert.deepEqual(more.items.map((entry) => entry.path), ['/prompt-library', '/saved-mentors']);
});

test('empty input yields no groups (empty groups are elided)', () => {
  assert.deepEqual(groupToolItemsByStage([]), []);
});
