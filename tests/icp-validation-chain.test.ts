import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeViabilityScore,
  resolveViabilityVerdict,
  toDisplayScore,
  VIABILITY_THRESHOLDS,
  VERDICT_LABELS,
} from '../src/lib/icpViabilityScore.ts';
import {
  resolveViabilityVerdict as serverResolveVerdict,
  toDisplayScore as serverToDisplayScore,
} from '../supabase/functions/_shared/icp-viability-score.ts';
import { buildIcpScoreCard, buildIcpShareText, LEGACY_SHARE_COPY } from '../src/lib/icpScoreCard.ts';

/**
 * The verdict is derived, not written.
 *
 * The generator is forbidden from stating a verdict precisely so the words and
 * the number can never disagree. These tests are what makes that a guarantee
 * rather than a comment: if the derivation ever drifts from the bands, a
 * founder ends up reading "Build it" beside 31/100, which teaches them that
 * neither the word nor the number means anything.
 */

type Confidence = 'high' | 'medium' | 'low';
const DIMENSIONS = ['painSeverity', 'willingnessToPay', 'competitiveIntensity', 'reachability', 'founderEdge'] as const;

const TRACKED_PATHS = [
  'decisionBrief.rankedPains.0',
  'decisionBrief.rankedPains.1',
  'decisionBrief.rankedPains.2',
  'decisionBrief.buyingTrigger',
  'pain.triggerMoment',
  'pain.costOfInaction',
  'moat.whyHardToCopy',
  'moat.incumbentGap',
  'competition.exploitableGap',
];

function fixture(options: {
  confidence?: Confidence;
  answeredCount?: number;
  linkedCompetitors?: number;
  sources?: number;
  dimensionScore?: number;
} = {}) {
  const {
    confidence = 'medium',
    answeredCount = TRACKED_PATHS.length,
    linkedCompetitors = 3,
    sources = 4,
    dimensionScore = 70,
  } = options;

  const evidence = { confidence, evidence: 'e', missingSignalPrompt: null, sourceIds: [] };
  const fieldProvenance: Record<string, string> = Object.fromEntries(
    TRACKED_PATHS.map((path, index) => [path, index < answeredCount ? 'model' : 'fallback']),
  );
  // The chain fields the score card reads.
  for (const path of ['market.category', 'market.whoBuysToday', 'recommendation.headline', 'risks.0']) {
    fieldProvenance[path] = 'model';
  }

  return {
    gatePreview: { personaName: 'P', roleLine: 'R', painLine: 'L' },
    decisionBrief: {
      primarySegment: 'A', nonFitSegment: 'B',
      rankedPains: [0, 1, 2].map((rank) => ({ rank: rank + 1, pain: 'p', evidence: 'e' })),
      buyingTrigger: 't', currentAlternative: 'c', reachableChannels: [], interviewValidationPlan: [],
    },
    customer: {
      personaName: 'Shop owner', roleLine: 'Runs a two-chair barbershop', metaLine: '', summary: 'S',
      behaviors: [], motivations: [], whereToFind: [], triggerContext: 'T', actionTrigger: 'A', evidence,
    },
    pain: { quote: 'q', rootCause: 'r', whyItHurts: 'w', triggerMoment: 'm', costOfInaction: 'c', evidence },
    build: { valueProposition: 'SECRET_VALUE_PROP', replaces: [], coreFeatures: [], outcome: 'o', evidence },
    moat: {
      moatType: 'm', edge: 'SECRET_EDGE', edgeSource: 's', whyHardToCopy: 'h', incumbentGap: 'g',
      startupsToStudy: [], evidence,
    },
    competition: {
      summary: 'c',
      directCompetitors: Array.from({ length: linkedCompetitors }, (_, index) => ({
        name: `Rival ${index + 1}`,
        url: `https://rival${index + 1}.com`,
        doesWell: 'SECRET_DOES_WELL',
        gap: 'SECRET_GAP',
      })),
      exploitableGap: 'x',
      evidence,
    },
    market: { category: 'Barbershop software', whoBuysToday: 'Shops already paying Booksy', demandSignal: 'd', whyNow: 'n', evidence },
    pricing: { model: 'per shop per month', hypothesis: '$40-80 per shop per month', anchor: 'SECRET_ANCHOR', budgetOwner: 'Owner', evidence },
    risks: [
      { rank: 1, type: 'demand' as const, risk: 'Shops may tolerate no-shows', disprovedBy: 'Ten owners name a cost' },
      { rank: 2, type: 'competition' as const, risk: 'SECRET_RISK_TWO', disprovedBy: 'x' },
    ],
    experiment: {
      title: 'SECRET_EXPERIMENT', hypothesis: 'h', method: 'm', sampleSize: '10',
      passSignal: 'p', failSignal: 'f', timeboxDays: 7,
    },
    recommendation: { headline: 'Narrow to shops already paying for booking software.', reasoning: 'r', nextMove: 'n' },
    confidence: { level: confidence, summary: 's', missingSignals: [] },
    nextActions: [],
    sources: Array.from({ length: sources }, (_, index) => ({
      sourceId: `s${index}`, type: 'community' as const, title: 't', url: `https://example${index}.org/x`, detail: null,
    })),
    evidenceRetrieval: 'ok' as const,
    viabilityAssessment: Object.fromEntries(
      DIMENSIONS.map((key) => [key, { score: dimensionScore, rationale: 'r', basis: 'inference' as const, sourceIds: [] }]),
    ),
    fieldProvenance,
  } as never;
}

