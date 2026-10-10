import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { BUILDER_STEPS, builderPath, hasChosenIdea } from '../src/lib/builderPath.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the builder path is Explore, Define, Validate, each with its tool', () => {
  assert.deepEqual(BUILDER_STEPS.map((step) => [step.label, step.tool]), [['Explore', 'Decision Sprint'], ['Define', 'ICP Builder'], ['Validate', 'PMF Lab']]);
  assert.deepEqual(BUILDER_STEPS.map((step) => step.route), ['/decision-sprint', '/icp-builder', '/pmf-lab']);
});

test('steps complete from saved work, and the next step is the first one not done', () => {
  const none = builderPath({ ideaChosen: false, customerDefined: false, validated: false });
  assert.equal(none.next?.key, 'explore');
  assert.equal(none.doneCount, 0);
  assert.equal(none.complete, false);

  const idea = builderPath({ ideaChosen: true, customerDefined: false, validated: false });
  assert.equal(idea.next?.key, 'define');

  // Defining a customer means an idea was picked, even without Decision Sprint.
  const defined = builderPath({ ideaChosen: false, customerDefined: true, validated: false });
  assert.deepEqual(defined.steps.map((step) => step.done), [true, true, false]);
  assert.equal(defined.next?.key, 'validate');
  assert.equal(defined.steps.find((step) => step.current)?.key, 'validate');

  const all = builderPath({ ideaChosen: true, customerDefined: true, validated: true });
  assert.equal(all.complete, true);
  assert.equal(all.next, null);
  assert.equal(all.doneCount, 3);
});

test('a chosen Decision Sprint idea is read from the saved draft', () => {
  assert.equal(hasChosenIdea({ validationDraft: { chosenIdeaId: 'idea-1' } }), true);
  assert.equal(hasChosenIdea({ validationDraft: { chosenIdeaId: null, ideas: [] } }), false);
  assert.equal(hasChosenIdea({}), false);
  assert.equal(hasChosenIdea(null), false);
});

test('only builders see the path, and moving to Founder is recorded as a milestone', () => {
  const home = read('../src/components/pulse/PulseHomeLive.tsx');
  assert.match(home, /\{userType === 'builder' && <BuilderPath navigate=\{enterWorkspaceRoute\} \/>\}/);
  const card = read('../src/components/pulse/BuilderPath.tsx');
  assert.match(card, /customerDefined: progress\.stageState\.IDENTITY\.completed/);
  assert.match(card, /validated: progress\.stageState\.VALIDATING\.completed/);
  assert.match(card, /\{path\.complete && !notYet && \(/);
  assert.match(card, /rpc\('state_founder_segment' as never, \{ p_segment: 'founder', p_source: 'graduation' \}/);
  // The adoption report counts exactly these as Builder to Founder conversions.
  assert.match(read('../supabase/migrations/20261014130000_adoption_by_segment.sql'), /activity_data->>'source' = 'graduation'/);
});
