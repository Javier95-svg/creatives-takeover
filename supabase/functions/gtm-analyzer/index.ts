import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';
import { inferMotion, rankChannels, type GTMIntakeV2 } from '../_shared/gtm-channel-engine.ts';

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
    (!value.firstPartyEvidence || (Array.isArray(value.firstPartyEvidence) && value.firstPartyEvidence.length <= 12)) &&
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
          { role: 'user', content: `Product: ${intake.productName}\nURL: ${intake.productUrl || 'not supplied'}\nMarket: ${intake.targetSegment}\nGeography: ${intake.geography}\nProblem: ${intake.problem}\nKnown alternatives: ${intake.knownCompetitors.join(', ') || 'unknown'}\nFounder evidence summary: ${(intake.firstPartyEvidence ?? []).map((item) => `${item.title}: ${item.content.slice(0, 800)}`).join('\n').slice(0, 5000) || 'none supplied'}\nFind current competitors and alternatives, pricing, positioning, where buyers discover solutions, buying triggers, and channel conditions. Return concise evidence with citations. Do not treat founder-provided claims as independently verified market facts.` },
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
      ? { id: `research-${index + 1}`, title: `Source ${index + 1}`, url: citation, kind: 'external', verifiedAt: new Date().toISOString() }
      : { id: `research-${index + 1}`, title: citation.title || citation.name || `Source ${index + 1}`, url: citation.url || citation.source || '', snippet: citation.snippet || citation.summary, publishedDate: citation.published_date || citation.date, kind: 'external', verifiedAt: new Date().toISOString() })
      .filter((source: any) => /^https?:\/\//.test(source.url));
    return { status: sources.length >= 3 ? 'complete' as const : sources.length > 0 ? 'limited' as const : 'unavailable' as const, answer: data.choices?.[0]?.message?.content || '', sources };
  } catch (error) {
    console.warn('GTM live research unavailable:', error);
    return { status: 'unavailable' as const, answer: '', sources: [] as Array<Record<string, unknown>> };
  }
}

const safePublicUrl = (value: string | undefined) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host === '[::1]' ||
      host.startsWith('[fc') ||
      host.startsWith('[fd') ||
      host.startsWith('[fe8') ||
      /^127\.|^10\.|^192\.168\.|^169\.254\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

const normalizeFirstPartyEvidence = (intake: GTMIntakeV2) => (intake.firstPartyEvidence ?? [])
  .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.content === 'string')
  .slice(0, 12)
  .map((item, index) => ({
    id: safeText(item.id, `evidence-${index + 1}`, 100).replace(/[^a-zA-Z0-9_-]/g, '-'),
    kind: ['website', 'interview', 'document', 'pricing', 'competitor', 'traction', 'founder_note'].includes(item.kind) ? item.kind : 'founder_note',
    title: safeText(item.title, `Founder evidence ${index + 1}`, 180),
    content: safeText(item.content, '', 12_000),
    url: safePublicUrl(item.url),
    sourceDate: /^\d{4}-\d{2}-\d{2}$/.test(item.sourceDate ?? '') ? item.sourceDate : undefined,
    verified: Boolean(item.verified),
    channelIds: safeStringArray(item.channelIds).slice(0, 8),
    createdAt: item.createdAt || new Date().toISOString(),
  }))
  .filter((item) => item.content.length > 0);

