import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface GTMAnalysisRequest {
  schemaVersion?: 1 | 2;
  planId?: string;
  intake?: GTMIntakeV2;
  businessType: string;
  targetAudience: string;
  audienceOnlineHabits: string[];
  problemAndSolution: string;
  currentTraction: string;
  weeklyTimeForMarketing: string;
  budget?: string;
  founderStrengths?: string[];
  icpPositioningStatement?: string;
  icpNicheProfile?: string;
}

interface GTMIntakeV2 {
  productName: string;
  productUrl?: string;
  lifecycle: 'launch_ready' | 'live';
  businessModel: 'b2b_saas' | 'b2c_product' | 'marketplace' | 'ecommerce' | 'service' | 'media';
  targetSegment: string;
  geography: string;
  problem: string;
  solution: string;
  buyerRole?: string;
  userRole?: string;
  buyingTrigger?: string;
  pricing?: string;
  averageCustomerValue?: number;
  currentTraction: string;
  weeklyTimeHours: number;
  monthlyBudget: number;
  founderStrengths: string[];
  knownCompetitors: string[];
  sixWeekOutcome: string;
  salesCycle?: string;
  averageOrderValue?: number;
  repeatPurchaseModel?: string;
  marketplaceSide?: 'supply' | 'demand' | 'both';
  serviceCapacity?: string;
  subscriberGoal?: number;
}

type GTMMotion = 'founder_led_sales' | 'sales_assisted' | 'product_led' | 'transactional' | 'marketplace_liquidity' | 'audience_led';

interface ChannelRule {
  id: string;
  name: string;
  models: GTMIntakeV2['businessModel'][];
  motions: GTMMotion[];
  minHours: number;
  minBudget: number;
  strengths: string[];
  metric: string;
  target: number;
  prerequisites: string[];
  directories: string[];
}

