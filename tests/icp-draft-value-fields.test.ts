import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDraftPrompt,
  containsPriceFigure,
  normalizeDraftDocument,
  parseDraftJson,
} from "../supabase/functions/_shared/icp-draft.ts";

/**
 * The generator side of "value is what people want and cannot easily get
 * elsewhere": what the customer gets, the kind of value, the alternatives and
 * how easy they are, and category shifts that only survive with evidence.
 * The browser side is covered in icp-value-generation.test.ts.
 */

const noSources = { marketSignals: [], competitorLinks: [], sources: [], retrievalAvailable: true };
const withSources = {
  ...noSources,
  sources: [{ sourceId: "source-1", type: "community" as const, title: "t", url: "https://reddit.com/r/running/1", detail: null }],
};

test('the price check needs a digit, not the letter d', () => {
  assert.equal(containsPriceFigure('A monthly subscription paid by the studio'), false);
  assert.equal(containsPriceFigure('Founders would likely pay a monthly fee'), false);
  assert.equal(containsPriceFigure('$40-80 per studio per month'), true);
  assert.equal(containsPriceFigure(null), false);
});


test('a value form is kept only when it is one of the seven', () => {
  const kept = normalizeDraftDocument({ valueForm: { primary: 'belonging', secondary: 'growth' } }, noSources);
  assert.deepEqual(kept.valueForm, { primary: 'belonging', secondary: 'growth' });

  const repeated = normalizeDraftDocument({ valueForm: { primary: 'fix', secondary: 'fix' } }, noSources);
  assert.deepEqual(repeated.valueForm, { primary: 'fix', secondary: null });

  const invented = normalizeDraftDocument({ valueForm: { primary: 'convenience' } }, noSources);
  assert.equal(invented.valueForm, undefined);
});


test('alternatives are cleaned, de-duplicated and capped, never padded', () => {
  const draft = normalizeDraftDocument({
    alternatives: [
      { option: 'Strava clubs', kind: 'competitor', ease: 'easy' },
      { option: 'strava clubs', kind: 'competitor', ease: 'hard' },
      { option: 'A WhatsApp group with friends', kind: 'diy', ease: 'easy' },
      { option: 'Run alone', kind: 'do_nothing', ease: 'easy' },
      { option: 'Local running shop meetups', kind: 'weird', ease: 'trivial' },
      { option: '', kind: 'other', ease: 'easy' },
      { option: 'Parkrun', kind: 'competitor', ease: 'easy' },
      { option: 'A personal coach', kind: 'competitor', ease: 'hard' },
      { option: 'A gym class', kind: 'competitor', ease: 'some_effort' },
      { option: 'One too many', kind: 'other', ease: 'easy' },
    ],
  }, noSources);

  assert.equal(draft.alternatives.length, 6);
  assert.deepEqual(draft.alternatives.map((item) => item.option).slice(0, 4), [
    'Strava clubs', 'A WhatsApp group with friends', 'Run alone', 'Local running shop meetups',
  ]);
  assert.deepEqual(draft.alternatives[3], { option: 'Local running shop meetups', kind: 'other', ease: 'some_effort' });

  assert.deepEqual(normalizeDraftDocument({}, noSources).alternatives, []);
});


test('what they get is tracked, so an unanswered one reads as an open question', () => {
  const answered = normalizeDraftDocument({ build: { whatTheyGet: 'A crew to run with every Sunday' } }, noSources);
  assert.equal(answered.build.whatTheyGet, 'A crew to run with every Sunday');
  assert.equal(answered.fieldProvenance['build.whatTheyGet'], 'model');

  const missing = normalizeDraftDocument({}, noSources);
  assert.equal(missing.fieldProvenance['build.whatTheyGet'], 'fallback');
});


test('category shifts survive only when something was retrieved to support them', () => {
  const shifts = { becomingPlentiful: ['AI training plans'], becomingScarce: ['In-person accountability'] };
  assert.equal(normalizeDraftDocument({ market: { shifts } }, noSources).market.shifts, undefined);
  assert.deepEqual(normalizeDraftDocument({ market: { shifts } }, withSources).market.shifts, shifts);
  assert.equal(
    normalizeDraftDocument({ market: { shifts: { becomingPlentiful: [], becomingScarce: [] } } }, withSources).market.shifts,
    undefined,
  );
});


test('the current alternative falls back to a real option, never to "do nothing"', () => {
  const draft = normalizeDraftDocument({
    alternatives: [
      { option: 'Run alone', kind: 'do_nothing', ease: 'easy' },
      { option: 'Strava clubs', kind: 'competitor', ease: 'easy' },
    ],
  }, noSources);
  assert.equal(draft.decisionBrief.currentAlternative, 'Strava clubs');
});


test('the prompt asks for the second half of value and a want-led rubric', () => {
  const prompt = buildDraftPrompt(
    { entryMode: 'fast', fastInput: { description: 'A members-only Sunday running club with coffee after.' } } as never,
    noSources,
  );
  assert.match(prompt, /MUST include one "diy" row/);
  assert.match(prompt, /"do_nothing" row/);
  assert.match(prompt, /identity, pleasure, belonging, growth \(a want\): do NOT invent a problem/);
  assert.match(prompt, /what a competitor would have to give up/);
  assert.match(prompt, /Use only the RETRIEVED EVIDENCE block/);
});

test('a trailing comma no longer loses the whole draft, but a cut-off answer still fails', () => {
  assert.deepEqual(parseDraftJson('{"draftDocument":{"alternatives":[{"option":"a"},],},}'), {
    draftDocument: { alternatives: [{ option: 'a' }] },
  });
  assert.throws(() => parseDraftJson('{"draftDocument":{"build":{"whatTheyGet":"a",'), /Failed to parse ICP draft JSON/);
});
