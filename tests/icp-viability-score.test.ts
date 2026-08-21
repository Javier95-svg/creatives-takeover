import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeViabilityScore,
  countLinkedCompetitors,
  isAuthenticIcpCitation,
  resolveViabilityBand,
  VIABILITY_THRESHOLDS,
} from '../src/lib/icpViabilityScore.ts';

type Confidence = 'high' | 'medium' | 'low';
type DimensionKey =
  | 'painSeverity'
  | 'willingnessToPay'
  | 'competitiveIntensity'
  | 'reachability'
  | 'founderEdge';

const DIMENSIONS: DimensionKey[] = [
  'painSeverity',
  'willingnessToPay',
  'competitiveIntensity',
  'reachability',
  'founderEdge',
];

/**
 * Every path normalizeDraftDocument records provenance for.
 *
 * The old fixtures in this file used empty strings for unanswered fields, which
 * is why the scoring constants went unnoticed for so long: real drafts never
 * contain an empty string, because the generator backfills every gap with
 * prose. These fixtures are shaped the way the generator actually emits, so a
 * pillar that cannot vary in production cannot vary here either.
 */
const TRACKED_PATHS = [
  'decisionBrief.primarySegment',
  'decisionBrief.nonFitSegment',
  'decisionBrief.rankedPains.0',
  'decisionBrief.rankedPains.1',
  'decisionBrief.rankedPains.2',
  'decisionBrief.buyingTrigger',
  'decisionBrief.currentAlternative',
  'pain.triggerMoment',
  'pain.costOfInaction',
  'moat.whyHardToCopy',
  'moat.incumbentGap',
  'competition.exploitableGap',
];

interface DraftOptions {
  confidence?: Confidence;
  /** Competitors carrying a real URL. */
  linkedCompetitors?: number;
  /** Competitors with no URL, which must not earn credit. */
  unlinkedCompetitors?: number;
  sources?: number;
  answered?: 'all' | 'none' | string[];
  dimensions?: Partial<Record<DimensionKey, number>> | null;
}

function draft(options: DraftOptions = {}) {
  const {
    confidence = 'medium',
    linkedCompetitors = 0,
    unlinkedCompetitors = 0,
    sources = 0,
    answered = 'all',
    dimensions = {},
  } = options;

  const answeredSet = new Set(
    answered === 'all' ? TRACKED_PATHS : answered === 'none' ? [] : answered,
  );
  const fieldProvenance = Object.fromEntries(
    TRACKED_PATHS.map((path) => [path, answeredSet.has(path) ? 'model' : 'fallback']),
  );

  const evidence = { confidence, evidence: 'because', missingSignalPrompt: null };

  return {
    gatePreview: { personaName: 'P', roleLine: 'R', painLine: 'L' },
    decisionBrief: {
      primarySegment: 'A',
      nonFitSegment: 'B',
      rankedPains: [0, 1, 2].map((rank) => ({ rank: rank + 1, pain: 'pain text', evidence: 'e' })),
      buyingTrigger: 'trigger text',
      currentAlternative: 'spreadsheets',
      reachableChannels: ['forums'],
      interviewValidationPlan: [{ step: 1, question: 'q', successSignal: 's' }],
    },
    customer: {
      personaName: 'P', roleLine: 'R', metaLine: 'M', summary: 'S',
      behaviors: [], motivations: [], whereToFind: [],
      triggerContext: 'T', actionTrigger: 'A', evidence,
    },
    pain: {
      quote: 'q', rootCause: 'r', whyItHurts: 'w',
      triggerMoment: 'when the month closes',
      costOfInaction: 'lost revenue',
      evidence,
    },
    build: { valueProposition: 'v', replaces: ['x'], coreFeatures: [], outcome: 'o', evidence },
    moat: {
      moatType: 'data', edge: 'e', edgeSource: 's',
      whyHardToCopy: 'proprietary panel',
      incumbentGap: 'they ignore solo operators',
      startupsToStudy: [], evidence,
    },
    competition: {
      summary: 's',
      directCompetitors: [
        ...Array.from({ length: linkedCompetitors }, (_, index) => ({
          name: `Linked ${index}`, url: `https://competitor-${index}.com`, doesWell: 'x', gap: 'y',
        })),
        ...Array.from({ length: unlinkedCompetitors }, (_, index) => ({
          name: `Recalled ${index}`, url: null, doesWell: 'x', gap: 'y',
        })),
      ],
      exploitableGap: 'nobody serves this niche',
      evidence,
    },
    confidence: { level: confidence, summary: 's', missingSignals: [] },
    nextActions: [],
    sources: Array.from({ length: sources }, (_, index) => ({
      sourceId: `community-${index}`,
      type: 'community' as const,
      title: `t${index}`,
      url: `https://reddit.com/r/x/comments/${index}`,
      detail: null,
    })),
    fieldProvenance,
    ...(dimensions === null
      ? {}
      : {
          viabilityAssessment: Object.fromEntries(
            DIMENSIONS.map((key) => [
              key,
              {
                score: dimensions[key] ?? 50,
                rationale: 'because',
                basis: 'inference' as const,
                sourceIds: [],
              },
            ]),
          ),
        }),
  } as any;
}