test('the display score is the internal score out of 100, losslessly', () => {
  assert.equal(toDisplayScore(7.8), 78);
  assert.equal(toDisplayScore(1), 10);
  assert.equal(toDisplayScore(10), 100);
  // Whatever the scorer can produce must round-trip to a whole number.
  for (let raw = 1; raw <= 10; raw += 0.1) {
    const rounded = Math.round(raw * 10) / 10;
    assert.equal(toDisplayScore(rounded), Math.round(rounded * 10));
  }
});

test('the verdict never contradicts the number beside it', () => {
  for (let raw = 1; raw <= 10; raw += 0.1) {
    const score = Math.round(raw * 10) / 10;
    const verdict = resolveViabilityVerdict(score, false);

    if (score >= VIABILITY_THRESHOLDS.strong) {
      assert.equal(verdict, 'build', `${score} should be build`);
    } else if (score >= VIABILITY_THRESHOLDS.promising) {
      assert.equal(verdict, 'narrow', `${score} should be narrow`);
    } else {
      assert.ok(
        verdict === 'investigate' || verdict === 'stop',
        `${score} must not recommend building, got ${verdict}`,
      );
    }
  }
});

test('"stop" is reachable, so the engine can tell a founder the idea is bad', () => {
  const hopeless = computeViabilityScore(
    fixture({ dimensionScore: 5, answeredCount: 0, linkedCompetitors: 0, sources: 0, confidence: 'low' }),
  );
  assert.equal(hopeless.verdict, 'stop', `scored ${hopeless.displayScore}`);
  assert.equal(hopeless.verdictLabel, VERDICT_LABELS.stop);
});

test('a strong, well-evidenced idea reaches "build"', () => {
  const strong = computeViabilityScore(fixture({ dimensionScore: 95, confidence: 'high' }));
  assert.equal(strong.verdict, 'build', `scored ${strong.displayScore}`);
  assert.ok(strong.displayScore >= 80);
});

test('an uncorroborated draft is sent to investigate rather than to build', () => {
  // Nothing retrieved: the score is capped just under strong, and the honest
  // call is to go and look rather than to build on an unverified read.
  const ungrounded = computeViabilityScore(fixture({ dimensionScore: 98, sources: 0, confidence: 'high' }));
  assert.equal(ungrounded.ungrounded, true);
  assert.equal(ungrounded.verdict, 'investigate', `scored ${ungrounded.displayScore}`);
});

/**
 * A share snapshot is fetched by the browser, so anything inside it is public
 * regardless of what the page chooses to render. Gating in the component would
 * be theatre; these assertions are the actual gate.
 */
test('the shared score card carries no gated content', () => {
  const card = buildIcpScoreCard(fixture(), { idea: 'an app that helps barbers stop losing no-shows' });
  const serialized = JSON.stringify(card);

  for (const secret of [
    'SECRET_VALUE_PROP',
    'SECRET_EDGE',
    'SECRET_GAP',
    'SECRET_DOES_WELL',
    'SECRET_ANCHOR',
    'SECRET_EXPERIMENT',
    'SECRET_RISK_TWO',
  ]) {
    assert.ok(!serialized.includes(secret), `${secret} leaked onto the public score card`);
  }
});