const ALL_MODELS: GTMIntakeV2['businessModel'][] = ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce', 'service', 'media'];
const CHANNEL_RULES: ChannelRule[] = [
  { id: 'founder-outreach', name: 'Founder-led outreach', models: ['b2b_saas', 'service', 'marketplace'], motions: ['founder_led_sales', 'sales_assisted'], minHours: 3, minBudget: 0, strengths: ['Networking', 'Cold outreach'], metric: 'Qualified conversations', target: 5, prerequisites: ['A defined buyer role', 'A clear problem-led message'], directories: ['linkedin', 'wellfound-angellist', 'crunchbase'] },
  { id: 'cold-email', name: 'Targeted cold email', models: ['b2b_saas', 'service'], motions: ['founder_led_sales', 'sales_assisted'], minHours: 4, minBudget: 50, strengths: ['Writing', 'Cold outreach'], metric: 'Positive replies', target: 5, prerequisites: ['A qualified prospect list', 'A verified sending domain'], directories: ['g2', 'capterra', 'alternativeto'] },
  { id: 'linkedin', name: 'LinkedIn authority + conversations', models: ['b2b_saas', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'audience_led'], minHours: 3, minBudget: 0, strengths: ['Writing', 'Networking'], metric: 'Qualified conversations', target: 5, prerequisites: ['A founder profile aligned to the offer'], directories: ['linkedin', 'indie-hackers', 'twitter-x'] },
  { id: 'communities', name: 'Niche communities', models: ALL_MODELS, motions: ['founder_led_sales', 'product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minHours: 3, minBudget: 0, strengths: ['Writing', 'Networking'], metric: 'Activated users', target: 10, prerequisites: ['A named community where the ICP is active'], directories: ['indie-hackers', 'hacker-news-show-hn', 'dev-to', 'reddit-r-startups-r-saas-r-entrepreneur'] },
  { id: 'launch-platforms', name: 'Launch platforms', models: ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce'], motions: ['product_led', 'transactional', 'marketplace_liquidity'], minHours: 5, minBudget: 0, strengths: ['Writing', 'Design', 'Networking'], metric: 'Activated signups', target: 25, prerequisites: ['A live product', 'A working onboarding path'], directories: ['product-hunt', 'betalist', 'peerlist', 'microlaunch', 'uneed'] },
  { id: 'content-seo', name: 'Problem-led content + SEO', models: ['b2b_saas', 'b2c_product', 'ecommerce', 'service', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minHours: 5, minBudget: 0, strengths: ['Writing', 'Coding / Technical'], metric: 'Qualified organic visits', target: 100, prerequisites: ['Searchable customer problems', 'A repeatable publishing cadence'], directories: ['dev-to', 'hackernoon', 'saashub', 'alternativeto'] },
  { id: 'short-form-video', name: 'Short-form video', models: ['b2c_product', 'ecommerce', 'marketplace', 'media'], motions: ['transactional', 'product_led', 'audience_led', 'marketplace_liquidity'], minHours: 5, minBudget: 0, strengths: ['Speaking / Video', 'Design'], metric: 'Activated profile visits', target: 50, prerequisites: ['A visually demonstrable outcome'], directories: ['product-hunt', 'reddit-r-startups-r-saas-r-entrepreneur', 'twitter-x'] },
  { id: 'partnerships', name: 'Distribution partnerships', models: ['b2b_saas', 'marketplace', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'marketplace_liquidity', 'audience_led'], minHours: 3, minBudget: 0, strengths: ['Networking'], metric: 'Qualified partner conversations', target: 3, prerequisites: ['A clear partner benefit'], directories: ['wellfound-angellist', 'f6s', 'crunchbase'] },
  { id: 'paid-acquisition', name: 'Paid acquisition', models: ['b2c_product', 'ecommerce', 'b2b_saas'], motions: ['transactional', 'product_led'], minHours: 3, minBudget: 500, strengths: ['Design'], metric: 'Qualified conversions', target: 20, prerequisites: ['A proven conversion event', 'Known customer value'], directories: [] },
  { id: 'referrals', name: 'Customer referral loop', models: ALL_MODELS, motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minHours: 2, minBudget: 0, strengths: ['Networking', 'Design'], metric: 'Referred activated users', target: 10, prerequisites: ['Existing satisfied users'], directories: [] },
];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const inferMotion = (intake: GTMIntakeV2): GTMMotion => {
  if (intake.businessModel === 'marketplace') return 'marketplace_liquidity';
  if (intake.businessModel === 'ecommerce') return 'transactional';
  if (intake.businessModel === 'media') return 'audience_led';
  if (intake.businessModel === 'service') return 'founder_led_sales';
  if (intake.businessModel === 'b2b_saas') return (intake.averageCustomerValue ?? 0) >= 5000 ? 'sales_assisted' : 'founder_led_sales';
  return 'product_led';
};

function rankChannels(intake: GTMIntakeV2) {
  const motion = inferMotion(intake);
  return CHANNEL_RULES.map((rule) => {
    let rejectionReason: string | undefined;
    if (!rule.models.includes(intake.businessModel)) rejectionReason = 'Does not fit this business model.';
    else if (!rule.motions.includes(motion)) rejectionReason = 'Does not fit the selected GTM motion.';
    else if (intake.weeklyTimeHours < rule.minHours) rejectionReason = `Requires at least ${rule.minHours} hours per week.`;
    else if (intake.monthlyBudget < rule.minBudget) rejectionReason = `Requires at least $${rule.minBudget} per month.`;
    else if (rule.id === 'launch-platforms' && intake.lifecycle !== 'live') rejectionReason = 'Requires a live product.';
    else if (rule.id === 'referrals' && /none|no users|pre-launch/i.test(intake.currentTraction)) rejectionReason = 'Requires existing satisfied users.';
    const breakdown = {
      audienceEvidence: intake.buyingTrigger?.trim() ? 75 : 55,
      motionEconomicsFit: rule.motions.includes(motion) ? 90 : 35,
      tractionEvidence: /none|no users|pre-launch/i.test(intake.currentTraction) ? 35 : 70,
      founderConstraints: clamp(50 + Math.min(30, (intake.weeklyTimeHours - rule.minHours) * 6) + (intake.monthlyBudget >= rule.minBudget ? 20 : 0)),
      founderStrengths: rule.strengths.some((strength) => intake.founderStrengths.includes(strength)) ? 85 : 50,
    };
    const raw = breakdown.audienceEvidence * .25 + breakdown.motionEconomicsFit * .25 + breakdown.tractionEvidence * .2 + breakdown.founderConstraints * .15 + breakdown.founderStrengths * .15;
    return { rule, eligible: !rejectionReason, rejectionReason, score: rejectionReason ? Math.min(clamp(raw), 49) : clamp(raw), breakdown };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

const safeStringArray = (value: unknown, fallback: string[] = []) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 12)
  : fallback;

const safeText = (value: unknown, fallback = '', maxLength = 1200) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : fallback;

function isValidV2Intake(value: GTMIntakeV2 | undefined): value is GTMIntakeV2 {
  if (!value) return false;
  const models = ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce', 'service', 'media'];
  return safeText(value.productName).length > 0 &&
    safeText(value.targetSegment).length > 0 &&
    safeText(value.problem).length > 0 &&
    safeText(value.solution).length > 0 &&
    safeText(value.sixWeekOutcome).length > 0 &&
    (value.lifecycle === 'launch_ready' || value.lifecycle === 'live') &&
    models.includes(value.businessModel) &&
    Array.isArray(value.founderStrengths) &&
    Array.isArray(value.knownCompetitors) &&
    Number.isFinite(value.weeklyTimeHours) && value.weeklyTimeHours > 0 && value.weeklyTimeHours <= 80 &&
    Number.isFinite(value.monthlyBudget) && value.monthlyBudget >= 0 && value.monthlyBudget <= 10000000;
}

function validatedFunnel(value: unknown, model: GTMIntakeV2['businessModel']) {
  if (!Array.isArray(value) || value.length < 3) return fallbackFunnel(model);
  return value.slice(0, 6).map((item) => ({
    stage: safeText(item?.stage, 'Stage', 100),
    exitCriteria: safeText(item?.exitCriteria, 'A measurable stage outcome is reached.', 300),
    metric: safeText(item?.metric, 'Completed outcomes', 100),
  }));
}

function validatedSixWeekPlan(value: unknown, plays: Array<{ actions: string[] }>) {
  if (Array.isArray(value) && value.length === 6) {
    return value.map((item, index) => ({
      week: index + 1,
      objective: safeText(item?.objective, 'Run, measure, and improve the active plays.', 240),
      actions: safeStringArray(item?.actions, ['Log one measurable channel action.']).slice(0, 6),
    }));
  }
  return Array.from({ length: 6 }, (_, index) => ({
    week: index + 1,
    objective: index === 0 ? 'Activate the first channel bet' : index === 5 ? 'Decide what to scale, iterate, or kill' : 'Run, measure, and improve the active plays',
    actions: plays.slice(0, 2).map((play) => play.actions[Math.min(index, play.actions.length - 1)]).filter(Boolean),
  }));
}

async function researchGTM(intake: GTMIntakeV2) {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!apiKey) return { status: 'unavailable' as const, answer: '', sources: [] as Array<Record<string, unknown>> };
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'Research current go-to-market evidence for a launch-ready founder. Prefer primary and reputable sources. Separate evidence from inference.' },
          { role: 'user', content: `Product: ${intake.productName}\nURL: ${intake.productUrl || 'not supplied'}\nMarket: ${intake.targetSegment}\nGeography: ${intake.geography}\nProblem: ${intake.problem}\nKnown alternatives: ${intake.knownCompetitors.join(', ') || 'unknown'}\nFind current competitors and alternatives, where buyers discover solutions, buying triggers, and channel conditions. Return concise evidence with citations.` },
        ],
        temperature: 0.2,
        max_tokens: 1400,
        return_citations: true,
        search_recency_filter: 'year',
      }),
    });
    if (!response.ok) throw new Error(`Research failed: ${response.status}`);
    const data = await response.json();
    const citations = Array.isArray(data.citations) ? data.citations.slice(0, 6) : [];
    const sources = citations.map((citation: any, index: number) => typeof citation === 'string'
      ? { title: `Source ${index + 1}`, url: citation }
      : { title: citation.title || citation.name || `Source ${index + 1}`, url: citation.url || citation.source || '', snippet: citation.snippet || citation.summary, publishedDate: citation.published_date || citation.date })
      .filter((source: any) => /^https?:\/\//.test(source.url));
    return { status: sources.length >= 3 ? 'complete' as const : sources.length > 0 ? 'limited' as const : 'unavailable' as const, answer: data.choices?.[0]?.message?.content || '', sources };
  } catch (error) {
    console.warn('GTM live research unavailable:', error);
    return { status: 'unavailable' as const, answer: '', sources: [] as Array<Record<string, unknown>> };
  }
}