const allDimensions = (score: number) =>
  Object.fromEntries(DIMENSIONS.map((key) => [key, score])) as Record<DimensionKey, number>;

test('bands resolve at the documented boundaries', () => {
  assert.equal(resolveViabilityBand(4.9), 'needsWork');
  assert.equal(resolveViabilityBand(VIABILITY_THRESHOLDS.promising), 'promising');
  assert.equal(resolveViabilityBand(7.9), 'promising');
  assert.equal(resolveViabilityBand(VIABILITY_THRESHOLDS.strong), 'strong');
  assert.equal(resolveViabilityBand(10), 'strong');
});

test('scoring is a pure function of the draft', () => {
  const fixture = draft();
  assert.equal(computeViabilityScore(fixture).score, computeViabilityScore(fixture).score);
});

/* ------------------------------------------------------------------ *
 * The five invariants the rewrite exists to guarantee.
 * ------------------------------------------------------------------ */

test('invariant 1: the full band range is reachable', () => {
  const floor = computeViabilityScore(
    draft({ confidence: 'low', answered: 'none', dimensions: allDimensions(0) }),
  );
  const ceiling = computeViabilityScore(
    draft({
      confidence: 'high',
      answered: 'all',
      linkedCompetitors: 3,
      sources: 4,
      dimensions: allDimensions(100),
    }),
  );

  assert.equal(floor.band, 'needsWork', 'a weak, unevidenced idea must be able to score needsWork');
  assert.equal(ceiling.band, 'strong', 'a strong, well-evidenced idea must be able to score strong');
  assert.ok(floor.score <= 1.5, `floor was ${floor.score}`);
  assert.ok(ceiling.score >= 9, `ceiling was ${ceiling.score}`);
});

test('invariant 2: no scoring component is constant across realistic drafts', () => {
  const lean = computeViabilityScore(draft({ confidence: 'low', answered: 'none' }));
  const rich = computeViabilityScore(
    draft({ confidence: 'high', answered: 'all', linkedCompetitors: 3, sources: 4 }),
  );

  for (const [index, pillar] of lean.pillars.entries()) {
    assert.notEqual(
      pillar.ratio,
      rich.pillars[index].ratio,
      `pillar "${pillar.label}" is constant, which is the bug this rewrite exists to fix`,
    );
  }
});

test('invariant 2b: problem clarity is no longer pinned at full marks', () => {
  // The single most important regression. Before the rewrite this pillar scored
  // 3.00/3.00 on every draft ever generated, because the backfill prose passed
  // a non-empty-string check.
  const unanswered = computeViabilityScore(draft({ answered: 'none' }));
  const clarity = unanswered.pillars.find((pillar) => pillar.key === 'clarity');
  assert.ok(clarity);
  assert.equal(clarity.ratio, 0, 'an unanswered draft must score zero on problem clarity');
});

test('invariant 3: an ungrounded draft cannot reach strong, however good it sounds', () => {
  const perfectButUnsourced = computeViabilityScore(
    draft({
      confidence: 'high',
      answered: 'all',
      linkedCompetitors: 3,
      sources: 0,
      dimensions: allDimensions(100),
    }),
  );

  assert.equal(perfectButUnsourced.ungrounded, true);
  assert.notEqual(perfectButUnsourced.band, 'strong');
  assert.ok(perfectButUnsourced.score < VIABILITY_THRESHOLDS.strong);
});

test('invariant 4: the weakest-driver line varies with the input', () => {
  const summaries = new Set(
    [
      draft({ sources: 2, dimensions: { ...allDimensions(80), painSeverity: 5 } }),
      draft({ sources: 2, dimensions: { ...allDimensions(80), willingnessToPay: 5 } }),
      draft({ sources: 2, dimensions: { ...allDimensions(80), reachability: 5 } }),
      draft({ sources: 2, dimensions: { ...allDimensions(80), founderEdge: 5 } }),
    ].map((fixture) => computeViabilityScore(fixture).summary),
  );

  assert.equal(summaries.size, 4, 'each weakest dimension must produce its own explanation');
});

test('invariant 5: the same draft always produces the same score', () => {
  const fixture = draft({ sources: 3, dimensions: allDimensions(70) });
  const runs = new Set(Array.from({ length: 5 }, () => computeViabilityScore(fixture).score));
  assert.equal(runs.size, 1);
});

/* ------------------------------------------------------------------ *
 * Behaviour of the individual inputs.
 * ------------------------------------------------------------------ */

