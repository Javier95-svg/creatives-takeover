import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { evaluateGTMOutcome } from '../src/lib/gtmOutcome.ts';
import { evaluateMvpQuality } from '../src/lib/mvp-builder/qualityChecks.ts';
import { getPmfConfidence, getPmfDecision } from '../src/lib/pmfConfidence.ts';
import type { GTMPlanV2 } from '../src/lib/gtmV2.ts';

test('PMF confidence changes exactly at five, ten, and twenty five weighted signals', () => {
  assert.equal(getPmfConfidence(4).grade, 'insufficient');
  assert.equal(getPmfConfidence(5).grade, 'directional');
  assert.equal(getPmfConfidence(10).grade, 'emerging');
  assert.equal(getPmfConfidence(25).grade, 'decision_grade');
  assert.deepEqual([35, 50, 65, 80].map(getPmfDecision), ['stop', 'pivot', 'narrow', 'build']);
});

test('MVP readiness requires a working primary flow, responsive UI, clean runtime, and rollback', () => {
  const result = evaluateMvpQuality({
    files: [{ path: 'index.html', language: 'html', content: '<meta name="viewport" content="width=device-width"><form><button>Start</button></form>' }],
    preview: { html: '<html></html>', entryFile: 'index.html', canPreview: true, warnings: [], errors: [], runtimeMode: 'static', consoleHints: [] },
    versionCount: 1,
    smokeTestPassed: true,
  });
  assert.equal(result.passed, true);

  const unsafe = evaluateMvpQuality({
    files: [{ path: 'index.html', language: 'html', content: '<p>Placeholder</p>' }],
    preview: { html: null, entryFile: null, canPreview: false, warnings: [], errors: ['Runtime failure'], runtimeMode: 'none', consoleHints: [] },
    versionCount: 0,
  });
  assert.equal(unsafe.passed, false);
  assert.equal(unsafe.checks.no_runtime_errors, false);
  assert.equal(unsafe.checks.rollback_support, false);
});

const gtmPlan = (withSprint: boolean): GTMPlanV2 => ({
  schemaVersion: 2,
  planTitle: 'Evidence GTM',
  summaryInsight: 'Run one measurable play.',
  intake: {
    productName: 'Compass', lifecycle: 'live', businessModel: 'b2b_saas', targetSegment: 'First time founders', geography: 'Global',
    problem: 'Unclear market', solution: 'Evidence path', currentTraction: 'Early', weeklyTimeHours: 5, monthlyBudget: 0,
    founderStrengths: ['Writing'], knownCompetitors: ['Spreadsheets'], sixWeekOutcome: 'Ten qualified conversations',
  },
  researchStatus: 'complete',
  researchSources: [{ id: 'research-1', title: 'Primary research', url: 'https://example.com' }],
  assumptions: [],
  thesis: { motion: 'founder_led_sales', target: 'Founder', buyingTrigger: 'Stalled validation', competitiveAlternative: 'Spreadsheets', value: 'Evidence', rationale: 'Research', risks: [] },
  positioning: { competitiveAlternatives: ['Spreadsheets'], differentiatedCapabilities: ['Connected evidence'], customerValue: ['Clarity'], bestFitSegment: 'Founder', marketCategory: 'Startup system', positioningStatement: 'Evidence first', uniqueValueProposition: 'One path', keyDifferentiators: [] },
  messaging: { headline: 'Validate first', hookLine: 'Know what to do next', proofPoint: 'Measured outcome', ctaCopy: 'Start', toneOfVoice: ['Clear'] },
  channels: [
    { id: 'outreach', name: 'Founder outreach', role: 'primary', score: 90, scoreBreakdown: { audienceEvidence: 90, motionEconomicsFit: 90, tractionEvidence: 80, founderConstraints: 90, founderStrengths: 90 }, confidence: 'high', rationale: 'Fit', evidence: ['research-1'], prerequisites: [] },
    { id: 'community', name: 'Founder communities', role: 'secondary', score: 80, scoreBreakdown: { audienceEvidence: 80, motionEconomicsFit: 80, tractionEvidence: 70, founderConstraints: 80, founderStrengths: 80 }, confidence: 'medium', rationale: 'Fallback', evidence: ['research-1'], prerequisites: [] },
  ],
  excludedChannels: [],
  plays: [{ id: 'play-1', channelId: 'outreach', channelName: 'Founder outreach', status: 'active', audience: 'Founder', buyingTrigger: 'Stalled validation', offer: 'Evidence path', message: 'Validate first', hypothesis: 'Five replies', actions: ['Send ten messages'], metric: 'Replies', target: 5, killRule: 'Kill after three weeks below two replies.', structuredKillRule: { metric: 'Replies', operator: 'lt', threshold: 2, observationWindowWeeks: 3, minSampleSize: 10 }, weeklyTimeHours: 4, weeklyBudget: 0, requiredAssets: ['Sequence'], recommendedDirectoryIds: [], tractionSprintId: withSprint ? 'sprint-1' : undefined }],
  funnel: [],
  growthLoop: { name: 'Evidence loop', input: 'Message', action: 'Outreach', output: 'Reply', reinvestment: 'Improve copy' },
  sixWeekPlan: Array.from({ length: 6 }, (_, index) => ({ week: index + 1, objective: `Week ${index + 1} target`, actions: ['Run the play'] })),
  metrics: { primaryOutcome: 'Ten conversations', leading: [{ name: 'Replies', target: '5', howToMeasure: 'Traction Engine' }], lagging: ['Customers'] },
  claimAttributions: [{ id: 'claim-1', claim: 'Founders respond to evidence', area: 'channel', sourceIds: ['research-1'], confidence: 'high', assumption: false }],
  assets: [{ id: 'asset-1', playId: 'play-1', type: 'outreach_sequence', title: 'Sequence', content: 'Message one', status: 'draft' }],
  generatedAt: '2026-07-19T00:00:00.000Z',
});

