import test from 'node:test';
import assert from 'node:assert/strict';

import { computeValuePosition } from '../src/lib/icpValuePosition.ts';
import { computeViabilityScore } from '../src/lib/icpViabilityScore.ts';
import { normalizeStoredArtifact } from '../src/lib/icpDraftArtifacts.ts';

/**
 * Value is what people want and cannot easily get elsewhere.
 *
 * The draft used to judge only the first half (pain, willingness to pay) and
 * only in the language of problems, which marked every want-led idea (a club,
 * a brand, a treat) as weak by construction. These tests cover the browser
 * side: where an idea sits on both halves, how a want-led idea is described,
 * and that the new fields survive a saved draft being reopened. The generator
 * side is covered in icp-draft-value-fields.test.ts.
 */

const evidence = { confidence: 'medium', evidence: 'e', missingSignalPrompt: null, provenance: 'founder_input', sourceIds: [] };

function scored(scores: Record<string, number>, primary?: string) {
  const dimensions = ['painSeverity', 'willingnessToPay', 'competitiveIntensity', 'reachability', 'founderEdge'];
  return {
    gatePreview: { personaName: 'P', roleLine: 'R', painLine: 'L' },
    customer: {
      personaName: 'P', roleLine: 'Runner', metaLine: '', summary: 'S', behaviors: [], motivations: [],
      whereToFind: [], triggerContext: 'T', actionTrigger: 'A', evidence,
    },
    pain: { quote: 'q', rootCause: 'r', whyItHurts: 'w', triggerMoment: 'm', costOfInaction: 'c', evidence },
    build: { valueProposition: 'v', replaces: [], coreFeatures: [], outcome: 'o', evidence },
    moat: { moatType: 'm', edge: 'e', edgeSource: 's', whyHardToCopy: 'h', incumbentGap: 'g', startupsToStudy: [], evidence },
    competition: { summary: 's', directCompetitors: [], exploitableGap: 'g', evidence },
    confidence: { level: 'medium', summary: 's', missingSignals: [] },
    nextActions: [],
    sources: [],
    ...(primary ? { valueForm: { primary, secondary: null } } : {}),
    viabilityAssessment: Object.fromEntries(
      dimensions.map((key) => [key, { score: scores[key] ?? 60, rationale: 'r', basis: 'inference', sourceIds: [] }]),
    ),
  } as never;
}

test('the value position puts wanted-but-easy-to-replace ideas in their own corner', () => {
  const commodity = computeValuePosition(scored({ painSeverity: 85, willingnessToPay: 75, competitiveIntensity: 20, founderEdge: 10 }));
  assert.equal(commodity?.quadrant, 'easy_to_replace');
  assert.equal(commodity?.wanted, 80);
  assert.equal(commodity?.hardToFind, 15);

  assert.equal(computeValuePosition(scored({ painSeverity: 80, willingnessToPay: 70, competitiveIntensity: 70, founderEdge: 60 }))?.quadrant, 'valuable');
  assert.equal(computeValuePosition(scored({ painSeverity: 20, willingnessToPay: 20, competitiveIntensity: 80, founderEdge: 70 }))?.quadrant, 'unwanted');
  assert.equal(computeValuePosition(scored({ painSeverity: 20, willingnessToPay: 20, competitiveIntensity: 20, founderEdge: 20 }))?.quadrant, 'weak');
});

test('drafts without a viability assessment have no value position', () => {
  const draft = scored({}) as Record<string, unknown>;
  delete draft.viabilityAssessment;
  assert.equal(computeValuePosition(draft as never), null);
});

test('a want-led idea is never described as weak on "pain severity"', () => {
  const lowest = { painSeverity: 10, willingnessToPay: 70, competitiveIntensity: 70, reachability: 70, founderEdge: 70 };
  assert.equal(computeViabilityScore(scored(lowest, 'belonging')).weakestDriver.label, 'how much they want it');
  assert.equal(computeViabilityScore(scored(lowest, 'fix')).weakestDriver.label, 'pain severity');
  // Label only: the number does not change with the form.
  assert.equal(computeViabilityScore(scored(lowest, 'belonging')).score, computeViabilityScore(scored(lowest, 'fix')).score);
});

test('a reopened draft keeps what they get, the value form and the alternatives', () => {
  const stored = scored({}, 'belonging') as Record<string, any>;
  stored.build.whatTheyGet = 'A crew to run with every Sunday';
  stored.alternatives = [{ option: 'Run alone', kind: 'do_nothing', ease: 'easy' }];

  const reopened = normalizeStoredArtifact({
    analysis_data: { version: 5, draftDocument: stored } as never,
  }).artifact?.draftDocument;

  assert.equal(reopened?.build.whatTheyGet, 'A crew to run with every Sunday');
  assert.deepEqual(reopened?.valueForm, { primary: 'belonging', secondary: null });
  assert.deepEqual(reopened?.alternatives, [{ option: 'Run alone', kind: 'do_nothing', ease: 'easy' }]);
});
