import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  GTM_CHANNEL_REGISTRY,
  buildCompetitorBriefs,
  buildGTMAssets,
  buildGTMTasks,
  calculateGTMHealth,
  createLegacyUpgradeIntake,
  deriveWeeklyReview,
  inferMotion,
  rankChannelDefinitions,
  scoreChannelDefinition,
  type GTMIntakeV2,
  type GTMPlay,
  type GTMPlanV2,
} from '../src/lib/gtmV2.ts';
import { CHANNEL_RULES, rankChannels as rankServerChannels } from '../supabase/functions/_shared/gtm-channel-engine.ts';

const intake = (overrides: Partial<GTMIntakeV2> = {}): GTMIntakeV2 => ({
  productName: 'Signal Desk',
  productUrl: 'https://example.com',
  lifecycle: 'live',
  businessModel: 'b2b_saas',
  targetSegment: 'Revenue leaders at 20–100 person SaaS companies',
  geography: 'United States',
  problem: 'Teams cannot identify buying signals quickly.',
  solution: 'A signal workspace that prioritizes accounts.',
  buyerRole: 'VP Revenue',
  userRole: 'Growth operator',
  buyingTrigger: 'Pipeline coverage falls below target.',
  pricing: '$500/month',
  averageCustomerValue: 6000,
  currentTraction: '12 paying customers from founder outreach',
  weeklyTimeHours: 8,
  monthlyBudget: 800,
  founderStrengths: ['Writing', 'Networking', 'Cold outreach'],
  knownCompetitors: ['Legacy spreadsheets'],
  sixWeekOutcome: 'Book 20 qualified demos',
  salesCycle: '30 days',
  ...overrides,
});

test('branches to model-specific GTM motions', () => {
  assert.equal(inferMotion(intake()), 'sales_assisted');
  assert.equal(inferMotion(intake({ averageCustomerValue: 4999 })), 'founder_led_sales');
  assert.equal(inferMotion(intake({ businessModel: 'marketplace' })), 'marketplace_liquidity');
  assert.equal(inferMotion(intake({ businessModel: 'ecommerce' })), 'transactional');
  assert.equal(inferMotion(intake({ businessModel: 'media' })), 'audience_led');
});

test('applies hard eligibility before deterministic score ranking', () => {
  const paid = GTM_CHANNEL_REGISTRY.find((channel) => channel.id === 'paid-acquisition');
  assert.ok(paid);
  const result = scoreChannelDefinition(paid, intake({ businessModel: 'b2c_product', averageCustomerValue: 40, monthlyBudget: 100 }));
  assert.equal(result.eligible, false);
  assert.match(result.rejectionReason ?? '', /\$500/);
  assert.ok(result.score <= 49);

  const ranked = rankChannelDefinitions(intake());
  const firstRejected = ranked.findIndex((channel) => !channel.eligible);
  assert.ok(firstRejected > 0);
  assert.ok(ranked.slice(0, firstRejected).every((channel) => channel.eligible));
});

test('uses the documented 25/25/20/15/15 score arithmetic', () => {
  const outreach = GTM_CHANNEL_REGISTRY.find((channel) => channel.id === 'founder-outreach');
  assert.ok(outreach);
  const result = scoreChannelDefinition(outreach, intake(), { audienceEvidence: 80, tractionEvidence: 60 });
  const expected = Math.round(
    result.breakdown.audienceEvidence * 0.25 +
    result.breakdown.motionEconomicsFit * 0.25 +
    result.breakdown.tractionEvidence * 0.20 +
    result.breakdown.founderConstraints * 0.15 +
    result.breakdown.founderStrengths * 0.15,
  );
  assert.equal(result.score, expected);
  const serverResult = rankServerChannels(intake()).find((channel) => channel.rule.id === 'founder-outreach');
  assert.ok(serverResult);
  assert.equal(serverResult.score, Math.round(
    serverResult.breakdown.audienceEvidence * 0.25 +
    serverResult.breakdown.motionEconomicsFit * 0.25 +
    serverResult.breakdown.tractionEvidence * 0.20 +
    serverResult.breakdown.founderConstraints * 0.15 +
    serverResult.breakdown.founderStrengths * 0.15,
  ));
  assert.deepEqual(CHANNEL_RULES.map((channel) => channel.id), GTM_CHANNEL_REGISTRY.map((channel) => channel.id));
});