test('the shared score card carries what makes the number legible to a stranger', () => {
  const idea = 'an app that helps barbers stop losing no-shows';
  const card = buildIcpScoreCard(fixture(), { idea });

  assert.equal(card.idea, idea);
  assert.equal(card.displayScore, computeViabilityScore(fixture()).displayScore);
  assert.equal(card.verdictLabel, VERDICT_LABELS[card.verdict]);
  assert.equal(card.category, 'Barbershop software');
  // Competitor names prove the check ran; the gap analysis stays gated.
  assert.deepEqual(card.competitorNames, ['Rival 1', 'Rival 2', 'Rival 3']);
  assert.equal(card.topRisk, 'Shops may tolerate no-shows');
  assert.ok(card.headline);
});

test('the frozen card does not move when the scorer would', () => {
  // The card is a record of a claim, so it must be a value, not a view. If it
  // ever recomputed on read, an edit to the draft would silently rewrite what
  // the founder posted publicly.
  const card = buildIcpScoreCard(fixture({ dimensionScore: 90 }), { idea: 'x' });
  const weakened = buildIcpScoreCard(fixture({ dimensionScore: 10 }), { idea: 'x' });
  assert.ok(card.displayScore > weakened.displayScore);
  assert.equal(typeof card.displayScore, 'number');
  assert.equal(card.version, 1);
});

test('an unanswered chain field never reaches the public card as a finding', () => {
  // The generator backfills gaps with readable prose. On a public card that
  // filler would read as a market finding to someone who cannot see the draft.
  const draft = fixture() as unknown as Record<string, unknown>;
  (draft.fieldProvenance as Record<string, string>)['market.category'] = 'fallback';
  (draft.fieldProvenance as Record<string, string>)['recommendation.headline'] = 'fallback';

  const card = buildIcpScoreCard(draft as never, { idea: 'x' });
  assert.equal(card.category, null);
  assert.equal(card.headline, null);
});

/**
 * X is the only network of the three that renders supplied text, so this string
 * is the whole difference between a post that makes a claim and one that
 * describes a document. It is also the top of the funnel for every referral.
 */
test('the shared post states the score', () => {
  const card = buildIcpScoreCard(fixture({ dimensionScore: 95, confidence: 'high' }), { idea: 'x' });
  const text = buildIcpShareText(card);
  assert.ok(text.includes(`${card.displayScore}/100`), text);
  assert.ok(text.includes(String(card.displayScore)));
});

test('a low score gets a post worth making, not a consolation prize', () => {
  const weak = buildIcpScoreCard(
    fixture({ dimensionScore: 8, answeredCount: 0, linkedCompetitors: 0, sources: 0, confidence: 'low' }),
    { idea: 'x' },
  );
  const text = buildIcpShareText(weak);
  assert.ok(text.includes(`${weak.displayScore}/100`), text);
  // The rank-1 risk is the interesting half of a bad score.
  assert.ok(text.includes('Shops may tolerate no-shows'), text);
});

test('every share post fits in a tweet once the URL is appended', () => {
  const URL_COST = 23 + 1;
  for (const dimensionScore of [5, 30, 55, 70, 95]) {
    const card = buildIcpScoreCard(fixture({ dimensionScore }), { idea: 'x' });
    const length = buildIcpShareText(card).length + URL_COST;
    assert.ok(length <= 280, `post was ${length} chars at dimensionScore ${dimensionScore}`);
  }
  assert.ok(LEGACY_SHARE_COPY.length + URL_COST <= 280);
});

test('a draft with no score card falls back to copy that still reads', () => {
  assert.equal(buildIcpShareText(null), LEGACY_SHARE_COPY);
});

test('the client and server derive the same verdict and display score', () => {
  for (let raw = 1; raw <= 10; raw += 0.1) {
    const score = Math.round(raw * 10) / 10;
    for (const ungrounded of [true, false]) {
      assert.equal(
        resolveViabilityVerdict(score, ungrounded),
        serverResolveVerdict(score, ungrounded),
        `verdict drift at ${score} (ungrounded=${ungrounded})`,
      );
    }
    assert.equal(toDisplayScore(score), serverToDisplayScore(score));
  }
});