test('GTM is ready as a plan and verified only after its attributed Traction sprint exists', () => {
  const ready = evaluateGTMOutcome(gtmPlan(false));
  assert.equal(ready.status, 'ready');
  assert.equal(ready.checks.tractionSprintCreated, false);

  const verified = evaluateGTMOutcome(gtmPlan(true));
  assert.equal(verified.status, 'verified');
  assert.equal(verified.completionScore, 100);
});

test('fixed hero copy and server rendered pricing remain available without JavaScript', () => {
  const hero = readFileSync(new URL('../src/components/Hero.tsx', import.meta.url), 'utf8');
  const fallback = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const prerender = readFileSync(new URL('../scripts/generate-prerendered-pages.mjs', import.meta.url), 'utf8');
  const paragraphs = [
    'Business Development platform for startup founders & first-time business owners.',
    'Define your ideal customer, prove demand, build your MVP, launch it, and find investment.',
    'No application. No cohort. No equity.',
  ];
  const renderedSources = [hero, fallback, prerender].map((source) =>
    source.replaceAll('&apos;', "'").replaceAll('&amp;', '&'),
  );
  paragraphs.forEach((copy) => {
    const copyPattern = new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    renderedSources.forEach((source) => assert.match(source, copyPattern));
  });
  assert.match(hero, /Launch a live demo/);
  assert.match(hero, /Draft your ICP/);
  assert.match(prerender, /Rookie[\s\S]*\$0[\s\S]*Clarify/);
  assert.match(prerender, /Starter[\s\S]*\$9[\s\S]*Validate/);
  assert.match(prerender, /Rising[\s\S]*\$29[\s\S]*Build and Launch/);
  assert.match(prerender, /Pro[\s\S]*\$65[\s\S]*Accelerate and Fundraise/);
});

test('hero scrolling cards retain the restored market data', () => {
  const hero = readFileSync(new URL('../src/components/Hero.tsx', import.meta.url), 'utf8');
  assert.match(hero, /value: "5", unit: "×", label: "Faster idea → MVP than pre-AI builders"/);
  assert.match(hero, /value: "\$680B", unit: "\+", label: "Into AI-native startups since 2024"/);
  assert.match(hero, /value: "1 in 4", label: "New 2026 launches are solo founders"/);
  assert.match(hero, /value: "~18", unit: "mo", label: "Before incumbents close the AI-native gap"/);
});

test('Pro expert support has a protected queue while the restored mentorship hero remains intact', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260719090000_journey_outcomes.sql', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/components/expert-support/ExpertReviewPanel.tsx', import.meta.url), 'utf8');
  const marketplace = readFileSync(new URL('../src/pages/community/MentorMarketplaceHub.tsx', import.meta.url), 'utf8');
  assert.match(migration, /normalize_subscription_tier\(profiles\.subscription_tier\) = 'pro'/);
  assert.match(migration, /response_due_at[\s\S]*interval '48 hours'/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.journey_expert_review_sla/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /Admins manage expert reviews/);
  assert.match(migration, /length\(trim\(substantive_response\)\) >= 50/);
  assert.match(panel, /journey_expert_review_requested/);
  assert.match(panel, /journey_expert_review_responded/);
  assert.match(panel, /status: 'reviewed'/);
  assert.match(marketplace, /Connect\. Learn\. Grow\./);
});