test('normalizes a V1 brief into an explicit upgrade intake', () => {
  const normalized = createLegacyUpgradeIntake({
    planTitle: 'Acme GTM Strategy Plan',
    intakeAnswers: {
      businessType: 'E-commerce',
      targetAudience: 'Independent runners',
      problemAndSolution: 'Better recovery equipment',
      currentTraction: '40 orders',
      weeklyTimeForMarketing: '8 hours',
      budget: '$1,200/month',
    },
  });
  assert.equal(normalized.businessModel, 'ecommerce');
  assert.equal(normalized.targetSegment, 'Independent runners');
  assert.equal(normalized.weeklyTimeHours, 8);
  assert.equal(normalized.monthlyBudget, 1200);
});

test('weekly reviews never invent a decision without Traction evidence', () => {
  const play: GTMPlay = {
    id: 'play-1', channelId: 'founder-outreach', channelName: 'Founder outreach', status: 'active',
    audience: 'VP Revenue', buyingTrigger: 'Pipeline gap', offer: 'Diagnostic', message: 'Message',
    hypothesis: 'Five conversations', actions: ['Build list'], metric: 'Qualified conversations', target: 5,
    weeklyTimeHours: 4, weeklyBudget: 0, requiredAssets: [], recommendedDirectoryIds: [],
  };
  const empty = deriveWeeklyReview({ planId: 'plan-1', weekStart: '2026-07-13', activePlay: play });
  assert.equal(empty.decision, 'collect_evidence');
  assert.match(empty.nextBestAction, /Run and log/);

  const measured = deriveWeeklyReview({
    planId: 'plan-1', weekStart: '2026-07-13', activePlay: play,
    latestExperiment: { id: 'experiment-1', decision: 'kill', pass: true, resultValue: 7, targetValue: 5 },
  });
  assert.equal(measured.decision, 'kill');
  assert.equal(measured.tractionExperimentId, 'experiment-1');
});