test('the idea itself moves the score', () => {
  const weakIdea = computeViabilityScore(draft({ sources: 3, dimensions: allDimensions(15) }));
  const strongIdea = computeViabilityScore(draft({ sources: 3, dimensions: allDimensions(90) }));

  assert.ok(
    strongIdea.score - weakIdea.score > 3,
    `the business dimensions must dominate the verdict (${weakIdea.score} vs ${strongIdea.score})`,
  );
});

test('a saturated consumer category lands in needsWork', () => {
  // The acceptance case: "a meal planning app for busy families". Mild pain,
  // consumer wallet, commodity category, diffuse audience, no stated edge.
  const mealPlanner = computeViabilityScore(
    draft({
      confidence: 'medium',
      sources: 2,
      linkedCompetitors: 3,
      answered: ['decisionBrief.primarySegment', 'pain.triggerMoment'],
      dimensions: {
        painSeverity: 25,
        willingnessToPay: 20,
        competitiveIntensity: 15,
        reachability: 30,
        founderEdge: 10,
      },
    }),
  );

  assert.equal(mealPlanner.band, 'needsWork', `scored ${mealPlanner.score}`);
});

test('unlinked competitors earn no differentiation credit', () => {
  const recalled = draft({ unlinkedCompetitors: 3, sources: 2 });
  const retrieved = draft({ linkedCompetitors: 3, sources: 2 });

  assert.equal(countLinkedCompetitors(recalled), 0);
  assert.equal(countLinkedCompetitors(retrieved), 3);
  assert.ok(
    computeViabilityScore(retrieved).score > computeViabilityScore(recalled).score,
    'a competitor we can actually link must be worth more than a name the model recalled',
  );
});

test('placeholder citations do not count as evidence', () => {
  const fixture = draft({ sources: 0, dimensions: allDimensions(60) });
  fixture.sources = [
    { sourceId: 's1', type: 'community', title: 'fake', url: 'https://example.com/thread', detail: null },
    { sourceId: 's2', type: 'community', title: 'broken', url: 'not-a-url', detail: null },
  ];

  assert.equal(computeViabilityScore(fixture).ungrounded, true);
  assert.equal(isAuthenticIcpCitation('https://example.com/x'), false);
  assert.equal(isAuthenticIcpCitation('https://reddit.com/r/x/1'), true);
});

test('rigor damps the verdict without ever carrying it', () => {
  const sameIdea = allDimensions(85);
  const thin = computeViabilityScore(draft({ confidence: 'low', answered: 'none', sources: 1, dimensions: sameIdea }));
  const solid = computeViabilityScore(
    draft({ confidence: 'high', answered: 'all', linkedCompetitors: 3, sources: 4, dimensions: sameIdea }),
  );

  assert.ok(thin.score < solid.score, 'better evidence must raise the same idea');
  assert.ok(thin.score > 1, 'thin evidence must not zero out a genuinely good idea');
});

test('a missing retrieval credential is not scored against the founder', () => {
  /*
   * Reddit killed unauthenticated API access, so without REDDIT_CLIENT_ID the
   * retrieval leg returns nothing. If that read as "no evidence exists for your
   * idea", every founder on the platform would see a capped score and an
   * apology because of an unset secret on our side.
   */
  const sameIdea = allDimensions(85);
  const searchedAndFoundNothing = draft({ sources: 0, dimensions: sameIdea, answered: 'all', confidence: 'high' });
  const neverSearched = draft({ sources: 0, dimensions: sameIdea, answered: 'all', confidence: 'high' });
  neverSearched.evidenceRetrieval = 'unavailable';

  const searched = computeViabilityScore(searchedAndFoundNothing);
  const notSearched = computeViabilityScore(neverSearched);

  assert.equal(searched.ungrounded, true, 'searching and finding nothing is a real signal');
  assert.equal(notSearched.ungrounded, false, 'never searching is not the founder’s problem');
  assert.ok(notSearched.score > searched.score, `${notSearched.score} should beat ${searched.score}`);
  assert.ok(!notSearched.summary.includes('No outside evidence'), notSearched.summary);
});

test('with retrieval unavailable the evidence pillar rescales instead of scoring a miss', () => {
  const fixture = draft({ sources: 0, confidence: 'high', answered: 'all', dimensions: allDimensions(90) });
  fixture.evidenceRetrieval = 'unavailable';

  const result = computeViabilityScore(fixture);
  const evidence = result.pillars.find((pillar) => pillar.key === 'evidence');

  assert.ok(evidence);
  // All-high confidence with the citation term dropped should max the pillar,
  // rather than being stuck at 0.75 because a source count it could never earn.
  assert.equal(evidence.ratio, 1);
  assert.equal(result.band, 'strong', 'a strong idea must still be able to reach strong');
});

test('drafts generated before viabilityAssessment still score', () => {
  const legacy = computeViabilityScore(draft({ dimensions: null, sources: 2, confidence: 'high' }));

  assert.equal(legacy.basis, 'legacy');
  assert.equal(legacy.dimensions.length, 0);
  assert.ok(legacy.score > 1 && legacy.score <= 10);
});
