import test from 'node:test';
import assert from 'node:assert/strict';

import { computeViabilityScore } from '../src/lib/icpViabilityScore.ts';
import { computeIcpViabilityScore } from '../supabase/functions/_shared/icp-viability-score.ts';

/**
 * The badge and the stored niche_score must never disagree.
 *
 * Edge functions cannot import from src/, so the scorer is duplicated in
 * supabase/functions/_shared/. This runs both copies over the same matrix and
 * fails on any divergence, which guards the duplication better than comparing
 * source text would: it tolerates refactors and catches real drift.
 *
 * The server copy has no legacy fallback path (it only ever scores documents
 * the generator just produced), so every fixture here carries a provenance map.
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
  confidence: Confidence;
  answeredCount: number;
  linkedCompetitors: number;
  sources: number;
  dimensionScore: number;
}) {
  const evidence = { confidence: options.confidence, evidence: 'e', missingSignalPrompt: null, sourceIds: [] };
  const fieldProvenance = Object.fromEntries(
    TRACKED_PATHS.map((path, index) => [path, index < options.answeredCount ? 'model' : 'fallback']),
  );

  return {
    gatePreview: { personaName: 'P', roleLine: 'R', painLine: 'L' },
    decisionBrief: {
      primarySegment: 'A', nonFitSegment: 'B',
      rankedPains: [0, 1, 2].map((rank) => ({ rank: rank + 1, pain: 'p', evidence: 'e' })),
      buyingTrigger: 't', currentAlternative: 'c', reachableChannels: [], interviewValidationPlan: [],
    },
    customer: {
      personaName: 'P', roleLine: 'R', metaLine: '', summary: 'S', behaviors: [], motivations: [],
      whereToFind: [], triggerContext: 'T', actionTrigger: 'A', evidence,
    },
    pain: { quote: 'q', rootCause: 'r', whyItHurts: 'w', triggerMoment: 'm', costOfInaction: 'c', evidence },
    build: { valueProposition: 'v', replaces: [], coreFeatures: [], outcome: 'o', evidence },
    moat: {
      moatType: 'm', edge: 'e', edgeSource: 's', whyHardToCopy: 'h', incumbentGap: 'g',
      startupsToStudy: [], evidence,
    },
    competition: {
      summary: 's',
      directCompetitors: Array.from({ length: options.linkedCompetitors }, (_, index) => ({
        name: `C${index}`, url: `https://competitor-${index}.com`, doesWell: 'x', gap: 'y',
      })),
      exploitableGap: 'g', evidence,
    },
    confidence: { level: options.confidence, summary: 's', missingSignals: [] },
    nextActions: [],
    sources: Array.from({ length: options.sources }, (_, index) => ({
      sourceId: `s${index}`, type: 'community' as const,
      title: `t${index}`, url: `https://reddit.com/r/x/${index}`, detail: null,
    })),
    viabilityAssessment: Object.fromEntries(
      DIMENSIONS.map((key) => [key, { score: options.dimensionScore, rationale: 'r', basis: 'inference', sourceIds: [] }]),
    ),
    fieldProvenance,
  } as any;
}

test('both scorer copies agree across the input matrix', () => {
  const divergences: string[] = [];

  for (const confidence of ['low', 'medium', 'high'] as Confidence[]) {
    for (const answeredCount of [0, 4, TRACKED_PATHS.length]) {
      for (const linkedCompetitors of [0, 2, 3]) {
        for (const sources of [0, 1, 4]) {
          for (const dimensionScore of [0, 35, 70, 100]) {
            const draft = fixture({ confidence, answeredCount, linkedCompetitors, sources, dimensionScore });
            const client = computeViabilityScore(draft);
            const server = computeIcpViabilityScore(draft);

            if (client.score !== server.score || client.band !== server.band) {
              divergences.push(
                `confidence=${confidence} answered=${answeredCount} competitors=${linkedCompetitors} ` +
                `sources=${sources} dimensions=${dimensionScore}: ` +
                `client=${client.score}/${client.band} server=${server.score}/${server.band}`,
              );
            }
          }
        }
      }
    }
  }

  assert.deepEqual(divergences, [], `scorer copies diverged:\n${divergences.join('\n')}`);
});

test('both copies agree on legacy drafts with no provenance map', () => {
  // Claiming a guest artifact generated before this shipped runs the stored
  // document back through the server copy. If only the client copy knew how to
  // classify the old backfill prose, the stored score would land well below the
  // badge sitting next to it.
  const legacy = fixture({
    confidence: 'medium', answeredCount: 0, linkedCompetitors: 2, sources: 2, dimensionScore: 60,
  });
  delete legacy.fieldProvenance;
  delete legacy.viabilityAssessment;

  // Half the fields hold the historical backfill prose, half hold real answers.
  legacy.pain.costOfInaction = 'The cost of leaving this pain unsolved still needs to be made explicit.';
  legacy.pain.triggerMoment = 'When the invoice passes 30 days overdue';
  legacy.decisionBrief.buyingTrigger = 'The buying trigger still needs validation.';
  legacy.moat.whyHardToCopy = 'Ten years of referral relationships in this niche';
  legacy.moat.incumbentGap = 'The incumbent gap still needs to be stated more sharply.';
  legacy.competition.exploitableGap = 'Nobody serves single-operator studios';
  legacy.decisionBrief.rankedPains[1].pain = 'Secondary pain 2 still needs interview evidence.';
  legacy.decisionBrief.rankedPains[2].pain = 'Secondary pain 3 still needs interview evidence.';

  const client = computeViabilityScore(legacy);
  const server = computeIcpViabilityScore(legacy);

  assert.equal(server.score, client.score);
  assert.equal(server.band, client.band);
  assert.equal(client.basis, 'legacy');
  // The mixed fixture must land strictly between the all-real and all-backfill
  // extremes, proving the fallback classifier actually discriminates.
  assert.ok(client.rigor > 0.3 && client.rigor < 1, `rigor was ${client.rigor}`);
});

test('the stored niche_score derives from the same number as the badge', () => {
  const draft = fixture({
    confidence: 'medium', answeredCount: 6, linkedCompetitors: 2, sources: 3, dimensionScore: 70,
  });

  const badge = computeViabilityScore(draft);
  const stored = computeIcpViabilityScore(draft);

  // icp-analyzer stores Math.round(score * 10) and the band label as verdict.
  assert.equal(Math.round(stored.score * 10), Math.round(badge.score * 10));
  assert.equal(stored.label, badge.label);
});