async function fetchProductWebsiteEvidence(intake: GTMIntakeV2) {
  const initialUrl = safePublicUrl(intake.productUrl);
  if (!initialUrl) return null;
  try {
    let url = initialUrl;
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      response = await fetch(url, {
        headers: { Accept: 'text/html,text/plain', 'User-Agent': 'CreativesTakeover-GTM-Research/2.0' },
        redirect: 'manual',
        signal: AbortSignal.timeout(7_000),
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get('location');
      const redirectedUrl = location ? safePublicUrl(new URL(location, url).toString()) : undefined;
      if (!redirectedUrl) return null;
      url = redirectedUrl;
      response = null;
    }
    if (!response) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || (!contentType.includes('text/html') && !contentType.includes('text/plain'))) return null;
    const raw = (await response.text()).slice(0, 120_000);
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12_000);
    if (text.length < 120) return null;
    return {
      id: 'product-website',
      kind: 'website' as const,
      title: `${intake.productName} product website`,
      content: text,
      url,
      verified: true,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('GTM product website could not be read:', error);
    return null;
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
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let previousPipelineRows: Array<Record<string, any>> = [];
  if (existingPlanId) {
    const { data: ownedPlan, error: planLookupError } = await admin.from('gtm_plans')
      .select('id').eq('id', existingPlanId).eq('user_id', userId).maybeSingle();
    if (planLookupError) throw planLookupError;
    if (!ownedPlan) throw new Error('GTM plan not found');
    const { data: pipelineRows, error: pipelineLookupError } = await admin.from('gtm_pipeline_entries')
      .select('id,name,stage,value,source_channel_id,momentum,occurred_at,notes')
      .eq('plan_id', existingPlanId).eq('user_id', userId);
    if (pipelineLookupError) throw pipelineLookupError;
    previousPipelineRows = pipelineRows ?? [];
  }
  const suppliedEvidence = normalizeFirstPartyEvidence(intake);
  const productWebsite = await fetchProductWebsiteEvidence(intake);
  intake.firstPartyEvidence = [
    ...suppliedEvidence.filter((item) => item.id !== 'product-website'),
    ...(productWebsite ? [productWebsite] : []),
  ];
  const research = await researchGTM(intake);
  const ranked = rankChannels(intake, {
    researchText: research.answer,
    researchSourceIds: research.sources.map((source: any) => source.id).filter(Boolean),
  });
  const selected = ranked.filter((item) => item.eligible).slice(0, 3);
  if (selected.length < 2) throw new Error('The current time and budget constraints leave fewer than two viable channels. Increase one constraint and try again.');
  const motion = inferMotion(intake);
  const prompt = `You are a rigorous early-stage GTM strategist. Build strategic content for the fixed, server-selected channels below. Do not add or replace channels. Separate sourced facts from assumptions. Make every play executable by a founder in the next six weeks.

FOUNDER INTAKE:
${JSON.stringify(intake, null, 2)}

DETERMINISTIC CHANNEL SELECTION:
${selected.map((item, index) => `${index + 1}. ${item.rule.id} — ${item.rule.name} (${item.score}/100)`).join('\n')}

LIVE RESEARCH STATUS: ${research.status}
LIVE RESEARCH:
${research.answer || 'No live sources were available. Treat market claims as assumptions.'}

ALLOWED SOURCE IDS:
${JSON.stringify([
    ...research.sources.map((source: any) => ({ id: source.id, title: source.title, url: source.url, snippet: source.snippet })),
    ...(intake.firstPartyEvidence ?? []).map((item) => ({ id: item.id, title: item.title, kind: item.kind, content: item.content.slice(0, 1600) })),
  ], null, 2)}

Every factual market, buyer, channel, positioning, or competitor claim must reference only these source IDs. Claims without a valid source must be marked as assumptions.

Return only JSON with this shape:
{
  "summaryInsight":"2-3 sentence thesis",
  "thesis":{"target":"","buyingTrigger":"","competitiveAlternative":"","value":"","rationale":"","risks":[""]},
  "positioning":{"competitiveAlternatives":[""],"differentiatedCapabilities":[""],"customerValue":[""],"bestFitSegment":"","marketCategory":"","positioningStatement":"","uniqueValueProposition":"","keyDifferentiators":[""]},
  "messaging":{"headline":"","hookLine":"","proofPoint":"","ctaCopy":"","toneOfVoice":[""]},
  "channelNarratives":{"channel-id":{"rationale":"","evidence":[""],"audience":"","buyingTrigger":"","offer":"","message":"","hypothesis":"","killRule":"","actions":[""],"requiredAssets":[""]}},
  "funnel":[{"stage":"","exitCriteria":"","metric":""}],
  "growthLoop":{"name":"","input":"","action":"","output":"","reinvestment":""},
  "sixWeekPlan":[{"week":1,"objective":"","actions":[""]}],
  "metrics":{"primaryOutcome":"","leading":[{"name":"","target":"","howToMeasure":""}],"lagging":[""]},
  "assumptions":[""],
  "claimAttributions":[{"claim":"","area":"positioning","sourceIds":["research-1"],"confidence":"medium","assumption":false}],
  "competitorBriefs":[{"name":"","category":"","positioning":"","bestFitSegment":"","pricing":"","acquisitionChannels":[""],"strengths":[""],"gaps":[""],"proofPoints":[""],"likelyObjection":"","recommendedResponse":"","sourceIds":["research-1"]}],
  "playAssets":{"channel-id":[{"type":"outreach_sequence","title":"","content":""}]}
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
    scoreEvidence: item.scoreEvidence,
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
    scoreEvidence: item.scoreEvidence,
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
      killRule: safeText(narrative.killRule, `Kill or replace this play after three measured weeks below ${item.rule.target} ${item.rule.metric.toLowerCase()} with no improving trend.`),
      structuredKillRule: {
        metric: item.rule.metric,
        operator: 'lt',
        threshold: item.rule.target,
        observationWindowWeeks: 3,
        minSampleSize: Math.max(3, Math.ceil(item.rule.target * 3)),
      },
      actions: safeStringArray(narrative.actions, [`Launch the first ${item.rule.name} experiment.`, `Log ${item.rule.metric.toLowerCase()} in Traction Engine.`]).slice(0, 6),
      metric: item.rule.metric,
      target: item.rule.target,
      weeklyTimeHours: Math.max(item.rule.minHours, Math.floor(intake.weeklyTimeHours / Math.min(2, selected.length))),
      weeklyBudget: Math.max(item.rule.minBudget / 4, Math.floor(intake.monthlyBudget / Math.min(2, selected.length) / 4)),
      requiredAssets: safeStringArray(narrative.requiredAssets),
      recommendedDirectoryIds: item.rule.directories.slice(0, 5),
    };
  });
  const pipeline = previousPipelineRows.flatMap((entry) => {
    const play = plays.find((candidate) => candidate.channelId === entry.source_channel_id);
    if (!play) return [];
    return [{
      id: entry.id,
      playId: play.id,
      name: safeText(entry.name, 'Attributed outcome', 200),
      stage: entry.stage,
      value: Math.max(0, Number(entry.value) || 0),
      sourceChannelId: entry.source_channel_id,
      momentum: entry.momentum,
      occurredAt: entry.occurred_at,
      notes: safeText(entry.notes, '', 1000) || undefined,
    }];
  });
  const positioning = strategic.positioning ?? {};
  const messaging = strategic.messaging ?? {};
  const evidenceItems = intake.firstPartyEvidence ?? [];
  const validSourceIds = new Set([
    ...research.sources.map((source: any) => source.id).filter(Boolean),
    ...evidenceItems.map((item) => item.id),
  ]);
  const claimAttributions = (Array.isArray(strategic.claimAttributions) ? strategic.claimAttributions : [])
    .slice(0, 30)
    .map((claim: any, index: number) => {
      const sourceIds = safeStringArray(claim?.sourceIds).filter((id) => validSourceIds.has(id)).slice(0, 6);
      const area = ['positioning', 'channel', 'competitor', 'buyer', 'economics'].includes(claim?.area) ? claim.area : 'positioning';
      const confidence = ['high', 'medium', 'low'].includes(claim?.confidence) ? claim.confidence : sourceIds.length > 0 ? 'medium' : 'low';
      return {
        id: `claim-${index + 1}`,
        claim: safeText(claim?.claim, '', 500),
        area,
        sourceIds,
        confidence,
        assumption: Boolean(claim?.assumption) || sourceIds.length === 0,
      };
    })
    .filter((claim: any) => claim.claim.length > 0);
  const plan: Record<string, any> = {
    schemaVersion: 2,
    planTitle: `${intake.productName} — Six-week GTM system`,
    summaryInsight: safeText(strategic.summaryInsight, `Focus on ${channels[0].name} first, use ${channels[1].name} as the controlled secondary bet, and let weekly evidence decide what scales.`),
    intake,
    researchStatus: research.status,
    researchSources: research.sources,
    evidenceItems,
    claimAttributions,
    pipeline,
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
  const allowedAssetTypes = new Set(['outreach_message', 'outreach_sequence', 'directory_listing', 'campaign_brief', 'interview_script', 'landing_page_copy', 'content_calendar', 'partnership_pitch', 'paid_test_matrix', 'launch_checklist']);
  const fallbackAssets = (play: any) => [
    { type: 'campaign_brief', title: `${play.channelName} measurement brief`, content: `Audience: ${play.audience}\nTrigger: ${play.buyingTrigger}\nOffer: ${play.offer}\nHypothesis: ${play.hypothesis}\nMetric: ${play.metric}\nTarget: ${play.target}\nDecision rule: change one variable at a time and log the result in Traction Engine.` },
    { type: ['partnerships', 'affiliates', 'creator-partnerships', 'integration-marketplaces'].includes(play.channelId) ? 'partnership_pitch' : 'outreach_sequence', title: `${play.channelName} activation sequence`, content: `Touch 1: ${play.message}\n\nTouch 2: When ${play.buyingTrigger.toLowerCase()}, how do you solve it today?\n\nTouch 3: ${plan.messaging.proofPoint}\n\nTouch 4: ${play.offer}\n\nTouch 5: ${plan.messaging.ctaCopy}` },
    { type: 'landing_page_copy', title: `${play.channelName} landing page copy`, content: `${plan.messaging.headline}\n\n${plan.messaging.hookLine}\n\nBest for: ${play.audience}\n\n${plan.positioning.uniqueValueProposition}\n\n${plan.messaging.ctaCopy}` },
    { type: 'interview_script', title: `${play.channelName} buyer interview`, content: `1. What happened the last time ${play.buyingTrigger.toLowerCase()}?\n2. What did you try first?\n3. Which alternatives did you compare?\n4. What made the problem urgent?\n5. What evidence would make ${play.offer.toLowerCase()} credible?\n6. Where did you look for an answer?` },
  ];
  plan.assets = plays.filter((play) => play.status !== 'paused').flatMap((play) => {
    const generated = Array.isArray(strategic.playAssets?.[play.channelId]) ? strategic.playAssets[play.channelId] : [];
    const candidates = generated.length >= 3 ? generated : fallbackAssets(play);
    return candidates.slice(0, 4).map((asset: any, index: number) => ({
      id: `${play.id}-${safeText(asset?.type, `asset-${index + 1}`, 60).replace(/[^a-z0-9_-]/gi, '-')}-${index + 1}`,
      playId: play.id,
      type: allowedAssetTypes.has(asset?.type) ? asset.type : 'campaign_brief',
      title: safeText(asset?.title, `${play.channelName} execution asset`, 180),
      content: safeText(asset?.content, fallbackAssets(play)[index % 4].content, 6000),
      status: 'draft',
    }));
  });
  const alternatives = Array.from(new Set([...(intake.knownCompetitors ?? []), ...plan.positioning.competitiveAlternatives])).filter(Boolean).slice(0, 5);
  const strategicCompetitors = Array.isArray(strategic.competitorBriefs) ? strategic.competitorBriefs : [];
  plan.competitorBriefs = alternatives.map((name: string, index: number) => {
    const generated = strategicCompetitors.find((item: any) => safeText(item?.name).toLowerCase() === name.toLowerCase()) ?? strategicCompetitors[index] ?? {};
    const sourceIds = safeStringArray(generated?.sourceIds).filter((id) => validSourceIds.has(id));
    const sourceUrls = sourceIds.map((id) => research.sources.find((source: any) => source.id === id)?.url ?? evidenceItems.find((item) => item.id === id)?.url).filter(Boolean);
    const verified = sourceIds.length > 0;
    return {
      id: `competitor-${crypto.randomUUID()}`,
      name,
      category: safeText(generated?.category, plan.positioning.marketCategory, 160),
      positioning: safeText(generated?.positioning, verified ? `${name} is a researched alternative in this buying decision.` : `Unverified alternative: ${name}. Confirm its positioning before using this brief.`, 600),
      bestFitSegment: safeText(generated?.bestFitSegment, plan.positioning.bestFitSegment, 300),
      pricing: safeText(generated?.pricing, verified ? 'Pricing was not found in the available sources.' : 'Unverified', 240),
      acquisitionChannels: safeStringArray(generated?.acquisitionChannels),
      strengths: safeStringArray(generated?.strengths, verified ? [] : ['Not yet verified from a primary source']),
      gaps: safeStringArray(generated?.gaps, verified ? [] : ['No evidence-backed opening has been established']),
      proofPoints: safeStringArray(generated?.proofPoints),
      likelyObjection: safeText(generated?.likelyObjection, `Why switch from ${name}?`, 400),
      recommendedResponse: safeText(generated?.recommendedResponse, `Use verified proof for ${plan.positioning.uniqueValueProposition}; do not make an unsupported competitor claim.`, 600),
      lastVerifiedAt: verified ? new Date().toISOString() : undefined,
      sourceUrls,
    };
  });
  const verifiedEvidenceCount = evidenceItems.filter((item) => item.verified).length;
  const sourcedClaimCount = claimAttributions.filter((claim: any) => !claim.assumption && claim.sourceIds.length > 0).length;
  const claimCoverage = claimAttributions.length > 0 ? sourcedClaimCount / claimAttributions.length : 0;
  const positioningConfidence = Math.min(100, Math.round((research.status === 'complete' ? 55 : research.status === 'limited' ? 40 : 20) + Math.min(20, verifiedEvidenceCount * 5) + claimCoverage * 25));
  const weekOneTasks = plan.tasks.filter((task: any) => task.week === 1).length;
  const overall = Math.round(positioningConfidence * .25);
  plan.health = {
    overall,
    positioningConfidence,
    channelEvidence: 0,
    executionConsistency: 0,
    outcomeProgress: 0,
    label: overall >= 45 ? 'forming' : 'fragile',
    risks: ['No linked Traction result yet.', 'No due GTM task has been completed.'],
    nextActions: [`Run and measure ${plays[0]?.channelName ?? 'the primary play'}.`, 'Complete the first founder-owned task.'],
    currentWeek: 1,
    dueTaskCount: weekOneTasks,
    completedDueTaskCount: 0,
    measuredPlayCount: 0,
    attributedPipelineValue: 0,
    calculation: [`Positioning uses research status, ${verifiedEvidenceCount} verified first-party sources, and ${Math.round(claimCoverage * 100)}% claim coverage.`, 'Channel evidence begins at zero until a play result or attributed pipeline record exists.', `Execution begins at zero across ${weekOneTasks} week-one tasks; future tasks are excluded.`, 'Outcome begins at zero until measured evidence exists.'],
  };

  const { data: persisted, error: persistError } = await admin.rpc('persist_gtm_competitive_plan', {
    p_user_id: userId,
    p_plan_id: existingPlanId ?? null,
    p_plan_title: plan.planTitle,
    p_plan_content: plan,
    p_research_sources: research.sources,
    p_research_status: research.status,
    p_plays: plays,
    p_tasks: plan.tasks,
    p_assets: plan.assets,
    p_competitor_briefs: plan.competitorBriefs,
    p_evidence_items: plan.evidenceItems,
    p_claim_attributions: plan.claimAttributions,
    p_pipeline_entries: plan.pipeline,
  });
  if (persistError) throw persistError;
  const persistedRow = (Array.isArray(persisted) ? persisted[0] : persisted) as { plan_id?: string; version?: number } | null;
  const planId = persistedRow?.plan_id;
  if (!planId) throw new Error('Failed to persist GTM plan');
  plan.planId = planId;
  plan.version = Number(persistedRow?.version ?? 1);
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
