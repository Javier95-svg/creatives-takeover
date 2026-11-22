import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeStoredArtifact } from '../src/lib/icpDraftArtifacts.ts';
import { computeViabilityScore } from '../src/lib/icpViabilityScore.ts';

/**
 * Reopening a saved draft must show the same draft.
 *
 * Saved drafts are read back through normalizeStoredArtifact (ICP Builder,
 * My files, PMF Lab, Demo Studio hand-off). Its normalizer rebuilt the document
 * section by section and only knew the sections that existed before the
 * decision chain, so a reopened draft silently lost its market read, pricing,
 * risks, experiment, recommendation, viability assessment and provenance map.
 * The verdict then fell back to the rigor-only legacy score and disagreed with
 * the number the founder saw when the draft was generated.
 */

const evidence = { confidence: 'medium', evidence: 'e', missingSignalPrompt: null, provenance: 'founder_input', sourceIds: [] };
const DIMENSIONS = ['painSeverity', 'willingnessToPay', 'competitiveIntensity', 'reachability', 'founderEdge'];

function storedDraft() {
  return {
    gatePreview: { personaName: 'P', roleLine: 'Studio owner', painLine: 'L' },
    decisionBrief: {
      primarySegment: 'Studio owners', nonFitSegment: 'Gyms',
      rankedPains: [1, 2, 3].map((rank) => ({ rank, pain: `pain ${rank}`, evidence: 'e' })),
      buyingTrigger: 't', currentAlternative: 'Spreadsheets', reachableChannels: ['Instagram'],
      interviewValidationPlan: [],
    },
    customer: {
      personaName: 'Sam', roleLine: 'Studio owner', metaLine: '', summary: 'S', behaviors: [], motivations: [],
      whereToFind: [], triggerContext: 'T', actionTrigger: 'A', evidence,
    },
    pain: { quote: 'q', rootCause: 'r', whyItHurts: 'w', triggerMoment: 'm', costOfInaction: 'c', evidence },
    build: { valueProposition: 'v', replaces: [], coreFeatures: [], outcome: 'o', evidence },
    moat: { moatType: 'm', edge: 'e', edgeSource: 's', whyHardToCopy: 'h', incumbentGap: 'g', startupsToStudy: [], evidence },
    competition: { summary: 's', directCompetitors: [], exploitableGap: 'g', evidence },
    market: { category: 'Studio software', whoBuysToday: 'Owners', demandSignal: 'd', whyNow: 'w', evidence },
    pricing: { model: 'Monthly', hypothesis: '$40 per studio per month', anchor: 'a', budgetOwner: 'Owner', evidence },
    risks: [{ rank: 1, type: 'demand', risk: 'r', disprovedBy: 'd' }],
    experiment: {
      title: 'Ask ten owners', hypothesis: 'h', method: 'm', sampleSize: '10',
      passSignal: 'p', failSignal: 'f', timeboxDays: 7,
    },
    recommendation: { headline: 'Narrow to yoga studios', reasoning: 'r', nextMove: 'n' },
    confidence: { level: 'medium', summary: 's', missingSignals: [] },
    nextActions: [],
    sources: [{ sourceId: 'source-1', type: 'community', title: 't', url: 'https://reddit.com/r/yoga/1', detail: null }],
    evidenceRetrieval: 'ok',
    viabilityAssessment: Object.fromEntries(
      DIMENSIONS.map((key) => [key, { score: 72, rationale: 'r', basis: 'inference', sourceIds: [] }]),
    ),
    fieldProvenance: { 'market.whyNow': 'model', 'pricing.hypothesis': 'model' },
  };
}

function reload(draftDocument: ReturnType<typeof storedDraft>) {
  const result = normalizeStoredArtifact({
    analysis_data: { version: 5, generatedAt: '2026-11-21T00:00:00.000Z', draftDocument } as never,
  });
  assert.ok(result.artifact, 'the stored draft should normalize');
  return result.artifact.draftDocument;
}

test('a reopened draft keeps every link of the decision chain', () => {
  const original = storedDraft();
  const reopened = reload(storedDraft());

  assert.deepEqual(reopened.market, original.market);
  assert.deepEqual(reopened.pricing, original.pricing);
  assert.deepEqual(reopened.risks, original.risks);
  assert.deepEqual(reopened.experiment, original.experiment);
  assert.deepEqual(reopened.recommendation, original.recommendation);
  assert.deepEqual(reopened.viabilityAssessment, original.viabilityAssessment);
  assert.deepEqual(reopened.fieldProvenance, original.fieldProvenance);
  assert.equal(reopened.evidenceRetrieval, 'ok');
});

test('a reopened draft scores the same as the draft that was saved', () => {
  const original = computeViabilityScore(storedDraft() as never);
  const reopened = computeViabilityScore(reload(storedDraft()));

  assert.equal(original.basis, 'full');
  assert.equal(reopened.basis, 'full');
  assert.equal(reopened.score, original.score);
  assert.equal(reopened.verdict, original.verdict);
});

test('drafts saved before the chain existed still reopen without it', () => {
  const legacy = storedDraft() as Record<string, unknown>;
  for (const key of ['market', 'pricing', 'risks', 'experiment', 'recommendation', 'viabilityAssessment', 'fieldProvenance', 'evidenceRetrieval']) {
    delete legacy[key];
  }
  const reopened = reload(legacy as never);

  assert.equal(reopened.market, undefined);
  assert.equal(reopened.viabilityAssessment, undefined);
  assert.equal(computeViabilityScore(reopened).basis, 'legacy');
});
