import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildInsightaPublicInsights } from '../src/lib/insightaPublicInsights.ts';
import { buildTechStackPublicInsights } from '../src/lib/techStackPublicInsights.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Insighta free diagnostic exposes strengths, stage gaps, and a specific next action', () => {
  const insights = buildInsightaPublicInsights({
    questions: [
      { id: 'traction', title: 'Traction', description: 'Evidence of demand', score: 3 },
      { id: 'runway', title: 'Runway', description: 'Time available to execute', score: 4 },
      { id: 'founder_market_fit', title: 'Founder-market fit', description: 'Founder advantage', score: 9 },
      { id: 'feedback', title: 'Customer feedback', description: 'Customer evidence', score: 8 },
    ],
    averageScore: 6,
    stageLabel: 'validation',
    threshold: 6,
    criticalMinimums: { traction: 3, runway: 5 },
  });

  assert.deepEqual(insights.strengths.map(({ id }) => id), ['founder_market_fit', 'feedback']);
  assert.deepEqual(insights.gaps.map(({ id }) => id), ['runway', 'traction']);
  assert.match(insights.nextAction, /18-month cash plan/);
  assert.equal(insights.deltaFromThreshold, 0);
  assert.match(insights.stageComparison, /validation readiness threshold/);
});

test('Tech Stack free intelligence calculates fixed spend, uncertainty, swaps, and risks', () => {
  const insights = buildTechStackPublicInsights(
    { analytics: 'mixpanel', leads: 'apollo', crm: 'pipedrive', backend: 'supabase' },
    [
      {
        id: 'analytics', name: 'Analytics', products: [
          { id: 'mixpanel', name: 'Mixpanel', price: '$25/month', cons: ['Costs rise quickly at scale'] },
          { id: 'plausible', name: 'Plausible', price: '$9/month', cons: [] },
        ],
      },
      {
        id: 'leads', name: 'Lead generation', products: [
          { id: 'apollo', name: 'Apollo', price: '$49/month', cons: ['Expensive for small teams'] },
          { id: 'manual', name: 'Manual prospecting', price: 'Free', cons: [] },
        ],
      },
      {
        id: 'crm', name: 'CRM', products: [
          { id: 'pipedrive', name: 'Pipedrive', price: '$14/month', cons: [] },
          { id: 'hubspot', name: 'HubSpot', price: 'Free / Usage-based', cons: [] },
        ],
      },
      {
        id: 'backend', name: 'Backend', products: [
          { id: 'supabase', name: 'Supabase', price: 'Free / Usage-based', cons: [] },
        ],
      },
    ],
  );

  assert.equal(insights.fixedMonthlyCost, 88);
  assert.equal(insights.annualFixedCost, 1056);
  assert.deepEqual(insights.variableCostTools, ['Supabase']);
  assert.equal(insights.costVisibility, 'Moderate');
  assert.equal(insights.costProfile, 'Lean');
  assert.deepEqual(insights.highestFixedCost, { product: 'Apollo', monthlyCost: 49 });
  assert.equal(insights.potentialMonthlySavings, 79);
  assert.equal(insights.savingsOpportunities.length, 3);
  assert.match(insights.riskSignals[0], /variable or usage-based pricing/);
});

test('free Aha value remains visible before the deeper account gates', () => {
  const insighta = read('../src/components/blog/FundraisingReadinessToolkitAll.tsx');
  const techStack = read('../src/components/tech-stack/TechStack.tsx');

  assert.match(insighta, /Free diagnostic snapshot/);
  assert.match(insighta, /What your score is really saying/);
  assert.match(insighta, /Your next best action/);
  assert.match(techStack, /Free stack intelligence/);
  assert.match(techStack, /Potential fixed-cost reduction/);
  assert.doesNotMatch(techStack, /\{fullPlanUnlocked && annualBlock\}/);
  assert.match(techStack, /Turn this diagnosis into a build plan/);
});
