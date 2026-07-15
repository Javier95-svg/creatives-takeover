export const GTM_V2_SCHEMA_VERSION = 2 as const;

export type GTMBusinessModel =
  | 'b2b_saas'
  | 'b2c_product'
  | 'marketplace'
  | 'ecommerce'
  | 'service'
  | 'media';

export type GTMLifecycle = 'launch_ready' | 'live';
export type GTMMotion =
  | 'founder_led_sales'
  | 'sales_assisted'
  | 'product_led'
  | 'transactional'
  | 'marketplace_liquidity'
  | 'audience_led';
export type GTMPlayStatus = 'backlog' | 'active' | 'paused' | 'completed';
export type GTMResearchStatus = 'complete' | 'limited' | 'unavailable';
export type GTMReviewDecision = 'collect_evidence' | 'double_down' | 'iterate' | 'kill';
export type GTMTaskStatus = 'todo' | 'doing' | 'done' | 'skipped';
export type GTMAssetStatus = 'draft' | 'approved';
export type GTMAssetType = 'outreach_message' | 'directory_listing' | 'campaign_brief';

export interface GTMIntakeV2 {
  productName: string;
  productUrl?: string;
  lifecycle: GTMLifecycle;
  businessModel: GTMBusinessModel;
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

export interface GTMResearchSource {
  title: string;
  url: string;
  snippet?: string;
  publishedDate?: string;
}

export interface GTMChannelScoreBreakdown {
  audienceEvidence: number;
  motionEconomicsFit: number;
  tractionEvidence: number;
  founderConstraints: number;
  founderStrengths: number;
}

export interface GTMChannelV2 {
  id: string;
  name: string;
  role: 'primary' | 'secondary' | 'deferred';
  score: number;
  scoreBreakdown: GTMChannelScoreBreakdown;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  evidence: string[];
  prerequisites: string[];
  rejectionReason?: string;
}

export interface GTMPlay {
  id: string;
  channelId: string;
  channelName: string;
  status: GTMPlayStatus;
  audience: string;
  buyingTrigger: string;
  offer: string;
  message: string;
  hypothesis: string;
  actions: string[];
  metric: string;
  target: number;
  weeklyTimeHours: number;
  weeklyBudget: number;
  requiredAssets: string[];
  recommendedDirectoryIds: string[];
  actual?: number;
  tractionSprintId?: string;
  directoryProgress?: Record<string, 'recommended' | 'visited' | 'submitted' | 'live' | 'skipped'>;
}

export interface GTMTask {
  id: string;
  playId: string;
  week: number;
  title: string;
  detail: string;
  owner: string;
  timeEstimateMinutes: number;
  output: string;
  metric: string;
  status: GTMTaskStatus;
  completedAt?: string;
}

export interface GTMPlayAsset {
  id: string;
  playId: string;
  type: GTMAssetType;
  title: string;
  content: string;
  status: GTMAssetStatus;
  updatedAt?: string;
}

export interface GTMCompetitorBrief {
  id: string;
  name: string;
  category: string;
  positioning: string;
  bestFitSegment: string;
  strengths: string[];
  gaps: string[];
  sourceUrls: string[];
}

export interface GTMHealthScore {
  overall: number;
  positioningConfidence: number;
  channelEvidence: number;
  executionConsistency: number;
  outcomeProgress: number;
  label: 'fragile' | 'forming' | 'healthy' | 'compounding';
  risks: string[];
  nextActions: string[];
}

export interface GTMPlanV2 {
  schemaVersion: typeof GTM_V2_SCHEMA_VERSION;
  planId?: string;
  version?: number;
  planTitle: string;
  summaryInsight: string;
  intake: GTMIntakeV2;
  researchStatus: GTMResearchStatus;
  researchSources: GTMResearchSource[];
  assumptions: string[];
  thesis: {
    motion: GTMMotion;
    target: string;
    buyingTrigger: string;
    competitiveAlternative: string;
    value: string;
    rationale: string;
    risks: string[];
  };
  positioning: {
    competitiveAlternatives: string[];
    differentiatedCapabilities: string[];
    customerValue: string[];
    bestFitSegment: string;
    marketCategory: string;
    positioningStatement: string;
    uniqueValueProposition: string;
    keyDifferentiators: string[];
  };
  messaging: {
    headline: string;
    hookLine: string;
    proofPoint: string;
    ctaCopy: string;
    toneOfVoice: string[];
  };
  channels: GTMChannelV2[];
  excludedChannels: GTMChannelV2[];
  plays: GTMPlay[];
  funnel: Array<{ stage: string; exitCriteria: string; metric: string }>;
  growthLoop: {
    name: string;
    input: string;
    action: string;
    output: string;
    reinvestment: string;
  };
  sixWeekPlan: Array<{ week: number; objective: string; actions: string[] }>;
  metrics: {
    primaryOutcome: string;
    leading: Array<{ name: string; target: string; howToMeasure: string }>;
    lagging: string[];
  };
  tasks?: GTMTask[];
  assets?: GTMPlayAsset[];
  competitorBriefs?: GTMCompetitorBrief[];
  health?: GTMHealthScore;
  generatedAt: string;
}

export interface GTMWeeklyReview {
  id?: string;
  planId: string;
  weekStart: string;
  decision: GTMReviewDecision;
  nextBestAction: string;
  evidenceSummary: string;
  activePlayId?: string;
  tractionExperimentId?: string;
  adaptation?: {
    week: number;
    previousObjective?: string;
    nextObjective: string;
    nextActions: string[];
  };
  healthSnapshot?: GTMHealthScore;
  createdAt?: string;
}

export interface GTMChannelDefinition {
  id: string;
  name: string;
  businessModels: GTMBusinessModel[];
  motions: GTMMotion[];
  minWeeklyHours: number;
  minMonthlyBudget: number;
  strengths: string[];
  defaultMetric: string;
  defaultTarget: number;
  prerequisites: string[];
  directoryIds: string[];
}

const ALL_MODELS: GTMBusinessModel[] = ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce', 'service', 'media'];

export const GTM_CHANNEL_REGISTRY: GTMChannelDefinition[] = [
  { id: 'founder-outreach', name: 'Founder-led outreach', businessModels: ['b2b_saas', 'service', 'marketplace'], motions: ['founder_led_sales', 'sales_assisted'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Networking', 'Cold outreach'], defaultMetric: 'Qualified conversations', defaultTarget: 5, prerequisites: ['A defined buyer role', 'A clear problem-led message'], directoryIds: ['linkedin', 'wellfound-angellist', 'crunchbase'] },
  { id: 'cold-email', name: 'Targeted cold email', businessModels: ['b2b_saas', 'service'], motions: ['founder_led_sales', 'sales_assisted'], minWeeklyHours: 4, minMonthlyBudget: 50, strengths: ['Writing', 'Cold outreach'], defaultMetric: 'Positive replies', defaultTarget: 5, prerequisites: ['A qualified prospect list', 'A verified sending domain'], directoryIds: ['g2', 'capterra', 'alternativeto'] },
  { id: 'linkedin', name: 'LinkedIn authority + conversations', businessModels: ['b2b_saas', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Writing', 'Networking'], defaultMetric: 'Qualified conversations', defaultTarget: 5, prerequisites: ['A founder profile aligned to the offer'], directoryIds: ['linkedin', 'indie-hackers', 'twitter-x'] },
  { id: 'communities', name: 'Niche communities', businessModels: ALL_MODELS, motions: ['founder_led_sales', 'product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Writing', 'Networking'], defaultMetric: 'Activated users', defaultTarget: 10, prerequisites: ['A named community where the ICP is active'], directoryIds: ['indie-hackers', 'hacker-news-show-hn', 'dev-to', 'reddit-r-startups-r-saas-r-entrepreneur'] },
  { id: 'launch-platforms', name: 'Launch platforms', businessModels: ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce'], motions: ['product_led', 'transactional', 'marketplace_liquidity'], minWeeklyHours: 5, minMonthlyBudget: 0, strengths: ['Writing', 'Design', 'Networking'], defaultMetric: 'Activated signups', defaultTarget: 25, prerequisites: ['A live product', 'A working onboarding path', 'Launch-day support capacity'], directoryIds: ['product-hunt', 'betalist', 'peerlist', 'microlaunch', 'uneed'] },
  { id: 'content-seo', name: 'Problem-led content + SEO', businessModels: ['b2b_saas', 'b2c_product', 'ecommerce', 'service', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minWeeklyHours: 5, minMonthlyBudget: 0, strengths: ['Writing', 'Coding / Technical'], defaultMetric: 'Qualified organic visits', defaultTarget: 100, prerequisites: ['Searchable customer problems', 'A repeatable publishing cadence'], directoryIds: ['dev-to', 'hackernoon', 'saashub', 'alternativeto'] },
  { id: 'short-form-video', name: 'Short-form video', businessModels: ['b2c_product', 'ecommerce', 'marketplace', 'media'], motions: ['transactional', 'product_led', 'audience_led', 'marketplace_liquidity'], minWeeklyHours: 5, minMonthlyBudget: 0, strengths: ['Speaking / Video', 'Design'], defaultMetric: 'Activated profile visits', defaultTarget: 50, prerequisites: ['A visually demonstrable outcome', 'Capacity to publish at least 3 times weekly'], directoryIds: ['product-hunt', 'reddit-r-startups-r-saas-r-entrepreneur', 'twitter-x'] },
  { id: 'partnerships', name: 'Distribution partnerships', businessModels: ['b2b_saas', 'marketplace', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Networking'], defaultMetric: 'Qualified partner conversations', defaultTarget: 3, prerequisites: ['A clear partner benefit', 'A list of complementary businesses'], directoryIds: ['wellfound-angellist', 'f6s', 'crunchbase'] },
  { id: 'paid-acquisition', name: 'Paid acquisition', businessModels: ['b2c_product', 'ecommerce', 'b2b_saas'], motions: ['transactional', 'product_led'], minWeeklyHours: 3, minMonthlyBudget: 500, strengths: ['Design'], defaultMetric: 'Qualified conversions', defaultTarget: 20, prerequisites: ['A proven conversion event', 'Known customer value', 'Conversion tracking'], directoryIds: [] },
  { id: 'referrals', name: 'Customer referral loop', businessModels: ALL_MODELS, motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 2, minMonthlyBudget: 0, strengths: ['Networking', 'Design'], defaultMetric: 'Referred activated users', defaultTarget: 10, prerequisites: ['Existing satisfied users', 'A reason to share'], directoryIds: [] },
];

export function inferMotion(intake: GTMIntakeV2): GTMMotion {
  if (intake.businessModel === 'marketplace') return 'marketplace_liquidity';
  if (intake.businessModel === 'ecommerce') return 'transactional';
  if (intake.businessModel === 'media') return 'audience_led';
  if (intake.businessModel === 'service') return 'founder_led_sales';
  if (intake.businessModel === 'b2b_saas') {
    return (intake.averageCustomerValue ?? 0) >= 5000 ? 'sales_assisted' : 'founder_led_sales';
  }
  return 'product_led';
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scoreChannelDefinition(
  definition: GTMChannelDefinition,
  intake: GTMIntakeV2,
  options: { audienceEvidence?: number; tractionEvidence?: number } = {},
): { eligible: boolean; rejectionReason?: string; score: number; breakdown: GTMChannelScoreBreakdown } {
  const motion = inferMotion(intake);
  let rejectionReason: string | undefined;
  if (!definition.businessModels.includes(intake.businessModel)) rejectionReason = 'This channel does not fit the selected business model.';
  else if (!definition.motions.includes(motion)) rejectionReason = 'This channel does not fit the selected go-to-market motion.';
  else if (intake.weeklyTimeHours < definition.minWeeklyHours) rejectionReason = `Requires at least ${definition.minWeeklyHours} hours per week.`;
  else if (intake.monthlyBudget < definition.minMonthlyBudget) rejectionReason = `Requires at least $${definition.minMonthlyBudget} per month.`;
  else if (definition.id === 'launch-platforms' && intake.lifecycle !== 'live') rejectionReason = 'Requires a live product and working onboarding.';
  else if (definition.id === 'referrals' && /none|no users|pre-launch/i.test(intake.currentTraction)) rejectionReason = 'Requires existing satisfied users.';

  const audienceEvidence = clamp(options.audienceEvidence ?? (intake.buyingTrigger?.trim() ? 75 : 55));
  const motionEconomicsFit = clamp(definition.motions.includes(motion) ? 90 : 35);
  const tractionEvidence = clamp(options.tractionEvidence ?? (/none|no users|pre-launch/i.test(intake.currentTraction) ? 35 : 70));
  const founderConstraints = clamp(
    50 + Math.min(30, (intake.weeklyTimeHours - definition.minWeeklyHours) * 6) + (intake.monthlyBudget >= definition.minMonthlyBudget ? 20 : 0),
  );
  const strengthMatches = definition.strengths.filter((strength) => intake.founderStrengths.includes(strength)).length;
  const founderStrengths = clamp(strengthMatches > 0 ? 85 : 50);
  const breakdown = { audienceEvidence, motionEconomicsFit, tractionEvidence, founderConstraints, founderStrengths };
  const score = clamp(
    audienceEvidence * 0.25 +
    motionEconomicsFit * 0.25 +
    tractionEvidence * 0.2 +
    founderConstraints * 0.15 +
    founderStrengths * 0.15,
  );
  return { eligible: !rejectionReason, rejectionReason, score: rejectionReason ? Math.min(score, 49) : score, breakdown };
}

export function rankChannelDefinitions(intake: GTMIntakeV2) {
  return GTM_CHANNEL_REGISTRY
    .map((definition) => ({ definition, ...scoreChannelDefinition(definition, intake) }))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

export function isGTMPlanV2(value: unknown): value is GTMPlanV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GTMPlanV2>;
  return candidate.schemaVersion === GTM_V2_SCHEMA_VERSION && Array.isArray(candidate.plays) && Array.isArray(candidate.channels);
}

export function createLegacyUpgradeIntake(value: Record<string, any>): Partial<GTMIntakeV2> {
  const legacy = value.intakeAnswers ?? {};
  const businessMap: Record<string, GTMBusinessModel> = {
    'B2B SaaS': 'b2b_saas',
    'B2C Product': 'b2c_product',
    Marketplace: 'marketplace',
    'Agency / Service': 'service',
    'E-commerce': 'ecommerce',
    'Content / Media': 'media',
  };
  return {
    productName: String(value.planTitle ?? '').replace(/GTM|Strategy|Plan/gi, '').trim(),
    lifecycle: 'live',
    businessModel: businessMap[legacy.businessType] ?? 'b2b_saas',
    targetSegment: legacy.targetAudience ?? '',
    problem: legacy.problemAndSolution ?? '',
    solution: legacy.problemAndSolution ?? '',
    currentTraction: legacy.currentTraction ?? '',
    weeklyTimeHours: Number.parseInt(legacy.weeklyTimeForMarketing ?? '5', 10) || 5,
    monthlyBudget: Number(String(legacy.budget ?? '0').replace(/[^0-9]/g, '')) || 0,
    founderStrengths: legacy.founderStrengths ?? [],
    knownCompetitors: [],
    geography: 'Global',
    sixWeekOutcome: '',
  };
}

export function buildGTMTasks(plan: GTMPlanV2): GTMTask[] {
  if (plan.tasks?.length) return plan.tasks;
  const activePlays = plan.plays.filter((play) => play.status !== 'paused');
  const weeklyMinutes = Math.max(60, plan.intake.weeklyTimeHours * 60);
  return plan.sixWeekPlan.flatMap((week) => week.actions.slice(0, 3).map((action, index) => {
    const play = activePlays[index % Math.max(1, activePlays.length)] ?? plan.plays[0];
    return {
      id: `${play?.id ?? 'plan'}-week-${week.week}-task-${index + 1}`,
      playId: play?.id ?? '',
      week: week.week,
      title: action,
      detail: `Complete this action to advance: ${week.objective}`,
      owner: 'Founder',
      timeEstimateMinutes: Math.max(30, Math.round(weeklyMinutes / Math.max(1, week.actions.length))),
      output: index === 0 ? week.objective : `Evidence logged for ${play?.channelName ?? 'the GTM motion'}`,
      metric: play?.metric ?? plan.metrics.leading[0]?.name ?? 'Validated signal',
      status: 'todo' as const,
    };
  }));
}

export function buildGTMAssets(plan: GTMPlanV2): GTMPlayAsset[] {
  if (plan.assets?.length) return plan.assets;
  return plan.plays.filter((play) => play.status !== 'paused').flatMap((play) => [
    {
      id: `${play.id}-outreach`, playId: play.id, type: 'outreach_message' as const,
      title: `${play.channelName} conversation starter`,
      content: `${play.message}\n\nOffer: ${play.offer}\n\nNext step: ${plan.messaging.ctaCopy}`,
      status: 'draft' as const,
    },
    {
      id: `${play.id}-listing`, playId: play.id, type: 'directory_listing' as const,
      title: `${plan.intake.productName} directory listing`,
      content: `${plan.messaging.headline}\n\n${plan.messaging.hookLine}\n\nBest for: ${play.audience}\n\n${plan.positioning.uniqueValueProposition}`,
      status: 'draft' as const,
    },
    {
      id: `${play.id}-campaign`, playId: play.id, type: 'campaign_brief' as const,
      title: `${play.channelName} experiment brief`,
      content: `Audience: ${play.audience}\nTrigger: ${play.buyingTrigger}\nHypothesis: ${play.hypothesis}\nMetric: ${play.metric}\nTarget: ${play.target}`,
      status: 'draft' as const,
    },
  ]);
}

export function buildCompetitorBriefs(plan: GTMPlanV2): GTMCompetitorBrief[] {
  if (plan.competitorBriefs?.length) return plan.competitorBriefs;
  const alternatives = Array.from(new Set([
    ...plan.intake.knownCompetitors,
    ...plan.positioning.competitiveAlternatives,
  ])).filter(Boolean).slice(0, 5);
  return alternatives.map((name, index) => ({
    id: `competitor-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
    name,
    category: plan.positioning.marketCategory,
    positioning: `${name} is an alternative customers may choose instead of changing their current workflow.`,
    bestFitSegment: plan.positioning.bestFitSegment,
    strengths: ['Existing familiarity', 'Lower perceived switching risk'],
    gaps: plan.positioning.differentiatedCapabilities.slice(0, 2),
    sourceUrls: plan.researchSources.slice(0, 2).map((source) => source.url),
  }));
}

export function calculateGTMHealth(plan: GTMPlanV2, tasks = buildGTMTasks(plan)): GTMHealthScore {
  const positioningConfidence = clamp(plan.researchStatus === 'complete' ? 85 : plan.researchStatus === 'limited' ? 62 : 40);
  const measuredPlays = plan.plays.filter((play) => typeof play.actual === 'number');
  const channelEvidence = clamp(measuredPlays.length > 0 ? 55 + measuredPlays.length * 15 : 30);
  const completed = tasks.filter((task) => task.status === 'done').length;
  const executionConsistency = clamp(tasks.length > 0 ? 30 + (completed / tasks.length) * 70 : 30);
  const primary = plan.plays.find((play) => play.status === 'active') ?? plan.plays[0];
  const outcomeProgress = clamp(primary && typeof primary.actual === 'number' && primary.target > 0
    ? (primary.actual / primary.target) * 100
    : 25);
  const overall = clamp(positioningConfidence * 0.25 + channelEvidence * 0.3 + executionConsistency * 0.25 + outcomeProgress * 0.2);
  const label = overall >= 80 ? 'compounding' : overall >= 65 ? 'healthy' : overall >= 45 ? 'forming' : 'fragile';
  const risks = [
    ...(plan.researchStatus !== 'complete' ? ['Market evidence is still limited.'] : []),
    ...(measuredPlays.length === 0 ? ['No linked Traction result yet.'] : []),
    ...(completed === 0 ? ['The execution cadence has not started.'] : []),
  ].slice(0, 3);
  const nextActions = [
    measuredPlays.length === 0 ? `Run and measure ${primary?.channelName ?? 'the primary play'}.` : 'Use the latest Traction decision to set next week.',
    completed === 0 ? 'Complete the first founder-owned task.' : 'Keep the weekly task completion streak.',
  ];
  return { overall, positioningConfidence, channelEvidence, executionConsistency, outcomeProgress, label, risks, nextActions };
}

export function deriveWeeklyReview(input: {
  planId: string;
  weekStart: string;
  activePlay?: GTMPlay | null;
  latestExperiment?: { id?: string; decision?: string | null; pass?: boolean | null; resultValue?: number; targetValue?: number } | null;
}): GTMWeeklyReview {
  const { planId, weekStart, activePlay, latestExperiment } = input;
  if (!activePlay) {
    return { planId, weekStart, decision: 'collect_evidence', nextBestAction: 'Activate one focused GTM play.', evidenceSummary: 'No active play is linked to this plan.' };
  }
  if (!latestExperiment) {
    return { planId, weekStart, activePlayId: activePlay.id, decision: 'collect_evidence', nextBestAction: `Run and log the first ${activePlay.channelName} experiment.`, evidenceSummary: 'No Traction Engine result has been logged for this play yet.' };
  }
  const normalized = latestExperiment.decision === 'double_down' || latestExperiment.decision === 'iterate' || latestExperiment.decision === 'kill'
    ? latestExperiment.decision
    : latestExperiment.pass
      ? 'double_down'
      : 'iterate';
  const actions: Record<'double_down' | 'iterate' | 'kill', string> = {
    double_down: `Repeat the winning ${activePlay.channelName} play with a higher target.`,
    iterate: `Change one message or audience variable before the next ${activePlay.channelName} run.`,
    kill: `Pause ${activePlay.channelName} and activate the next ranked channel.`,
  };
  return {
    planId,
    weekStart,
    activePlayId: activePlay.id,
    tractionExperimentId: latestExperiment.id,
    decision: normalized,
    nextBestAction: actions[normalized],
    evidenceSummary: latestExperiment.pass ? 'The latest experiment met its target.' : 'The latest experiment did not meet its target.',
  };
}