test('migration and handoffs preserve ownership, versions, and exact source IDs', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260714120000_gtm_strategist_v2.sql', import.meta.url), 'utf8');
  const traction = readFileSync(new URL('../src/pages/TractionEnginePage.tsx', import.meta.url), 'utf8');
  const directories = readFileSync(new URL('../src/components/launch/DirectoriesTab.tsx', import.meta.url), 'utf8');
  const analyzer = readFileSync(new URL('../supabase/functions/gtm-analyzer/index.ts', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gtm_plan_versions/);
  assert.match(migration, /source_gtm_plan_id/);
  assert.match(migration, /source_gtm_play_id/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(traction, /\.eq\('plan_id', gtmPlanId\)/);
  assert.match(traction, /source_gtm_play_id: gtmSource/);
  assert.match(directories, /\.eq\('user_id', user\.id\)/);
  assert.match(analyzer, /schemaVersion === 2/);
  assert.match(analyzer, /checkAndDeductCredits/);
  assert.match(analyzer, /resolveCreditIdempotencyKey/);
});

test('valid V2 workspaces resume directly while legacy plans still require an explicit upgrade', () => {
  const hook = readFileSync(new URL('../src/hooks/useGTMStrategist.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/GTMStrategistPage.tsx', import.meta.url), 'utf8');
  const intake = readFileSync(new URL('../src/components/gtm/GTMWorkspaceIntake.tsx', import.meta.url), 'utf8');
  const restoreStart = hook.indexOf('const loadExistingPlan');
  const restoreEnd = hook.indexOf('const loadMvpProjects');
  const restoreFlow = hook.slice(restoreStart, restoreEnd);
  assert.ok(restoreStart >= 0 && restoreEnd > restoreStart);
  assert.match(restoreFlow, /isGTMPlanV2\(content\)[\s\S]*setPhase\('results'\)/);
  assert.match(restoreFlow, /setPrefillV2/);
  assert.match(page, /isRestoringPlan/);
  assert.match(page, /onCancel=\{v2Analysis && planId \? resumeWorkspace/);
  assert.doesNotMatch(page, /RelatedToolsSection/);
  assert.doesNotMatch(page, /GTMIntakeForm|useFeatureFlagEnabled|isGTMStrategistV2Enabled/);
  assert.match(page, /GTMWorkspaceIntake/);
  assert.match(intake, /missingForModel/);
  assert.match(intake, /activeSteps/);
  assert.match(intake, /currentStep === 'confirm'/);
});

test('GTM intake starts blank and exposes MVP import from an in-form CTA', () => {
  const hook = readFileSync(new URL('../src/hooks/useGTMStrategist.ts', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/GTMStrategistPage.tsx', import.meta.url), 'utf8');
  const intake = readFileSync(new URL('../src/components/gtm/GTMWorkspaceIntake.tsx', import.meta.url), 'utf8');
  const picker = readFileSync(new URL('../src/components/gtm/GTMContextSourcePicker.tsx', import.meta.url), 'utf8');
  const projectLoadStart = hook.indexOf('const loadMvpProjects');
  const projectLoadEnd = hook.indexOf('const importMvpProject');
  const projectLoadFlow = hook.slice(projectLoadStart, projectLoadEnd);

  assert.ok(projectLoadStart >= 0 && projectLoadEnd > projectLoadStart);
  assert.match(projectLoadFlow, /mvp_projects/);
  assert.match(projectLoadFlow, /id,title,deployment_url,deployment_status,metadata,updated_at/);
  assert.doesNotMatch(projectLoadFlow, /\.limit\(1\)/);
  assert.match(hook, /setPrefillV2\(project\.prefill\)/);
  assert.match(hook, /productName: textValue\(row\.title\) \|\| textValue\(setupInput\.productName\)/);
  assert.match(hook.slice(hook.indexOf('const loadExistingPlan'), projectLoadStart), /\.in\('status', \['saved', 'exported'\]\)/);
  assert.doesNotMatch(hook.slice(hook.indexOf('const loadExistingPlan'), projectLoadStart), /'draft'/);
  assert.match(intake, /productName: ''/);
  assert.match(intake, /lifecycle: ''/);
  assert.match(intake, /businessModel: ''/);
  assert.match(intake, /geography: ''/);
  assert.match(intake, /currentTraction: ''/);
  assert.match(intake, /Import Context/);
  assert.doesNotMatch(intake, /context fields imported/);
  assert.match(picker, /SelectValue placeholder="Select an MVP Builder project"/);
  assert.match(page, /phase === 'intake'/);
  assert.match(page, /onImportProject=\{importMvpProject\}/);
});

test('builds a founder-controlled execution system with durable task and asset semantics', () => {
  const play: GTMPlay = {
    id: 'play-1', channelId: 'founder-outreach', channelName: 'Founder outreach', status: 'active',
    audience: 'VP Revenue', buyingTrigger: 'Pipeline gap', offer: 'Diagnostic', message: 'Message',
    hypothesis: 'Five conversations', actions: ['Build list'], metric: 'Qualified conversations', target: 5,
    weeklyTimeHours: 4, weeklyBudget: 0, requiredAssets: [], recommendedDirectoryIds: ['linkedin'],
  };
  const plan = {
    schemaVersion: 2, planTitle: 'Signal Desk GTM', summaryInsight: 'Focused motion', intake: intake(),
    researchStatus: 'complete', researchSources: [{ title: 'Source', url: 'https://example.com/source' }], assumptions: [],
    thesis: { motion: 'sales_assisted', target: 'VP Revenue', buyingTrigger: 'Pipeline gap', competitiveAlternative: 'Spreadsheets', value: 'Faster action', rationale: 'Evidence', risks: [] },
    positioning: { competitiveAlternatives: ['Spreadsheets'], differentiatedCapabilities: ['Signal ranking'], customerValue: ['Faster pipeline'], bestFitSegment: 'VP Revenue', marketCategory: 'Revenue signals', positioningStatement: 'Statement', uniqueValueProposition: 'Value', keyDifferentiators: [] },
    messaging: { headline: 'Headline', hookLine: 'Hook', proofPoint: 'Proof', ctaCopy: 'CTA', toneOfVoice: ['Clear'] },
    channels: [], excludedChannels: [], plays: [play], funnel: [],
    growthLoop: { name: 'Loop', input: 'Input', action: 'Action', output: 'Output', reinvestment: 'Reinvest' },
    sixWeekPlan: Array.from({ length: 6 }, (_, index) => ({ week: index + 1, objective: `Objective ${index + 1}`, actions: [`Action ${index + 1}`] })),
    metrics: { primaryOutcome: '20 demos', leading: [{ name: 'Conversations', target: '5', howToMeasure: 'Traction' }], lagging: [] },
    generatedAt: '2026-07-15T00:00:00.000Z',
  } satisfies GTMPlanV2;
  assert.equal(buildGTMTasks(plan).length, 6);
  assert.ok(buildGTMTasks(plan).every((task) => task.owner === 'Founder' && task.timeEstimateMinutes > 0 && task.output && task.metric));
  assert.equal(buildGTMAssets(plan).length, 4);
  assert.ok(buildGTMAssets(plan).every((asset) => asset.status === 'draft'));
  assert.ok(buildGTMAssets(plan).some((asset) => asset.type === 'outreach_sequence'));
  assert.equal(buildCompetitorBriefs(plan)[0].name, 'Legacy spreadsheets');
  assert.equal(calculateGTMHealth(plan).channelEvidence, 0);

  const migration = readFileSync(new URL('../supabase/migrations/20260715120000_gtm_execution_os.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gtm_tasks/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gtm_play_assets/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
});

test('uses first-party and current market evidence in channel scoring', () => {
  assert.ok(GTM_CHANNEL_REGISTRY.length >= 18);
  const communities = GTM_CHANNEL_REGISTRY.find((channel) => channel.id === 'communities');
  assert.ok(communities);
  const withoutEvidence = scoreChannelDefinition(communities, intake({ businessModel: 'b2c_product', averageCustomerValue: 40, currentTraction: 'No measured traction yet' }));
  const withEvidence = scoreChannelDefinition(communities, intake({
    businessModel: 'b2c_product', averageCustomerValue: 40,
    currentTraction: '12 activated users from a Reddit community test',
    firstPartyEvidence: [{ id: 'interview-1', kind: 'interview', title: 'Buyer interview', content: 'The buyer discovers tools in Reddit and private Slack communities.', verified: true, channelIds: ['communities'] }],
  }), { researchText: 'Buyers compare tools in niche communities and forums.', researchSourceIds: ['research-1'] });
  assert.ok(withEvidence.score > withoutEvidence.score);
  assert.ok(withEvidence.breakdown.audienceEvidence > withoutEvidence.breakdown.audienceEvidence);
  assert.deepEqual(withEvidence.scoreEvidence.audienceEvidence.sourceIds.includes('interview-1'), true);
});

test('health excludes future work and exposes its calculation inputs', () => {
  const generatedAt = new Date().toISOString();
  const plan = {
    schemaVersion: 2, planTitle: 'Health test', summaryInsight: 'Test', intake: intake(), researchStatus: 'complete',
    researchSources: [{ id: 'research-1', title: 'Source', url: 'https://example.com' }], assumptions: [],
    thesis: { motion: 'sales_assisted', target: 'VP Revenue', buyingTrigger: 'Gap', competitiveAlternative: 'Status quo', value: 'Value', rationale: 'Rationale', risks: [] },
    positioning: { competitiveAlternatives: [], differentiatedCapabilities: [], customerValue: [], bestFitSegment: 'VP Revenue', marketCategory: 'Signals', positioningStatement: 'Statement', uniqueValueProposition: 'Value', keyDifferentiators: [] },
    messaging: { headline: 'Headline', hookLine: 'Hook', proofPoint: 'Proof', ctaCopy: 'CTA', toneOfVoice: [] },
    channels: [], excludedChannels: [], plays: [{ id: 'play-1', channelId: 'founder-outreach', channelName: 'Founder outreach', status: 'active', audience: 'VP Revenue', buyingTrigger: 'Gap', offer: 'Offer', message: 'Message', hypothesis: 'Hypothesis', actions: [], metric: 'Demos', target: 5, weeklyTimeHours: 4, weeklyBudget: 0, requiredAssets: [], recommendedDirectoryIds: [] }],
    funnel: [], growthLoop: { name: 'Loop', input: 'Input', action: 'Action', output: 'Output', reinvestment: 'Reinvest' },
    sixWeekPlan: [], metrics: { primaryOutcome: 'Demos', leading: [], lagging: [] }, generatedAt,
    tasks: [
      { id: 'due', playId: 'play-1', week: 1, title: 'Due', detail: '', owner: 'Founder', timeEstimateMinutes: 30, output: 'Output', metric: 'Demos', status: 'done' },
      { id: 'future', playId: 'play-1', week: 6, title: 'Future', detail: '', owner: 'Founder', timeEstimateMinutes: 30, output: 'Output', metric: 'Demos', status: 'todo' },
    ],
  } satisfies GTMPlanV2;
  const health = calculateGTMHealth(plan, plan.tasks);
  assert.equal(health.executionConsistency, 100);
  assert.equal(health.dueTaskCount, 1);
  assert.match(health.calculation?.[2] ?? '', /future tasks are excluded/i);
});

test('competitive upgrade persists evidence, provenance, qualitative reviews, richer assets, and pipeline attribution', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20260715160000_gtm_competitive_upgrade.sql', import.meta.url), 'utf8');
  const analyzer = readFileSync(new URL('../supabase/functions/gtm-analyzer/index.ts', import.meta.url), 'utf8');
  const review = readFileSync(new URL('../supabase/functions/gtm-plan-review/index.ts', import.meta.url), 'utf8');
  const evidence = readFileSync(new URL('../src/components/gtm/GTMEvidenceManager.tsx', import.meta.url), 'utf8');
  const pipeline = readFileSync(new URL('../src/components/gtm/GTMPipelineBoard.tsx', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gtm_evidence_items/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gtm_claim_attributions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gtm_pipeline_entries/);
  assert.match(migration, /review_input jsonb/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.persist_gtm_competitive_plan/);
  assert.match(migration, /gtm_pipeline_entries\.play_id/);
  assert.match(migration, /EXISTS \(SELECT 1 FROM public\.gtm_plans/);
  assert.match(analyzer, /fetchProductWebsiteEvidence/);
  assert.match(analyzer, /redirect: 'manual'/);
  assert.match(analyzer, /persist_gtm_competitive_plan/);
  assert.match(analyzer, /claimAttributions/);
  assert.match(analyzer, /scoreEvidence/);
  assert.match(review, /FIXED DECISION/);
  assert.match(review, /experimentHistory/);
  assert.match(review, /review_input: reviewInput/);
  assert.match(evidence, /application\/pdf/);
  assert.match(pipeline, /Import CSV/);
});

test('weekly review rewrites the next week from exact Traction evidence without a credit charge', () => {
  const review = readFileSync(new URL('../supabase/functions/gtm-plan-review/index.ts', import.meta.url), 'utf8');
  const workspace = readFileSync(new URL('../src/components/gtm/GTMWorkspace.tsx', import.meta.url), 'utf8');
  const hook = readFileSync(new URL('../src/hooks/useGTMStrategist.ts', import.meta.url), 'utf8');
  assert.match(review, /source_gtm_play_id/);
  assert.match(review, /experiment\.decision/);
  assert.match(review, /analysis\.sixWeekPlan/);
  assert.match(review, /analysis\.tasks/);
  assert.match(review, /healthSnapshot/);
  assert.match(review, /decision === 'kill'/);
  assert.doesNotMatch(review, /deductCredits|checkAndDeductCredits/);
  assert.match(workspace, /Week \{weeklyReview\.adaptation\.week\} rewritten/);
  assert.match(workspace, /Start sprint here/);
  assert.match(hook, /source_gtm_plan_id: planId, source_gtm_play_id: play\.id/);
  assert.match(hook, /gtm_directory_actions/);
});
