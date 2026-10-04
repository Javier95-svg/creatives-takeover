import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { icpArtifactToGtmIntake, icpCoversGtmMarket } from '../src/lib/icpToGtmIntake.ts';
import { icpArtifactToMvpStart } from '../src/lib/mvp-builder/icpToMvpPrompt.ts';
import type { StoredIcpArtifact } from '../src/lib/icpBuilderSession.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const artifact = {
  draftDocument: {
    gatePreview: { personaName: 'Fleet Fran', roleLine: 'Owner of a small trucking fleet', painLine: 'Receipts pile up' },
    decisionBrief: {
      primarySegment: 'Owners of 5 to 30 truck fleets in Texas',
      nonFitSegment: 'Enterprise fleets',
      rankedPains: [
        { rank: 2, pain: 'Drivers lose paper receipts', evidence: '' },
        { rank: 1, pain: 'Month-end fuel reconciliation takes a full day', evidence: '' },
      ],
      buyingTrigger: 'An audit or a tax deadline',
      currentAlternative: 'a shoebox and a spreadsheet',
      reachableChannels: ['Facebook groups'],
      interviewValidationPlan: [],
    },
    customer: { personaName: 'Fleet Fran', roleLine: 'Fleet owner', metaLine: '', summary: '', behaviors: [], motivations: [], whereToFind: [], triggerContext: '', actionTrigger: '', evidence: {} },
    pain: { quote: '', rootCause: '', whyItHurts: '', triggerMoment: '', costOfInaction: '', evidence: {} },
    build: {
      valueProposition: 'FleetReceipts sorts fuel receipts by truck.',
      replaces: [],
      coreFeatures: [{ title: 'Snap a receipt', description: 'snap a fuel receipt and see it filed under the right truck' }],
      outcome: 'Month-end closes in ten minutes',
      evidence: {},
    },
    moat: { moatType: '', edge: '', edgeSource: '', whyHardToCopy: '', incumbentGap: '', startupsToStudy: [], evidence: {} },
    competition: {
      summary: '',
      directCompetitors: [{ name: 'Expensify', url: null, doesWell: '', gap: '' }, { name: 'Fleetio', url: null, doesWell: '', gap: '' }],
      exploitableGap: '',
      evidence: {},
    },
  },
} as unknown as StoredIcpArtifact;

test('GTM intake is pre-filled from the ICP and the PMF verdict', () => {
  const prefill = icpArtifactToGtmIntake({ artifact, projectTitle: 'FleetReceipts', pmf: { verdict: 'Narrow', score: 54.4 } });
  assert.equal(prefill.productName, 'FleetReceipts');
  assert.equal(prefill.targetSegment, 'Owners of 5 to 30 truck fleets in Texas');
  // The top-ranked pain leads, with the current workaround.
  assert.match(prefill.problem ?? '', /^Month-end fuel reconciliation takes a full day\. Today they work around it with a shoebox/);
  assert.match(prefill.solution ?? '', /sorts fuel receipts by truck\. Month-end closes/);
  assert.equal(prefill.buyingTrigger, 'An audit or a tax deadline');
  assert.deepEqual(prefill.knownCompetitors, ['Expensify', 'Fleetio', 'a shoebox and a spreadsheet']);
  assert.equal(prefill.currentTraction, 'PMF Lab verdict: Narrow, score 54.');
  // What the ICP does not know stays with the founder.
  for (const key of ['geography', 'businessModel', 'weeklyTimeHours', 'monthlyBudget', 'sixWeekOutcome']) {
    assert.equal(key in prefill, false, key);
  }
  assert.equal(icpCoversGtmMarket(prefill), true);
  // A placeholder project title is not used as a product name; a long value
  // proposition is not guessed into one either, so the founder types it.
  assert.equal('productName' in icpArtifactToGtmIntake({ artifact, projectTitle: 'My project' }), false);
});

test('MVP Builder offers a first message built from the ICP', () => {
  const start = icpArtifactToMvpStart(artifact, 'FleetReceipts');
  assert.ok(start);
  assert.equal(start.customer, 'Owners of 5 to 30 truck fleets in Texas');
  assert.match(start.prompt, /^A first version of FleetReceipts for Owners of 5 to 30 truck fleets in Texas\./);
  assert.match(start.prompt, /The one thing they should get done: snap a fuel receipt and see it filed under the right truck\./);
  assert.match(start.prompt, /It works if month-end closes in ten minutes\./);
});

test('choosing a project makes it current on the server too', () => {
  const projects = read('src/hooks/useProjects.ts');
  assert.match(projects, /export async function touchProject/);
  assert.match(projects, /update\(\{ last_run_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(projects, /void touchProject\(projectId\)\.finally\(invalidate\)/);
  assert.match(read('src/hooks/useActiveProjectContext.ts'), /touchProject\(activeProjectId\)/);
});

test('every tool reads and pre-fills from the active project', () => {
  const gtmPage = read('src/pages/GTMStrategistPage.tsx');
  assert.match(gtmPage, /useGTMStrategist\(projectContext\.projectId\)/);
  assert.match(gtmPage, /icpArtifactToGtmIntake\(/);
  assert.match(gtmPage, /<ToolProjectContext context=\{projectContext\} \/>/);
  assert.match(read('src/hooks/useGTMStrategist.ts'), /savedQuery\.eq\('project_id', projectId\)\.is\('superseded_at', null\)/);

  const demo = read('src/pages/demo-studio/ProjectsDashboardPage.tsx');
  assert.match(demo, /workspaceProjectId: projectContext\.projectId/);
  assert.match(demo, /updateBrief\(project\.id, user\.id, icpArtifactToDemoBrief\(projectContext\.icp\.artifact\)\.patch\)/);
  assert.match(read('src/lib/demoStudio/api.ts'), /project_id: fields\.workspaceProjectId/);

  const pmf = read('src/pages/PMFLabPage.tsx');
  assert.match(pmf, /icpAnalysisId: projectIcpId/);
  assert.match(pmf, /<ToolProjectContext context=\{projectContext\} \/>/);

  const mvp = read('src/components/mvp-builder/MVPBuilder.tsx');
  assert.match(mvp, /icpArtifactToMvpStart\(/);
  assert.match(mvp, /projectSwitcher=\{<ProjectSwitcher \/>\}/);
  assert.match(mvp, /if \(currentAppId\) void loadProject\(currentAppId\)/);
  assert.match(read('src/components/mvp-builder/MVPBuilderChat.tsx'), /Build for \{projectStart\.title\}/);
});
