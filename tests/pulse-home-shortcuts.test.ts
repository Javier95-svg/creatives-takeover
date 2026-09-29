import assert from 'node:assert/strict';
import test from 'node:test';
import { BIZMAP_STAGE_ORDER } from '../src/lib/bizmapStageOrder.ts';
import { pulseHomeShortcuts, STAGE_EXAMPLE_QUESTION, toolNameForRoute } from '../src/lib/pulseHomeShortcuts.ts';

test('every stage gets four suggestions, and "All tools" never repeats a suggested destination', () => {
  for (const stage of [...BIZMAP_STAGE_ORDER, null]) {
    const { suggested, more } = pulseHomeShortcuts(stage);
    assert.equal(suggested.length, 4, String(stage));
    const suggestedRoutes = new Set(suggested.map((shortcut) => shortcut.route));
    for (const shortcut of more) assert.equal(suggestedRoutes.has(shortcut.route), false, `${stage}: ${shortcut.id}`);
    for (const shortcut of [...suggested, ...more]) {
      assert.ok(shortcut.route.startsWith('/'), shortcut.id);
      assert.doesNotMatch(shortcut.label, /^Help me/, shortcut.id);
    }
  }
  assert.deepEqual(pulseHomeShortcuts('TRACTION').suggested.map((shortcut) => shortcut.label),
    ['See who comes back', 'Find your next 10 customers', 'Test your one-line pitch', 'Talk to a mentor']);
});

test('focus items show the tool they open', () => {
  assert.equal(toolNameForRoute('/icp-builder'), 'ICP Builder');
  assert.equal(toolNameForRoute('/traction-engine?tab=cohorts'), 'Traction Engine');
  assert.equal(toolNameForRoute('/go-to-market/plan'), 'GTM Strategist');
  assert.equal(toolNameForRoute('/dashboard'), null);
  assert.equal(toolNameForRoute('/icp-builderx'), null);
});

test('every stage has an example question', () => {
  for (const stage of BIZMAP_STAGE_ORDER) assert.ok(STAGE_EXAMPLE_QUESTION[stage].endsWith('?'), stage);
});
