import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { alternativesToBeat, answeredWhatTheyGet } from '../src/lib/icpValuePosition.ts';
import { icpArtifactToGtmIntake } from '../src/lib/icpToGtmIntake.ts';
import { icpArtifactToMvpStart } from '../src/lib/mvp-builder/icpToMvpPrompt.ts';
import { normalizeBeyondCategory } from '../supabase/functions/_shared/fake-value.ts';

/**
 * The value the ICP draft names is what every later tool should serve: the
 * MVP page leads with it, GTM positions against the alternatives, and neither
 * ever receives the placeholder prose an unanswered field holds.
 */

const evidence = { confidence: 'medium', evidence: 'e', missingSignalPrompt: null, provenance: 'founder_input', sourceIds: [] };

function artifact(overrides: Record<string, unknown> = {}) {
  return {
    version: 5,
    draftDocument: {
      gatePreview: { personaName: 'P', roleLine: 'Fleet owner', painLine: 'L' },
      decisionBrief: {
        primarySegment: 'Owners of small trucking fleets', nonFitSegment: 'n',
        rankedPains: [{ rank: 1, pain: 'Fuel receipts take a day each month', evidence: 'e' }],
        buyingTrigger: 'A tax deadline', currentAlternative: 'A shoebox of receipts', reachableChannels: [], interviewValidationPlan: [],
      },
      customer: { personaName: 'P', roleLine: 'Fleet owner', metaLine: '', summary: 's', behaviors: [], motivations: [], whereToFind: [], triggerContext: 't', actionTrigger: 'a', evidence },
      pain: { quote: 'q', rootCause: 'r', whyItHurts: 'w', triggerMoment: 'm', costOfInaction: 'c', evidence },
      build: {
        valueProposition: 'Sorts fuel receipts by truck.', whatTheyGet: 'Month-end closes in an hour instead of a day',
        replaces: [], coreFeatures: [{ title: 'Snap', description: 'Photograph a receipt and file it to the right truck' }],
        outcome: 'Month-end closes faster', evidence,
      },
      moat: { moatType: 'm', edge: 'e', edgeSource: 's', whyHardToCopy: 'h', incumbentGap: 'g', startupsToStudy: [], evidence },
      competition: { summary: 's', directCompetitors: [{ name: 'Expensify', url: null, doesWell: 'x', gap: 'y' }], exploitableGap: 'g', evidence },
      confidence: { level: 'medium', summary: 's', missingSignals: [] },
      nextActions: [],
      alternatives: [
        { option: 'Ignore it until tax time', kind: 'do_nothing', ease: 'easy' },
        { option: 'An accountant', kind: 'competitor', ease: 'hard' },
        { option: 'A spreadsheet', kind: 'diy', ease: 'easy' },
      ],
      fieldProvenance: { 'build.whatTheyGet': 'model' },
      ...overrides,
    },
  } as never;
}

test('only an answered "what they get" is handed on, never the placeholder', () => {
  const answered = (artifact() as any).draftDocument;
  assert.equal(answeredWhatTheyGet(answered), 'Month-end closes in an hour instead of a day');
  const placeholder = (artifact({ fieldProvenance: { 'build.whatTheyGet': 'fallback' } }) as any).draftDocument;
  assert.equal(answeredWhatTheyGet(placeholder), '');
});

test('alternatives to beat are the easiest real options, never "do nothing"', () => {
  const doc = (artifact() as any).draftDocument;
  assert.deepEqual(alternativesToBeat(doc).map((item) => item.option), ['A spreadsheet', 'An accountant']);
});

test('the MVP brief leads with what they get and names the alternative to beat', () => {
  const start = icpArtifactToMvpStart(artifact(), 'Fleet receipts');
  assert.ok(start);
  assert.match(start.prompt, /Lead with what they get: month-end closes in an hour instead of a day\./);
  assert.match(start.prompt, /better for them than a spreadsheet\./);
});

test('the GTM intake positions against every alternative and leads the solution with the value', () => {
  const intake = icpArtifactToGtmIntake({ artifact: artifact(), projectTitle: 'Fleet receipts' });
  assert.ok(intake.knownCompetitors?.includes('A spreadsheet'));
  assert.ok(intake.knownCompetitors?.includes('An accountant'));
  assert.ok(!intake.knownCompetitors?.includes('Ignore it until tax time'));
  assert.match(intake.solution ?? '', /^Month-end closes in an hour instead of a day\. Sorts fuel receipts by truck\./);
});

test('the "beyond the category" idea is kept only when it is complete', () => {
  const idea = { abstractValue: 'Lower emissions', audience: 'Office managers', howToShowIt: 'A carbon badge', channel: 'Coffee shops' };
  assert.deepEqual(normalizeBeyondCategory(idea), idea);
  assert.equal(normalizeBeyondCategory({ ...idea, channel: '' }), null);
  assert.equal(normalizeBeyondCategory(null), null);
});

test('later tools receive the value: MVP context, traction payload and the migration agree', () => {
  const mvp = readFileSync('supabase/functions/mvp-builder-generate/index.ts', 'utf8');
  assert.match(mvp, /What the customer gets \(lead with this\)/);
  assert.match(mvp, /do not present it as proven fact/);
  const traction = readFileSync('src/pages/TractionEnginePage.tsx', 'utf8');
  assert.match(traction, /value_form: experiment\.valueForm \?\? null/);
  const migration = readFileSync('supabase/migrations/20261122100000_value_alternatives_and_value_tested.sql', 'utf8');
  assert.match(migration, /quality_score, sample_size, value_form/);
});
