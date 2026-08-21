import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ICP_LEGACY_FALLBACK_STRINGS,
  collectOpenQuestions,
  fieldIsReal,
  rankedPainIsReal,
} from '../src/lib/icpFieldProvenance.ts';

function baseDraft(overrides: Record<string, any> = {}) {
  return {
    decisionBrief: {
      primarySegment: 'Independent wedding photographers billing 20+ events a year',
      buyingTrigger: 'The buying trigger still needs validation.',
      rankedPains: [
        { rank: 1, pain: 'Chasing invoices eats a full day every month', evidence: 'e' },
        { rank: 2, pain: 'Secondary pain 2 still needs interview evidence.', evidence: 'e' },
        { rank: 3, pain: 'Secondary pain 3 still needs interview evidence.', evidence: 'e' },
      ],
    },
    pain: {
      costOfInaction: 'The cost of leaving this pain unsolved still needs to be made explicit.',
      triggerMoment: 'When a client goes quiet after the gallery is delivered',
    },
    ...overrides,
  } as any;
}

test('a recorded provenance map is authoritative', () => {
  const draft = baseDraft({
    fieldProvenance: {
      'decisionBrief.primarySegment': 'model',
      'decisionBrief.buyingTrigger': 'fallback',
      'pain.costOfInaction': 'fallback',
      'pain.triggerMoment': 'model',
    },
  });

  assert.equal(fieldIsReal(draft, 'decisionBrief.primarySegment'), true);
  assert.equal(fieldIsReal(draft, 'decisionBrief.buyingTrigger'), false);
  assert.equal(fieldIsReal(draft, 'pain.costOfInaction'), false);
  assert.equal(fieldIsReal(draft, 'pain.triggerMoment'), true);
});

test('the map wins even when the prose looks like a real answer', () => {
  // A model can legitimately write a sentence that resembles the backfill. The
  // recorded provenance is the only thing that actually knows.
  const draft = baseDraft({
    pain: { costOfInaction: 'The cost of leaving this pain unsolved still needs to be made explicit.', triggerMoment: 'x' },
    fieldProvenance: { 'pain.costOfInaction': 'model' },
  });

  assert.equal(fieldIsReal(draft, 'pain.costOfInaction'), true);
});

test('legacy drafts fall back to matching the frozen backfill strings', () => {
  const legacy = baseDraft();

  assert.equal(legacy.fieldProvenance, undefined);
  assert.equal(fieldIsReal(legacy, 'decisionBrief.primarySegment'), true);
  assert.equal(fieldIsReal(legacy, 'decisionBrief.buyingTrigger'), false);
  assert.equal(fieldIsReal(legacy, 'pain.costOfInaction'), false);
  assert.equal(fieldIsReal(legacy, 'pain.triggerMoment'), true);
});

test('missing and non-string fields are not real', () => {
  const draft = baseDraft();

  assert.equal(fieldIsReal(draft, 'moat.whyHardToCopy'), false);
  assert.equal(fieldIsReal(draft, 'does.not.exist'), false);
  assert.equal(fieldIsReal(baseDraft({ pain: { costOfInaction: '   ', triggerMoment: 'x' } }), 'pain.costOfInaction'), false);
});

test('ranked pains are judged per entry, not by list length', () => {
  // The list is always padded to three, which is why counting length was a
  // check that could never fail.
  const legacy = baseDraft();

  assert.equal(legacy.decisionBrief.rankedPains.length, 3);
  assert.equal(rankedPainIsReal(legacy, 0), true);
  assert.equal(rankedPainIsReal(legacy, 1), false);
  assert.equal(rankedPainIsReal(legacy, 2), false);
});

test('ranked pains prefer the provenance map when present', () => {
  const draft = baseDraft({
    fieldProvenance: {
      'decisionBrief.rankedPains.0': 'model',
      'decisionBrief.rankedPains.1': 'model',
      'decisionBrief.rankedPains.2': 'fallback',
    },
  });

  assert.equal(rankedPainIsReal(draft, 1), true);
  assert.equal(rankedPainIsReal(draft, 2), false);
});

test('open questions list every backfilled field', () => {
  const draft = baseDraft({
    fieldProvenance: {
      'decisionBrief.primarySegment': 'model',
      'decisionBrief.buyingTrigger': 'fallback',
      'pain.costOfInaction': 'fallback',
    },
  });

  assert.deepEqual(collectOpenQuestions(draft).sort(), ['decisionBrief.buyingTrigger', 'pain.costOfInaction']);
});

test('the frozen snapshot covers the generator fallbacks it was taken from', () => {
  // Spot-check the ones the scorer depends on. If any of these drift out of the
  // set, legacy drafts silently start scoring their gaps as real answers.
  for (const sentence of [
    'The cost of leaving this pain unsolved still needs to be made explicit.',
    'The trigger moment still needs a clearer founder example.',
    'The buying trigger still needs validation.',
    'Why this advantage is hard to copy still needs stronger proof.',
    'The incumbent gap still needs to be stated more sharply.',
    'The exploitable competitive gap still needs clearer founder or market evidence.',
  ]) {
    assert.ok(ICP_LEGACY_FALLBACK_STRINGS.has(sentence), `missing from snapshot: ${sentence}`);
  }
});
