import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStartupCommandCenterModel,
  normalizeStartupManualProfile,
  selectLatestByTimestamp,
} from '../src/lib/startupCommandCenter.ts';

function makeIcpRow() {
  return {
    id: 'icp-1',
    user_id: 'user-1',
    business_description: 'AI ops assistant',
    target_audience: 'Operations managers',
    verdict: 'Promising',
    analysis_data: {
      version: 4,
      generatedAt: '2026-04-01T10:00:00.000Z',
      founderInputs: {
        mode: 'guided',
        fastDescription: null,
        guided: {
          seed: 'AI ops assistant',
          persona: {
            role: 'Operations manager',
            industry: 'Logistics',
            experience: '5+ years',
          },
          specificity: 'Mid-market logistics teams',
          pain: 'Chasing shipment exceptions across disconnected tools',
          workaround: 'Manual spreadsheets',
          solutionCompletion: 'resolve exceptions before customers ask',
          marketContext: 'manual_or_no_product',
          founderEdge: 'Former logistics operator',
        },
      },
      draftDocument: {
        gatePreview: {
          personaName: 'Olivia Ops',
          roleLine: 'Operations manager at a mid-market logistics company',
          painLine: 'Chasing shipment exceptions across disconnected tools',
        },
        customer: {
          personaName: 'Olivia Ops',
          roleLine: 'Operations manager at a mid-market logistics company',
          metaLine: 'Logistics',
          summary: 'Owns daily exception handling.',
          behaviors: ['Checks dashboards every morning'],
          motivations: ['Prevent customer escalations'],
          whereToFind: ['LinkedIn ops groups'],
          triggerContext: 'A shipment exception appears before a customer call.',
          actionTrigger: 'Escalations start piling up.',
          evidence: { confidence: 'high', evidence: 'Founder interviews', missingSignalPrompt: null },
        },
        pain: {
          quote: 'I lose an hour every morning reconciling exceptions.',
          rootCause: 'Data is split across carrier portals.',
          whyItHurts: 'Customers ask before the team has answers.',
          triggerMoment: 'Morning exception review.',
          costOfInaction: 'Refunds and support escalations rise.',
          evidence: { confidence: 'high', evidence: 'Interview pattern', missingSignalPrompt: null },
        },
        build: {
          valueProposition: 'Resolve shipment exceptions before customers ask.',
          replaces: ['Spreadsheets', 'Carrier portal checks'],
          coreFeatures: [{ title: 'Exception inbox', description: 'One queue for shipment problems.' }],
          outcome: 'Ops teams know what to fix first.',
          evidence: { confidence: 'medium', evidence: 'Founder inputs', missingSignalPrompt: null },
        },
        moat: {
          moatType: 'Workflow depth',
          edge: 'Deep operations context',
          edgeSource: 'Founder background',
          whyHardToCopy: 'Requires carrier workflow knowledge.',
          incumbentGap: 'Generic tools miss exception context.',
          startupsToStudy: [],
          evidence: { confidence: 'medium', evidence: 'Market scan', missingSignalPrompt: null },
        },
        competition: {
          summary: 'Teams choose between spreadsheets and broad TMS products.',
          directCompetitors: [
            { name: 'Generic TMS', url: null, doesWell: 'Broad workflows', gap: 'Weak exception triage' },
          ],
          exploitableGap: 'Exception-first workflows are under-served.',
          evidence: { confidence: 'medium', evidence: 'Competitor scan', missingSignalPrompt: null },
        },
        confidence: {
          level: 'high',
          summary: 'Strong directional signal.',
          missingSignals: [],
        },
        nextActions: [],
      },
      dashboardContext: {
        message: 'We know who you are building for.',
        suggestedStage: 'IDENTITY',
        prioritizedTasks: [],
        recommendations: [],
      },
      enrichment: null,
    },
    created_at: '2026-04-01T10:00:00.000Z',
    updated_at: '2026-04-02T10:00:00.000Z',
  };
}

test('manual-only profile renders useful startup fields', () => {
  const manual = normalizeStartupManualProfile({
    startup_name: 'Northstar Ops',
    startup_industry: ['Logistics'],
    startup_description: 'AI workflows for logistics teams.',
    startup_stage: 'mvp',
    website_url: 'https://northstar.example',
    positioning_line: 'Exception management for logistics operators.',
    user_preferences: {
      startup_profile: {
        target_market: 'Mid-market logistics teams',
        revenue_model: 'Subscription',
      },
    },
    startup_links: {
      waitlist: 'https://northstar.example/waitlist',
    },
    updated_at: '2026-04-03T10:00:00.000Z',
  });

  assert.equal(manual.startupName, 'Northstar Ops');
  assert.deepEqual(manual.industries, ['Logistics']);
  assert.equal(manual.targetMarket, 'Mid-market logistics teams');
  assert.equal(manual.revenueModel, 'Subscription');
  assert.equal(manual.links.waitlist, 'https://northstar.example/waitlist');
});

test('ICP artifact maps customer, pain, competition, and positioning', () => {
  const model = buildStartupCommandCenterModel({
    profile: { startup_name: 'Northstar Ops', user_preferences: {} },
    icpRow: makeIcpRow(),
  });

  assert.equal(model.generated.icp?.snapshot.roleLine, 'Operations manager at a mid-market logistics company');
  assert.equal(model.generated.icp?.snapshot.corePainPoint, 'I lose an hour every morning reconciling exceptions.');
  assert.equal(model.generated.icp?.productPositioning, 'Resolve shipment exceptions before customers ask.');
  assert.deepEqual(model.generated.icp?.competitors, ['Generic TMS']);
});

test('latest PMF and Tech Stack rows are selected by newest timestamp', () => {
  const latest = selectLatestByTimestamp([
    { id: 'old', updated_at: '2026-04-01T10:00:00.000Z' },
    { id: 'new', updated_at: '2026-04-05T10:00:00.000Z' },
    { id: 'middle', updated_at: '2026-04-03T10:00:00.000Z' },
  ]);

  assert.equal(latest?.id, 'new');
});

test('generated values do not overwrite manual profile fields', () => {
  const model = buildStartupCommandCenterModel({
    profile: {
      startup_name: 'Manual Name',
      startup_industry: ['Fintech'],
      positioning_line: 'Manual positioning line.',
      user_preferences: {},
      updated_at: '2026-04-03T10:00:00.000Z',
    },
    icpRow: makeIcpRow(),
    pmfRow: {
      id: 'pmf-1',
      pmf_score: 72,
      verdict: 'Partial Validation',
      analysis_data: {
        summaryInsight: 'Demand is real but proof is still thin.',
        gaps: ['Pricing intent needs stronger evidence.'],
      },
      created_at: '2026-04-04T10:00:00.000Z',
    },
    techStackRow: {
      id: 'stack-1',
      name: 'MVP stack',
      budget_total: 129,
      budget_breakdown: [{ product: 'Supabase' }, { product: 'Vercel' }],
      has_variable: true,
      updated_at: '2026-04-05T10:00:00.000Z',
    },
  });

  assert.equal(model.manual.startupName, 'Manual Name');
  assert.equal(model.manual.positioningLine, 'Manual positioning line.');
  assert.equal(model.primaryIndustry, 'Fintech');
  assert.equal(model.generated.pmf?.score, 72);
  assert.deepEqual(model.generated.techStack?.selectedTools, ['Supabase', 'Vercel']);
});
