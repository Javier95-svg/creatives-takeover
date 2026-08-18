import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeViabilityScore,
  resolveViabilityBand,
  VIABILITY_THRESHOLDS,
} from '../src/lib/icpViabilityScore.ts';

type Confidence = 'high' | 'medium' | 'low';

function evidence(confidence: Confidence) {
  return { confidence, evidence: 'because', missingSignalPrompt: null };
}

/**
 * A draft with every signal present and fully sourced. Individual tests strip
 * pieces out of a clone, so each one isolates a single scoring input.
 */
function strongDraft() {
  return {
    gatePreview: { personaName: 'P', roleLine: 'R', painLine: 'L' },
    decisionBrief: {
      primarySegment: 'A',
      nonFitSegment: 'B',
      rankedPains: [
        { rank: 1, pain: 'one', evidence: 'e' },
        { rank: 2, pain: 'two', evidence: 'e' },
        { rank: 3, pain: 'three', evidence: 'e' },
      ],
      buyingTrigger: 'trigger',
      currentAlternative: 'spreadsheets',
      reachableChannels: ['forums'],
      interviewValidationPlan: [{ step: 1, question: 'q', successSignal: 's' }],
    },
    customer: {
      personaName: 'P', roleLine: 'R', metaLine: 'M', summary: 'S',
      behaviors: [], motivations: [], whereToFind: [],
      triggerContext: 'T', actionTrigger: 'A', evidence: evidence('high'),
    },
    pain: {
      quote: 'q', rootCause: 'r', whyItHurts: 'w',
      triggerMoment: 'when the month closes',
      costOfInaction: 'lost revenue',
      evidence: evidence('high'),
    },
    build: {
      valueProposition: 'v', replaces: ['x'], coreFeatures: [], outcome: 'o',
      evidence: evidence('high'),
    },
    moat: {
      moatType: 'data', edge: 'e', edgeSource: 's',
      whyHardToCopy: 'proprietary panel',
      incumbentGap: 'they ignore solo operators',
      startupsToStudy: [], evidence: evidence('high'),
    },
    competition: {
      summary: 's',
      directCompetitors: [
        { name: 'A', url: null, doesWell: 'x', gap: 'y' },
        { name: 'B', url: null, doesWell: 'x', gap: 'y' },
        { name: 'C', url: null, doesWell: 'x', gap: 'y' },
      ],
      exploitableGap: 'no mobile flow',
      evidence: evidence('high'),
    },
    confidence: { level: 'high', summary: 's', missingSignals: [] },
    sources: [
      { type: 'market', title: 't', url: 'https://a.com' },
      { type: 'competitor', title: 't', url: 'https://b.com' },
      { type: 'community', title: 't', url: 'https://c.com' },
      { type: 'market', title: 't', url: 'https://d.com' },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// The bands are the product decision, so they are pinned explicitly: anything
// under 5 reads as needs-work, 8 and over as strong, and 5 through 7.9 between.
test('bands follow the agreed thresholds and are inclusive at the lower bound', () => {
  assert.equal(resolveViabilityBand(4.9), 'needsWork');
  assert.equal(resolveViabilityBand(VIABILITY_THRESHOLDS.promising), 'promising');
  assert.equal(resolveViabilityBand(7.9), 'promising');
  assert.equal(resolveViabilityBand(VIABILITY_THRESHOLDS.strong), 'strong');
  assert.equal(resolveViabilityBand(10), 'strong');
});

test('a fully evidenced draft scores in the strong band', () => {
  const { score, band } = computeViabilityScore(strongDraft());
  assert.equal(band, 'strong');
  assert.ok(score >= 8 && score <= 10, `expected 8-10, got ${score}`);
});

// The number must never move for the same input - a reader who reloads and sees
// a different score has been told the score is arbitrary.
test('the same draft always scores the same', () => {
  const draft = strongDraft();
  assert.equal(computeViabilityScore(draft).score, computeViabilityScore(draft).score);
});

test('the score always lands inside 1 to 10 with one decimal', () => {
  const empty = strongDraft();
  empty.customer.evidence = evidence('low');
  empty.pain = { ...empty.pain, triggerMoment: '', costOfInaction: '', evidence: evidence('low') };
  empty.build.evidence = evidence('low');
  empty.moat = { ...empty.moat, whyHardToCopy: '', incumbentGap: '', evidence: evidence('low') };
  empty.competition = { ...empty.competition, directCompetitors: [], exploitableGap: '', evidence: evidence('low') };
  empty.decisionBrief = undefined;
  empty.sources = [];
  empty.confidence = { level: 'low', summary: 's', missingSignals: ['a', 'b', 'c', 'd', 'e'] };

  const { score, band } = computeViabilityScore(empty);
  assert.ok(score >= 1 && score <= 10, `out of range: ${score}`);
  assert.equal(Math.round(score * 10), score * 10, 'must be one decimal');
  assert.equal(band, 'needsWork');
});

// Weak evidence has to actually cost something, or the number is decoration.
test('dropping evidence quality lowers the score', () => {
  const strong = strongDraft();
  const weak = strongDraft();
  weak.customer.evidence = evidence('low');
  weak.pain.evidence = evidence('low');
  weak.build.evidence = evidence('low');

  assert.ok(
    computeViabilityScore(weak).score < computeViabilityScore(strong).score,
    'weaker evidence must score lower',
  );
});

test('unanswered questions reduce the score but cannot sink it alone', () => {
  const base = strongDraft();
  const gaps = strongDraft();
  gaps.confidence = { level: 'high', summary: 's', missingSignals: ['a', 'b', 'c', 'd', 'e', 'f'] };

  const baseScore = computeViabilityScore(base).score;
  const gapScore = computeViabilityScore(gaps).score;
  assert.ok(gapScore < baseScore, 'gaps must cost something');
  assert.ok(baseScore - gapScore <= 1, 'the penalty is capped at one point');
});

// Drafts generated before the brief existed still have to render a score.
test('a draft with no decision brief still scores', () => {
  const draft = strongDraft();
  draft.decisionBrief = undefined;
  const { score } = computeViabilityScore(draft);
  assert.ok(score >= 1 && score <= 10);
});

test('the summary names the weakest pillar when the draft is not strong', () => {
  const draft = strongDraft();
  draft.moat = { ...draft.moat, whyHardToCopy: '', incumbentGap: '' };
  draft.competition = { ...draft.competition, directCompetitors: [], exploitableGap: '' };
  const { summary, band } = computeViabilityScore(draft);
  if (band !== 'strong') {
    assert.match(summary, /differentiation/);
  }
});