function fallbackFunnel(model: GTMIntakeV2['businessModel']) {
  if (model === 'b2b_saas' || model === 'service') return [
    { stage: 'Qualified conversation', exitCriteria: 'Buyer confirms the problem and business impact', metric: 'Conversations held' },
    { stage: 'Qualified opportunity', exitCriteria: 'Buyer, need, timing, and next step are confirmed', metric: 'Qualified opportunities' },
    { stage: 'Pilot or proposal', exitCriteria: 'A scoped commercial evaluation begins', metric: 'Pilots or proposals' },
    { stage: 'Customer', exitCriteria: 'Payment or signed agreement received', metric: 'Closed customers' },
  ];
  if (model === 'marketplace') return [
    { stage: 'Qualified side acquired', exitCriteria: 'Supply or demand profile is complete', metric: 'Qualified profiles' },
    { stage: 'First match', exitCriteria: 'A relevant match is presented', metric: 'Matches' },
    { stage: 'Transaction', exitCriteria: 'Both sides complete the core exchange', metric: 'Transactions' },
    { stage: 'Repeat', exitCriteria: 'A participant returns for another exchange', metric: 'Repeat participants' },
  ];
  return [
    { stage: 'Qualified visit', exitCriteria: 'Visitor matches the target segment', metric: 'Qualified visits' },
    { stage: 'Activation', exitCriteria: 'User reaches the first-value event', metric: 'Activated users' },
    { stage: 'Conversion', exitCriteria: 'User purchases or subscribes', metric: 'Conversions' },
    { stage: 'Retention', exitCriteria: 'User returns in the expected cycle', metric: 'Retained users' },
  ];
}

