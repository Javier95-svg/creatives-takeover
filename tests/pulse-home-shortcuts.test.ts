import assert from 'node:assert/strict';
import test from 'node:test';
import { BIZMAP_STAGE_ORDER } from '../src/lib/bizmapStageOrder.ts';
import { PULSE_HOME_SHORTCUTS, STAGE_EXAMPLE_QUESTION, toolNameForRoute } from '../src/lib/pulseHomeShortcuts.ts';

test('the founder home keeps its eight quick starts, each with a destination', () => {
  assert.deepEqual(PULSE_HOME_SHORTCUTS.map((shortcut) => shortcut.label), [
    'What should I focus next?', 'Find me a mentor', 'Find me a co-founder', 'Help me define my customer',
    'Help me create a demo', 'Help me validate my idea', 'Help me build my MVP', 'Help me plan my launch',
  ]);
  for (const shortcut of PULSE_HOME_SHORTCUTS) {
    assert.ok(shortcut.route.startsWith('/'), shortcut.id);
    assert.ok(shortcut.tool, shortcut.id);
  }
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