async function generateV2Plan(args: { intake: GTMIntakeV2; userId: string; existingPlanId?: string; openaiApiKey: string }) {
  const { intake, userId, existingPlanId, openaiApiKey } = args;
  const ranked = rankChannels(intake);
  const selected = ranked.filter((item) => item.eligible).slice(0, 3);
  if (selected.length < 2) throw new Error('The current time and budget constraints leave fewer than two viable channels. Increase one constraint and try again.');
  const research = await researchGTM(intake);
  const motion = inferMotion(intake);
  const prompt = `You are a rigorous early-stage GTM strategist. Build strategic content for the fixed, server-selected channels below. Do not add or replace channels. Separate sourced facts from assumptions. Make every play executable by a founder in the next six weeks.

FOUNDER INTAKE:
${JSON.stringify(intake, null, 2)}

DETERMINISTIC CHANNEL SELECTION:
${selected.map((item, index) => `${index + 1}. ${item.rule.id} — ${item.rule.name} (${item.score}/100)`).join('\n')}

LIVE RESEARCH STATUS: ${research.status}
LIVE RESEARCH:
${research.answer || 'No live sources were available. Treat market claims as assumptions.'}

Return only JSON with this shape:
{
  "summaryInsight":"2-3 sentence thesis",
  "thesis":{"target":"","buyingTrigger":"","competitiveAlternative":"","value":"","rationale":"","risks":[""]},
  "positioning":{"competitiveAlternatives":[""],"differentiatedCapabilities":[""],"customerValue":[""],"bestFitSegment":"","marketCategory":"","positioningStatement":"","uniqueValueProposition":"","keyDifferentiators":[""]},
  "messaging":{"headline":"","hookLine":"","proofPoint":"","ctaCopy":"","toneOfVoice":[""]},
  "channelNarratives":{"channel-id":{"rationale":"","evidence":[""],"audience":"","buyingTrigger":"","offer":"","message":"","hypothesis":"","actions":[""],"requiredAssets":[""]}},
  "funnel":[{"stage":"","exitCriteria":"","metric":""}],
  "growthLoop":{"name":"","input":"","action":"","output":"","reinvestment":""},
  "sixWeekPlan":[{"week":1,"objective":"","actions":[""]}],
  "metrics":{"primaryOutcome":"","leading":[{"name":"","target":"","howToMeasure":""}],"lagging":[""]},
  "assumptions":[""]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Return valid JSON only. Never invent citations or modify the provided channel selection.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 6000,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('GTM strategy response was empty');
  const strategic = JSON.parse(content) as Record<string, any>;
  const narratives = strategic.channelNarratives && typeof strategic.channelNarratives === 'object' ? strategic.channelNarratives : {};
  const confidence = research.status === 'complete' && intake.buyingTrigger?.trim() ? 'high' : research.status === 'unavailable' ? 'low' : 'medium';
  const channels = selected.map((item, index) => ({
    id: item.rule.id,
    name: item.rule.name,
    role: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'deferred',
    score: item.score,
    scoreBreakdown: item.breakdown,
    confidence,
    rationale: safeText(narratives[item.rule.id]?.rationale, `Fits the ${motion.replaceAll('_', ' ')} motion and current founder constraints.`),
    evidence: safeStringArray(narratives[item.rule.id]?.evidence),
    prerequisites: item.rule.prerequisites,
  }));
  const excludedChannels = ranked.filter((item) => !item.eligible).slice(0, 6).map((item) => ({
    id: item.rule.id,
    name: item.rule.name,
    role: 'deferred',
    score: item.score,
    scoreBreakdown: item.breakdown,
    confidence: 'high',
    rationale: 'Excluded by deterministic eligibility rules before AI strategy generation.',
    evidence: [] as string[],
    prerequisites: item.rule.prerequisites,
    rejectionReason: item.rejectionReason || 'Does not meet the current play constraints.',
  }));
  const playIds = selected.map(() => crypto.randomUUID());
  const plays = selected.map((item, index) => {
    const narrative = narratives[item.rule.id] ?? {};
    return {
      id: playIds[index],
      channelId: item.rule.id,
      channelName: item.rule.name,
      status: index < 2 ? 'active' : 'backlog',
      audience: safeText(narrative.audience, intake.targetSegment),
      buyingTrigger: safeText(narrative.buyingTrigger, intake.buyingTrigger || 'The problem becomes urgent enough to seek an alternative.'),
      offer: safeText(narrative.offer, intake.solution),
      message: safeText(narrative.message, safeText(strategic.messaging?.hookLine, intake.problem)),
      hypothesis: safeText(narrative.hypothesis, `If we reach ${intake.targetSegment} through ${item.rule.name}, we will generate ${item.rule.target} ${item.rule.metric.toLowerCase()} per week.`),
      actions: safeStringArray(narrative.actions, [`Launch the first ${item.rule.name} experiment.`, `Log ${item.rule.metric.toLowerCase()} in Traction Engine.`]).slice(0, 6),
      metric: item.rule.metric,
      target: item.rule.target,
      weeklyTimeHours: Math.max(item.rule.minHours, Math.floor(intake.weeklyTimeHours / Math.min(2, selected.length))),
      weeklyBudget: Math.max(item.rule.minBudget / 4, Math.floor(intake.monthlyBudget / Math.min(2, selected.length) / 4)),
      requiredAssets: safeStringArray(narrative.requiredAssets),
      recommendedDirectoryIds: item.rule.directories.slice(0, 5),
    };
  });
  const positioning = strategic.positioning ?? {};
  const messaging = strategic.messaging ?? {};
  const plan: Record<string, any> = {
    schemaVersion: 2,
    planTitle: `${intake.productName} — Six-week GTM system`,
    summaryInsight: safeText(strategic.summaryInsight, `Focus on ${channels[0].name} first, use ${channels[1].name} as the controlled secondary bet, and let weekly evidence decide what scales.`),
    intake,
    researchStatus: research.status,
    researchSources: research.sources,
    assumptions: safeStringArray(strategic.assumptions, research.status === 'unavailable' ? ['Live market research was unavailable; validate channel assumptions through Traction Engine.'] : []),
    thesis: {
      motion,
      target: safeText(strategic.thesis?.target, intake.targetSegment),
      buyingTrigger: safeText(strategic.thesis?.buyingTrigger, intake.buyingTrigger || ''),
      competitiveAlternative: safeText(strategic.thesis?.competitiveAlternative, intake.knownCompetitors[0] || 'The status quo'),
      value: safeText(strategic.thesis?.value, intake.solution),
      rationale: safeText(strategic.thesis?.rationale, safeText(strategic.summaryInsight)),
      risks: safeStringArray(strategic.thesis?.risks),
    },
    positioning: {
      competitiveAlternatives: safeStringArray(positioning.competitiveAlternatives, intake.knownCompetitors.length ? intake.knownCompetitors : ['The status quo']),
      differentiatedCapabilities: safeStringArray(positioning.differentiatedCapabilities),
      customerValue: safeStringArray(positioning.customerValue),
      bestFitSegment: safeText(positioning.bestFitSegment, intake.targetSegment),
      marketCategory: safeText(positioning.marketCategory, 'A focused solution'),
      positioningStatement: safeText(positioning.positioningStatement, `${intake.productName} helps ${intake.targetSegment} ${intake.solution}`),
      uniqueValueProposition: safeText(positioning.uniqueValueProposition, intake.solution),
      keyDifferentiators: safeStringArray(positioning.keyDifferentiators),
    },
    messaging: {
      headline: safeText(messaging.headline, intake.productName, 120),
      hookLine: safeText(messaging.hookLine, intake.problem, 240),
      proofPoint: safeText(messaging.proofPoint, 'Validate this claim with the first six-week cohort.', 300),
      ctaCopy: safeText(messaging.ctaCopy, 'Try it now', 120),
      toneOfVoice: safeStringArray(messaging.toneOfVoice, ['Clear', 'Specific', 'Credible']),
    },
    channels,
    excludedChannels,
    plays,
    funnel: validatedFunnel(strategic.funnel, intake.businessModel),
    growthLoop: {
      name: safeText(strategic.growthLoop?.name, 'Customer evidence loop', 120),
      input: safeText(strategic.growthLoop?.input, 'A focused customer segment', 240),
      action: safeText(strategic.growthLoop?.action, 'Run one measurable play', 240),
      output: safeText(strategic.growthLoop?.output, 'Activated users and customer language', 240),
      reinvestment: safeText(strategic.growthLoop?.reinvestment, 'Use the learning to improve the next play', 240),
    },
    sixWeekPlan: validatedSixWeekPlan(strategic.sixWeekPlan, plays),
    metrics: {
      primaryOutcome: safeText(strategic.metrics?.primaryOutcome, intake.sixWeekOutcome),
      leading: Array.isArray(strategic.metrics?.leading) ? strategic.metrics.leading.slice(0, 5).map((metric: any) => ({ name: safeText(metric?.name, 'Leading outcome', 100), target: safeText(metric?.target, 'Track weekly', 100), howToMeasure: safeText(metric?.howToMeasure, 'Log the weekly result in Traction Engine.', 300) })) : plays.slice(0, 2).map((play) => ({ name: play.metric, target: String(play.target), howToMeasure: 'Log the weekly result in Traction Engine.' })),
      lagging: safeStringArray(strategic.metrics?.lagging),
    },
    generatedAt: new Date().toISOString(),
  };

  const weeklyMinutes = Math.max(60, Number(intake.weeklyTimeHours || 1) * 60);
  plan.tasks = plan.sixWeekPlan.flatMap((week: any) => week.actions.slice(0, 3).map((action: string, index: number) => {
    const play = plays[index % Math.max(1, plays.length)] ?? plays[0];
    return {
      id: `${play?.id ?? 'plan'}-week-${week.week}-task-${index + 1}`,
      playId: play?.id ?? '', week: week.week, title: action,
      detail: `Complete this action to advance: ${week.objective}`,
      owner: 'Founder', timeEstimateMinutes: Math.max(30, Math.round(weeklyMinutes / Math.max(1, week.actions.length))),
      output: index === 0 ? week.objective : `Evidence logged for ${play?.channelName ?? 'the GTM motion'}`,
      metric: play?.metric ?? plan.metrics.leading[0]?.name ?? 'Validated signal', status: 'todo',
    };
  }));
  plan.assets = plays.filter((play) => play.status !== 'paused').flatMap((play) => [
    { id: `${play.id}-outreach`, playId: play.id, type: 'outreach_message', title: `${play.channelName} conversation starter`, content: `${play.message}\n\nOffer: ${play.offer}\n\nNext step: ${plan.messaging.ctaCopy}`, status: 'draft' },
    { id: `${play.id}-listing`, playId: play.id, type: 'directory_listing', title: `${intake.productName} directory listing`, content: `${plan.messaging.headline}\n\n${plan.messaging.hookLine}\n\nBest for: ${play.audience}\n\n${plan.positioning.uniqueValueProposition}`, status: 'draft' },
    { id: `${play.id}-campaign`, playId: play.id, type: 'campaign_brief', title: `${play.channelName} experiment brief`, content: `Audience: ${play.audience}\nTrigger: ${play.buyingTrigger}\nHypothesis: ${play.hypothesis}\nMetric: ${play.metric}\nTarget: ${play.target}`, status: 'draft' },
  ]);
  const alternatives = Array.from(new Set([...(intake.knownCompetitors ?? []), ...plan.positioning.competitiveAlternatives])).filter(Boolean).slice(0, 5);
  plan.competitorBriefs = alternatives.map((name: string, index: number) => ({
    id: `competitor-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
    name, category: plan.positioning.marketCategory,
    positioning: `${name} is an alternative customers may choose instead of changing their current workflow.`,
    bestFitSegment: plan.positioning.bestFitSegment,
    strengths: ['Existing familiarity', 'Lower perceived switching risk'],
    gaps: plan.positioning.differentiatedCapabilities.slice(0, 2),
    sourceUrls: research.sources.slice(0, 2).map((source: any) => source.url),
  }));
  plan.health = {
    overall: research.status === 'complete' ? 48 : 40,
    positioningConfidence: research.status === 'complete' ? 85 : research.status === 'limited' ? 62 : 40,
    channelEvidence: 30, executionConsistency: 30, outcomeProgress: 25, label: 'forming',
    risks: ['No linked Traction result yet.', 'The execution cadence has not started.'],
    nextActions: [`Run and measure ${plays[0]?.channelName ?? 'the primary play'}.`, 'Complete the first founder-owned task.'],
  };

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, supabaseKey);
  const { data: persisted, error: persistError } = await admin.rpc('persist_gtm_plan_v2', {
    p_user_id: userId,
    p_plan_id: existingPlanId ?? null,
    p_plan_title: plan.planTitle,
    p_plan_content: plan,
    p_research_sources: research.sources,
    p_research_status: research.status,
    p_plays: plays,
  });
  if (persistError) throw persistError;
  const persistedRow = (Array.isArray(persisted) ? persisted[0] : persisted) as { plan_id?: string; version?: number } | null;
  const planId = persistedRow?.plan_id;
  if (!planId) throw new Error('Failed to persist GTM plan');
  plan.planId = planId;
  plan.version = Number(persistedRow?.version ?? 1);
  const [taskWrite, assetWrite, competitorWrite, snapshotWrite] = await Promise.all([
    admin.from('gtm_tasks').upsert(plan.tasks.map((task: any) => ({ id: task.id, user_id: userId, plan_id: planId, play_id: task.playId || null, week_number: task.week, title: task.title, detail: task.detail, owner_label: task.owner, time_estimate_minutes: task.timeEstimateMinutes, expected_output: task.output, metric: task.metric, status: task.status }))),
    admin.from('gtm_play_assets').upsert(plan.assets.map((asset: any) => ({ id: asset.id, user_id: userId, plan_id: planId, play_id: asset.playId, asset_type: asset.type, title: asset.title, content: asset.content, status: asset.status }))),
    admin.from('gtm_competitor_briefs').upsert(plan.competitorBriefs.map((competitor: any) => ({ id: competitor.id, user_id: userId, plan_id: planId, brief: competitor }))),
    admin.from('gtm_plans').update({ plan_content: plan }).eq('id', planId).eq('user_id', userId),
  ]);
  const executionError = taskWrite.error || assetWrite.error || competitorWrite.error || snapshotWrite.error;
  if (executionError) throw executionError;
  return { plan, planId };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GTMAnalysisRequest = await req.json();
    const isV2 = body.schemaVersion === 2 && Boolean(body.intake);
    const intakeV2 = body.intake;
    const { businessType, targetAudience, problemAndSolution, currentTraction, weeklyTimeForMarketing } = body;

    const v2Valid = isValidV2Intake(intakeV2);
    if ((isV2 && !v2Valid) || (!isV2 && (!businessType || !targetAudience || !problemAndSolution || !currentTraction || !weeklyTimeForMarketing))) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'GTM Analysis',
      requestFingerprint: isV2
        ? { schemaVersion: 2, planId: body.planId, intake: intakeV2 }
        : { businessType, targetAudience, problemAndSolution, currentTraction, weeklyTimeForMarketing },
    });

    const creditCost = CREDIT_COSTS.GTM_ANALYSIS;
    const creditResult = await checkAndDeductCredits(
      user.id,
      creditCost,
      'GTM Analysis',
      undefined,
      { businessType: isV2 ? intakeV2?.businessModel : businessType, schemaVersion: isV2 ? 2 : 1, idempotencyKey, entitlementFeature: 'GTM_ANALYSIS' }
    );
    const chargedCredits = (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

    if (!creditResult.success) {
      return new Response(JSON.stringify({
        error: creditResult.error || 'Credit deduction failed',
        creditError: true,
        errorCode: creditResult.errorCode,
        requiredTier: creditResult.requiredTier,
        requiredCredits: creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    if (isV2 && intakeV2) {
      try {
        const result = await generateV2Plan({ intake: intakeV2, userId: user.id, existingPlanId: body.planId, openaiApiKey });
        return new Response(JSON.stringify({
          success: true,
          analysis: result.plan,
          planId: result.planId,
          creditsUsed: chargedCredits,
          newBalance: creditResult.newBalance,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (v2Error) {
        const error = v2Error instanceof Error ? v2Error : new Error(String(v2Error));
        if (chargedCredits > 0) {
          await refundCredits(user.id, chargedCredits, 'GTM Analysis', 'Refund: GTM V2 generation failed', { error: error.message });
        }
        throw error;
      }
    }

    const audienceHabits = (body.audienceOnlineHabits || []).join(', ') || 'Not specified';
    const budget = body.budget || '$0 (time only)';
    const strengths = (body.founderStrengths || []).join(', ') || 'Not specified';
    const icpContext = body.icpPositioningStatement
      ? `\nICP POSITIONING (from ICP Builder): ${body.icpPositioningStatement}`
      : '';
    const icpNiche = body.icpNicheProfile
      ? `\nICP NICHE PROFILE: ${body.icpNicheProfile}`
      : '';

    const systemPrompt = `You are an opinionated GTM strategist for early-stage founders. Your job is to recommend the 2-3 BEST channels for first traction — not a comprehensive list. Be decisive. Eliminate bad fits ruthlessly. Every tactic must be specific enough to execute tomorrow.

CHANNEL SCORING MATRIX (apply to each candidate channel):
Score each channel 0-10 on five dimensions:
- businessTypeFit (weight 0.30): B2B SaaS → LinkedIn, cold email, Reddit r/entrepreneur; B2C → Instagram, TikTok, Reddit niche subs; Marketplace → communities, partnerships; Content → SEO, newsletters
- audiencePresence (weight 0.25): Does the customer actually use this channel? Only score high if the founder checked it in their online habits list
- timeConstraint (weight 0.20): LinkedIn/Reddit/Email = 3+ hrs/wk minimum; Twitter/X building = 5+ hrs/wk; Product Hunt = 10 hrs one-time; SEO = 5+ hrs/wk; Discord = 2+ hrs/wk
- founderStrengthFit (weight 0.15): Writing → content, Reddit, LinkedIn posts; Networking → LinkedIn DMs, communities, partnerships; Video → TikTok, YouTube; Cold outreach → email, LinkedIn DMs
- tractionLevel (weight 0.10): Product Hunt requires existing beta users; Partnerships require some credibility; all others work from zero

FINAL SCORE = (businessTypeFit×0.30 + audiencePresence×0.25 + timeConstraint×0.20 + founderStrengthFit×0.15 + tractionLevel×0.10) × 10

HARD CONSTRAINT RULES (apply before scoring):
- If weekly time ≤ 5 hours → recommend max 2 channels
- If budget = "$0 (time only)" or "< $100" → exclude all paid/ads channels
- If traction = "None yet" → exclude Product Hunt (requires existing users)
- Only recommend channels scoring above 6.5
- Top 2 or 3 channels returned; if 3rd scores 6.5-7.5, mark isStretch: true

POSITIONING: Use Geoffrey Moore's formula exactly: "For [target customer] who [has problem], [product name] is a [category] that [key benefit]. Unlike [alternative], we [differentiator]."

MESSAGING: Headline must be 5-8 words. Hook must be ≤20 words. Both must be outcome-focused, not feature-focused.

ACTION PLAN: Week 1 tasks must be executable with no dependencies. No "set up a strategy" — only "do X, send Y, post Z."

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema. No commentary before or after.

{
  "planTitle": "string — concise plan name based on business type and audience",
  "summaryInsight": "string — 2-3 sentences explaining the strategic rationale for the recommended channels",
  "channels": [
    {
      "channel": "string — channel name (e.g. LinkedIn Direct Outreach)",
      "fitScore": number,
      "fitReason": "string — 2-3 sentences explaining why this channel fits this specific founder",
      "isStretch": boolean,
      "tactics": [
        {
          "title": "string — specific tactic name",
          "description": "string — exactly what to do",
          "frequency": "string — e.g. Daily, 3x/week, Weekly",
          "timeEstimate": "string — e.g. 20 min/day"
        }
      ],
      "weekOneActions": ["string — 3 concrete things to do THIS WEEK"],
      "doNotDo": ["string — 2 anti-tactics that kill results on this channel"]
    }
  ],
  "positioning": {
    "positioningStatement": "string — Moore formula",
    "uniqueValueProposition": "string — 1 sentence",
    "keyDifferentiators": ["string", "string", "string"]
  },
  "messaging": {
    "headline": "string — 5-8 words, outcome-focused",
    "hookLine": "string — ≤20 words, problem-aware",
    "proofPoint": "string — number, social proof, or specific claim",
    "ctaCopy": "string — action word + outcome",
    "toneOfVoice": ["string", "string", "string"]
  },
  "actionPlan": {
    "week1": ["string — 5-7 specific executable tasks"],
    "week2": ["string — 5-7 specific tasks that build on week 1"],
    "weeks3to4": ["string — 5-7 tasks for consolidation and first results"]
  },
  "launchChecklist": {
    "prelaunch": [{ "item": "string", "priority": "must" | "should" | "nice" }],
    "launchDay": [{ "item": "string", "priority": "must" | "should" | "nice" }],
    "postlaunch": [{ "item": "string", "priority": "must" | "should" | "nice" }]
  },
  "metrics": {
    "primary": [
      {
        "name": "string",
        "target": "string — e.g. >30% acceptance rate",
        "why": "string — why this metric matters at this stage",
        "howToMeasure": "string — exactly how to track this"
      }
    ],
    "laggingIndicators": ["string — 2-3 longer-term metrics to watch"]
  },
  "generatedAt": "string — ISO timestamp"
}`;

    const userPrompt = `FOUNDER PROFILE:
Business Type: ${businessType}
Target Customer: ${targetAudience}
Problem & Solution: ${problemAndSolution}
Current Traction: ${currentTraction}
Weekly Time Available for Marketing: ${weeklyTimeForMarketing}
Monthly Marketing Budget: ${budget}
Channels Customer Uses Online: ${audienceHabits}
Founder Strengths: ${strengths}${icpContext}${icpNiche}

Apply the scoring matrix, enforce all constraint rules, then generate the GTM Brief JSON.`;

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
          max_tokens: 6000,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('OpenAI API Error:', errorText);
        throw new Error(`OpenAI API Error: ${openaiResponse.status}`);
      }

      const aiData = await openaiResponse.json();
      let analysis;

      try {
        const content = aiData.choices[0].message.content;
        analysis = JSON.parse(content);
      } catch {
        const content = aiData.choices[0].message.content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Add intake answers and timestamp for storage
      analysis.intakeAnswers = body;
      analysis.generatedAt = new Date().toISOString();

      let planId: string | null = null;
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: storedData, error: storeError } = await supabase
          .from('gtm_plans' as any)
          .insert({
            user_id: user.id,
            plan_title: analysis.planTitle,
            plan_content: analysis,
            status: 'draft',
          })
          .select('id')
          .single();

        if (!storeError && storedData) {
          planId = (storedData as any).id;
        } else {
          console.warn('Failed to store GTM plan:', storeError);
        }
      } catch (storeError) {
        console.warn('Error storing GTM plan:', storeError);
      }

      return new Response(JSON.stringify({
        success: true,
        analysis,
        planId,
        creditsUsed: chargedCredits,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      if (chargedCredits > 0) {
        await refundCredits(user.id, chargedCredits, 'GTM Analysis', 'Refund: AI processing failed', { error: err.message });
      }
      throw aiError;
    }

  } catch (error) {
    console.error('Error in GTM analyzer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
