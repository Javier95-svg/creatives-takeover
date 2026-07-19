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
export type GTMAssetType =
  | 'outreach_message'
  | 'outreach_sequence'
  | 'directory_listing'
  | 'campaign_brief'
  | 'interview_script'
  | 'landing_page_copy'
  | 'content_calendar'
  | 'partnership_pitch'
  | 'paid_test_matrix'
  | 'launch_checklist';
export type GTMEvidenceKind = 'website' | 'interview' | 'document' | 'pricing' | 'competitor' | 'traction' | 'founder_note';
export type GTMPipelineStage = 'lead' | 'qualified' | 'opportunity' | 'customer' | 'lost';

export interface GTMEvidenceItem {
  id: string;
  kind: GTMEvidenceKind;
  title: string;
  content: string;
  url?: string;
  sourceDate?: string;
  verified: boolean;
  channelIds?: string[];
  createdAt?: string;
}

export interface GTMClaimAttribution {
  id: string;
  claim: string;
  area: 'positioning' | 'channel' | 'competitor' | 'buyer' | 'economics';
  sourceIds: string[];
  confidence: 'high' | 'medium' | 'low';
  assumption: boolean;
}

export interface GTMScoreEvidence {
  explanation: string;
  sourceIds: string[];
}

export interface GTMPipelineEntry {
  id: string;
  playId: string;
  name: string;
  stage: GTMPipelineStage;
  value: number;
  sourceChannelId: string;
  momentum: 'active' | 'slowing' | 'at_risk' | 'closed';
  occurredAt: string;
  notes?: string;
}

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
  firstPartyEvidence?: GTMEvidenceItem[];
}

export interface GTMResearchSource {
  id?: string;
  title: string;
  url: string;
  snippet?: string;
  publishedDate?: string;
  kind?: 'external' | 'first_party';
  verifiedAt?: string;
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
  scoreEvidence?: Partial<Record<keyof GTMChannelScoreBreakdown, GTMScoreEvidence>>;
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
  killRule?: string;
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
  pricing?: string;
  acquisitionChannels?: string[];
  proofPoints?: string[];
  likelyObjection?: string;
  recommendedResponse?: string;
  lastVerifiedAt?: string;
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
  currentWeek?: number;
  dueTaskCount?: number;
  completedDueTaskCount?: number;
  measuredPlayCount?: number;
  attributedPipelineValue?: number;
  calculation?: string[];
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
  evidenceItems?: GTMEvidenceItem[];
  claimAttributions?: GTMClaimAttribution[];
  pipeline?: GTMPipelineEntry[];
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
    changedVariables?: string[];
    rationale?: string;
  };
  reviewInput?: GTMWeeklyReviewInput;
  signals?: string[];
  changeLog?: string[];
  healthSnapshot?: GTMHealthScore;
  createdAt?: string;
}

export interface GTMWeeklyReviewInput {
  wins: string;
  misses: string;
  objections: string;
  customerLanguage: string;
  blockers: string;
  notes: string;
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
  evidenceKeywords: string[];
  requiresLiveProduct?: boolean;
  requiresExistingCustomers?: boolean;
  minCustomerValue?: number;
  maxCustomerValue?: number;
}

const ALL_MODELS: GTMBusinessModel[] = ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce', 'service', 'media'];

export const GTM_CHANNEL_REGISTRY: GTMChannelDefinition[] = [
  { id: 'founder-outreach', name: 'Founder-led outreach', businessModels: ['b2b_saas', 'service', 'marketplace'], motions: ['founder_led_sales', 'sales_assisted'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Networking', 'Cold outreach'], defaultMetric: 'Qualified conversations', defaultTarget: 5, prerequisites: ['A defined buyer role', 'A clear problem-led message'], directoryIds: ['linkedin', 'wellfound-angellist', 'crunchbase'], evidenceKeywords: ['conversation', 'demo', 'outreach', 'referral', 'network'] },
  { id: 'cold-email', name: 'Targeted cold email', businessModels: ['b2b_saas', 'service'], motions: ['founder_led_sales', 'sales_assisted'], minWeeklyHours: 4, minMonthlyBudget: 50, strengths: ['Writing', 'Cold outreach'], defaultMetric: 'Positive replies', defaultTarget: 5, prerequisites: ['A qualified prospect list', 'A verified sending domain'], directoryIds: ['g2', 'capterra', 'alternativeto'], evidenceKeywords: ['email', 'reply', 'inbox', 'outbound', 'prospect'], minCustomerValue: 500 },
  { id: 'linkedin', name: 'LinkedIn authority + conversations', businessModels: ['b2b_saas', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Writing', 'Networking'], defaultMetric: 'Qualified conversations', defaultTarget: 5, prerequisites: ['A founder profile aligned to the offer'], directoryIds: ['linkedin', 'indie-hackers', 'twitter-x'], evidenceKeywords: ['linkedin', 'professional network', 'thought leadership', 'social selling'] },
  { id: 'communities', name: 'Niche communities', businessModels: ALL_MODELS, motions: ['founder_led_sales', 'product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Writing', 'Networking'], defaultMetric: 'Activated users', defaultTarget: 10, prerequisites: ['A named community where the ICP is active'], directoryIds: ['indie-hackers', 'hacker-news-show-hn', 'dev-to', 'reddit-r-startups-r-saas-r-entrepreneur'], evidenceKeywords: ['community', 'forum', 'reddit', 'slack', 'discord', 'group'] },
  { id: 'launch-platforms', name: 'Launch platforms', businessModels: ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce'], motions: ['product_led', 'transactional', 'marketplace_liquidity'], minWeeklyHours: 5, minMonthlyBudget: 0, strengths: ['Writing', 'Design', 'Networking'], defaultMetric: 'Activated signups', defaultTarget: 25, prerequisites: ['A live product', 'A working onboarding path', 'Launch-day support capacity'], directoryIds: ['product-hunt', 'betalist', 'peerlist', 'microlaunch', 'uneed'], evidenceKeywords: ['product hunt', 'launch', 'beta', 'early adopter'], requiresLiveProduct: true },
  { id: 'content-seo', name: 'Problem-led content + SEO', businessModels: ['b2b_saas', 'b2c_product', 'ecommerce', 'service', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minWeeklyHours: 5, minMonthlyBudget: 0, strengths: ['Writing', 'Coding / Technical'], defaultMetric: 'Qualified organic visits', defaultTarget: 100, prerequisites: ['Searchable customer problems', 'A repeatable publishing cadence'], directoryIds: ['dev-to', 'hackernoon', 'saashub', 'alternativeto'], evidenceKeywords: ['search', 'google', 'seo', 'organic', 'content', 'how to'] },
  { id: 'short-form-video', name: 'Short-form video', businessModels: ['b2c_product', 'ecommerce', 'marketplace', 'media'], motions: ['transactional', 'product_led', 'audience_led', 'marketplace_liquidity'], minWeeklyHours: 5, minMonthlyBudget: 0, strengths: ['Speaking / Video', 'Design'], defaultMetric: 'Activated profile visits', defaultTarget: 50, prerequisites: ['A visually demonstrable outcome', 'Capacity to publish at least 3 times weekly'], directoryIds: ['product-hunt', 'reddit-r-startups-r-saas-r-entrepreneur', 'twitter-x'], evidenceKeywords: ['tiktok', 'reels', 'short video', 'youtube shorts', 'visual'] },
  { id: 'partnerships', name: 'Distribution partnerships', businessModels: ['b2b_saas', 'marketplace', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 0, strengths: ['Networking'], defaultMetric: 'Qualified partner conversations', defaultTarget: 3, prerequisites: ['A clear partner benefit', 'A list of complementary businesses'], directoryIds: ['wellfound-angellist', 'f6s', 'crunchbase'], evidenceKeywords: ['partner', 'integration', 'reseller', 'affiliate', 'ecosystem'] },
  { id: 'paid-acquisition', name: 'Paid acquisition', businessModels: ['b2c_product', 'ecommerce', 'b2b_saas'], motions: ['transactional', 'product_led'], minWeeklyHours: 3, minMonthlyBudget: 500, strengths: ['Design'], defaultMetric: 'Qualified conversions', defaultTarget: 20, prerequisites: ['A proven conversion event', 'Known customer value', 'Conversion tracking'], directoryIds: [], evidenceKeywords: ['paid', 'cpc', 'cac', 'roas', 'ads', 'conversion'], requiresLiveProduct: true, minCustomerValue: 40 },
  { id: 'referrals', name: 'Customer referral loop', businessModels: ALL_MODELS, motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 2, minMonthlyBudget: 0, strengths: ['Networking', 'Design'], defaultMetric: 'Referred activated users', defaultTarget: 10, prerequisites: ['Existing satisfied users', 'A reason to share'], directoryIds: [], evidenceKeywords: ['referral', 'word of mouth', 'invite', 'recommend'], requiresExistingCustomers: true },
  { id: 'product-loop', name: 'Product-led invitation loop', businessModels: ['b2b_saas', 'b2c_product', 'marketplace'], motions: ['product_led', 'marketplace_liquidity'], minWeeklyHours: 4, minMonthlyBudget: 0, strengths: ['Coding / Technical', 'Design'], defaultMetric: 'Invited activated users', defaultTarget: 15, prerequisites: ['A natural collaboration or sharing moment', 'Activation analytics'], directoryIds: [], evidenceKeywords: ['invite', 'collaborate', 'share', 'viral', 'workspace'], requiresLiveProduct: true },
  { id: 'lifecycle-email', name: 'Lifecycle email activation', businessModels: ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce', 'media'], motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 25, strengths: ['Writing', 'Coding / Technical'], defaultMetric: 'Activated recipients', defaultTarget: 20, prerequisites: ['Permissioned leads or users', 'A measurable activation event'], directoryIds: [], evidenceKeywords: ['waitlist', 'newsletter', 'email list', 'activation', 'onboarding'], requiresLiveProduct: true },
  { id: 'affiliates', name: 'Affiliate distribution', businessModels: ['b2b_saas', 'b2c_product', 'ecommerce', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minWeeklyHours: 3, minMonthlyBudget: 100, strengths: ['Networking'], defaultMetric: 'Affiliate conversions', defaultTarget: 10, prerequisites: ['Trackable attribution', 'Margin for a partner commission'], directoryIds: [], evidenceKeywords: ['affiliate', 'commission', 'creator', 'publisher'], minCustomerValue: 30 },
  { id: 'creator-partnerships', name: 'Creator and influencer partnerships', businessModels: ['b2c_product', 'ecommerce', 'marketplace', 'media'], motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minWeeklyHours: 4, minMonthlyBudget: 250, strengths: ['Networking', 'Design', 'Speaking / Video'], defaultMetric: 'Creator-attributed conversions', defaultTarget: 10, prerequisites: ['A visually clear offer', 'Trackable creator links or codes'], directoryIds: ['twitter-x'], evidenceKeywords: ['creator', 'influencer', 'youtube', 'instagram', 'audience'] },
  { id: 'webinars-events', name: 'Expert webinars and events', businessModels: ['b2b_saas', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'audience_led'], minWeeklyHours: 5, minMonthlyBudget: 100, strengths: ['Speaking / Video', 'Networking'], defaultMetric: 'Qualified attendees', defaultTarget: 20, prerequisites: ['A teachable urgent problem', 'A follow-up path'], directoryIds: ['linkedin'], evidenceKeywords: ['webinar', 'event', 'conference', 'workshop', 'demo'], minCustomerValue: 500 },
  { id: 'integration-marketplaces', name: 'Integration and app marketplaces', businessModels: ['b2b_saas', 'b2c_product'], motions: ['product_led', 'sales_assisted'], minWeeklyHours: 5, minMonthlyBudget: 0, strengths: ['Coding / Technical', 'Networking'], defaultMetric: 'Marketplace activations', defaultTarget: 15, prerequisites: ['A live integration', 'Marketplace listing eligibility'], directoryIds: ['product-hunt', 'saashub'], evidenceKeywords: ['integration', 'app marketplace', 'plugin', 'extension', 'ecosystem'], requiresLiveProduct: true },
  { id: 'newsletter-sponsorships', name: 'Newsletter sponsorships', businessModels: ['b2b_saas', 'b2c_product', 'ecommerce', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minWeeklyHours: 2, minMonthlyBudget: 300, strengths: ['Writing', 'Networking'], defaultMetric: 'Qualified referred visits', defaultTarget: 100, prerequisites: ['A measurable landing page', 'A newsletter with verified audience fit'], directoryIds: [], evidenceKeywords: ['newsletter', 'sponsorship', 'subscriber', 'email audience'] },
  { id: 'retail-wholesale', name: 'Retail and wholesale distribution', businessModels: ['ecommerce'], motions: ['transactional'], minWeeklyHours: 5, minMonthlyBudget: 500, strengths: ['Networking'], defaultMetric: 'Qualified buyer conversations', defaultTarget: 5, prerequisites: ['Wholesale-ready margins', 'Inventory and fulfillment capacity'], directoryIds: [], evidenceKeywords: ['retail', 'wholesale', 'stockist', 'store', 'distributor'], requiresLiveProduct: true },
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
  options: {
    audienceEvidence?: number;
    tractionEvidence?: number;
    researchText?: string;
    researchSourceIds?: string[];
    evidenceItems?: GTMEvidenceItem[];
    measuredChannelIds?: string[];
  } = {},
): {
  eligible: boolean;
  rejectionReason?: string;
  score: number;
  breakdown: GTMChannelScoreBreakdown;
  scoreEvidence: Record<keyof GTMChannelScoreBreakdown, GTMScoreEvidence>;
} {
  const motion = inferMotion(intake);
  const evidenceItems = options.evidenceItems ?? intake.firstPartyEvidence ?? [];
  const evidenceText = [
    intake.targetSegment,
    intake.buyingTrigger,
    intake.currentTraction,
    options.researchText,
    ...evidenceItems.map((item) => `${item.title} ${item.content}`),
  ].filter(Boolean).join(' ').toLowerCase();
  const matchingKeywords = definition.evidenceKeywords.filter((keyword) => evidenceText.includes(keyword.toLowerCase()));
  const taggedEvidence = evidenceItems.filter((item) => item.channelIds?.includes(definition.id));
  const firstPartySourceIds = Array.from(new Set([
    ...taggedEvidence.map((item) => item.id),
    ...evidenceItems.filter((item) => definition.evidenceKeywords.some((keyword) => `${item.title} ${item.content}`.toLowerCase().includes(keyword.toLowerCase()))).map((item) => item.id),
  ])).slice(0, 6);
  let rejectionReason: string | undefined;
  if (!definition.businessModels.includes(intake.businessModel)) rejectionReason = 'This channel does not fit the selected business model.';
  else if (!definition.motions.includes(motion)) rejectionReason = 'This channel does not fit the selected go-to-market motion.';
  else if (intake.weeklyTimeHours < definition.minWeeklyHours) rejectionReason = `Requires at least ${definition.minWeeklyHours} hours per week.`;
  else if (intake.monthlyBudget < definition.minMonthlyBudget) rejectionReason = `Requires at least $${definition.minMonthlyBudget} per month.`;
  else if (definition.requiresLiveProduct && intake.lifecycle !== 'live') rejectionReason = 'Requires a live product and a measurable conversion path.';
  else if (definition.requiresExistingCustomers && /none|no users|pre-launch|no measured/i.test(intake.currentTraction)) rejectionReason = 'Requires existing satisfied customers or users.';
  else if (definition.minCustomerValue && (intake.averageCustomerValue ?? intake.averageOrderValue ?? 0) < definition.minCustomerValue) rejectionReason = `Requires customer value of at least $${definition.minCustomerValue}.`;
  else if (definition.maxCustomerValue && (intake.averageCustomerValue ?? intake.averageOrderValue ?? 0) > definition.maxCustomerValue) rejectionReason = `Designed for customer value below $${definition.maxCustomerValue}.`;

  const audienceEvidence = clamp(options.audienceEvidence ?? (
    35 + (intake.buyingTrigger?.trim() ? 10 : 0) + (intake.buyerRole?.trim() ? 5 : 0)
    + Math.min(30, matchingKeywords.length * 8) + (taggedEvidence.length > 0 ? 10 : 0)
  ));
  const customerValue = intake.averageCustomerValue ?? intake.averageOrderValue ?? 0;
  const economicsKnown = customerValue > 0 || Boolean(intake.pricing?.trim());
  const economicsFit = definition.minCustomerValue ? customerValue >= definition.minCustomerValue : true;
  const motionEconomicsFit = clamp(
    (definition.motions.includes(motion) ? 55 : 20)
    + (definition.businessModels.includes(intake.businessModel) ? 15 : 0)
    + (economicsKnown ? 10 : 0)
    + (economicsFit ? 10 : 0),
  );
  const tractionLower = intake.currentTraction.toLowerCase();
  const hasMeasuredTraction = !/none|no users|pre-launch|no measured/i.test(tractionLower) && /\d|customer|user|revenue|reply|demo|sale|subscriber|conversion/i.test(tractionLower);
  const channelMentioned = [definition.id, definition.name, ...definition.evidenceKeywords]
    .some((value) => tractionLower.includes(value.toLowerCase()));
  const tractionEvidence = clamp(options.tractionEvidence ?? (
    20 + (hasMeasuredTraction ? 20 : 0) + (channelMentioned ? 25 : 0)
    + (options.measuredChannelIds?.includes(definition.id) ? 25 : 0) + (taggedEvidence.some((item) => item.kind === 'traction') ? 10 : 0)
  ));
  const founderConstraints = clamp(
    35 + Math.min(35, Math.max(0, intake.weeklyTimeHours - definition.minWeeklyHours) * 6)
    + (intake.monthlyBudget >= definition.minMonthlyBudget ? 20 : 0)
    + (definition.minMonthlyBudget === 0 ? 10 : 0),
  );
  const strengthMatches = definition.strengths.filter((strength) => intake.founderStrengths.includes(strength)).length;
  const founderStrengths = clamp(strengthMatches > 1 ? 95 : strengthMatches === 1 ? 80 : 45);
  const breakdown = { audienceEvidence, motionEconomicsFit, tractionEvidence, founderConstraints, founderStrengths };
  const scoreEvidence = {
    audienceEvidence: {
      explanation: matchingKeywords.length > 0
        ? `Buyer and research evidence matched: ${matchingKeywords.slice(0, 4).join(', ')}.`
        : 'No channel-specific buyer-location evidence was found; validate audience presence.',
      sourceIds: [...firstPartySourceIds, ...(options.researchSourceIds ?? [])].slice(0, 6),
    },
    motionEconomicsFit: {
      explanation: `${definition.name} is ${definition.motions.includes(motion) ? 'compatible' : 'not compatible'} with the ${motion.replaceAll('_', ' ')} motion${economicsKnown ? ` and the supplied customer economics` : '; customer economics remain incomplete'}.`,
      sourceIds: firstPartySourceIds,
    },
    tractionEvidence: {
      explanation: channelMentioned || options.measuredChannelIds?.includes(definition.id)
        ? 'The founder supplied channel-specific or linked performance evidence.'
        : hasMeasuredTraction ? 'Measured traction exists, but it is not clearly attributable to this channel.' : 'No measured channel evidence exists yet.',
      sourceIds: firstPartySourceIds,
    },
    founderConstraints: {
      explanation: `Requires ${definition.minWeeklyHours} hours/week and $${definition.minMonthlyBudget}/month against ${intake.weeklyTimeHours} hours and $${intake.monthlyBudget}.`,
      sourceIds: [],
    },
    founderStrengths: {
      explanation: strengthMatches > 0 ? `Matched founder strengths: ${definition.strengths.filter((strength) => intake.founderStrengths.includes(strength)).join(', ')}.` : 'No declared founder strength directly supports this channel.',
      sourceIds: [],
    },
  } satisfies Record<keyof GTMChannelScoreBreakdown, GTMScoreEvidence>;
  const score = clamp(
    audienceEvidence * 0.25 +
    motionEconomicsFit * 0.25 +
    tractionEvidence * 0.2 +
    founderConstraints * 0.15 +
    founderStrengths * 0.15,
  );
  return { eligible: !rejectionReason, rejectionReason, score: rejectionReason ? Math.min(score, 49) : score, breakdown, scoreEvidence };
}

export function rankChannelDefinitions(
  intake: GTMIntakeV2,
  options: Parameters<typeof scoreChannelDefinition>[2] = {},
) {
  return GTM_CHANNEL_REGISTRY
    .map((definition) => ({ definition, ...scoreChannelDefinition(definition, intake, options) }))
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
  return plan.plays.filter((play) => play.status !== 'paused').flatMap((play) => {
    const common = {
      playId: play.id,
      status: 'draft' as const,
    };
    const brief: GTMPlayAsset = {
      ...common,
      id: `${play.id}-campaign`,
      type: 'campaign_brief',
      title: `${play.channelName} measurement brief`,
      content: `Audience: ${play.audience}\nBuying trigger: ${play.buyingTrigger}\nOffer: ${play.offer}\nHypothesis: ${play.hypothesis}\nPrimary metric: ${play.metric}\nWeekly target: ${play.target}\nBudget cap: $${play.weeklyBudget}\nDecision rule: double down only after the target is met with attributable evidence; otherwise iterate one variable or stop.`,
    };
    const outreach: GTMPlayAsset = {
      ...common,
      id: `${play.id}-sequence`,
      type: 'outreach_sequence',
      title: `${play.channelName} five-touch sequence`,
      content: `Touch 1 — Problem signal\n${play.message}\n\nTouch 2 — Trigger follow-up\nWhen ${play.buyingTrigger.toLowerCase()}, how are you handling it today?\n\nTouch 3 — Value proof\n${plan.messaging.proofPoint}\n\nTouch 4 — Low-friction offer\n${play.offer}\n\nTouch 5 — Close the loop\nShould I close this out, or is ${plan.messaging.ctaCopy.toLowerCase()} useful now?`,
    };
    const interview: GTMPlayAsset = {
      ...common,
      id: `${play.id}-interview`,
      type: 'interview_script',
      title: `${play.channelName} buyer interview script`,
      content: `1. Take me back to the last time ${play.buyingTrigger.toLowerCase()}.\n2. What did you try first?\n3. What alternatives did you compare?\n4. What made the problem expensive or urgent?\n5. Who influenced the decision?\n6. What evidence would make ${play.offer.toLowerCase()} credible?\n7. Where did you look for an answer?\n\nDo not pitch until the interview is complete. Capture exact customer language.`,
    };
    const landing: GTMPlayAsset = {
      ...common,
      id: `${play.id}-landing`,
      type: 'landing_page_copy',
      title: `${play.channelName} landing page copy`,
      content: `Headline\n${plan.messaging.headline}\n\nProblem\n${plan.messaging.hookLine}\n\nValue\n${plan.positioning.uniqueValueProposition}\n\nBest for\n${play.audience}\n\nProof\n${plan.messaging.proofPoint}\n\nCTA\n${plan.messaging.ctaCopy}`,
    };
    const listing: GTMPlayAsset = {
      ...common,
      id: `${play.id}-listing`,
      type: 'directory_listing',
      title: `${plan.intake.productName} launch listing`,
      content: `${plan.messaging.headline}\n\n${plan.messaging.hookLine}\n\nBest for: ${play.audience}\n\nWhy it is different: ${plan.positioning.uniqueValueProposition}\n\nCTA: ${plan.messaging.ctaCopy}`,
    };
    const calendar: GTMPlayAsset = {
      ...common,
      id: `${play.id}-calendar`,
      type: 'content_calendar',
      title: `${play.channelName} two-week content calendar`,
      content: `Day 1: Explain the costly status quo — ${plan.intake.problem}\nDay 3: Tell a trigger story — ${play.buyingTrigger}\nDay 5: Show the differentiated mechanism — ${plan.positioning.differentiatedCapabilities[0] ?? plan.intake.solution}\nDay 8: Answer the strongest buyer objection\nDay 10: Publish proof — ${plan.messaging.proofPoint}\nDay 12: Invite the audience to ${plan.messaging.ctaCopy.toLowerCase()}\n\nUse one CTA and tag every response to ${play.metric}.`,
    };
    const partnership: GTMPlayAsset = {
      ...common,
      id: `${play.id}-partner`,
      type: 'partnership_pitch',
      title: `${play.channelName} partner pitch`,
      content: `Partner audience: ${play.audience}\nShared trigger: ${play.buyingTrigger}\nPartner benefit: Give your audience a credible path to ${plan.thesis.value}.\nProposed test: one co-marketed resource or referral pilot for two weeks.\nSuccess metric: ${play.target} ${play.metric.toLowerCase()}.\nAsk: Would you review a one-page pilot outline?`,
    };
    const paidMatrix: GTMPlayAsset = {
      ...common,
      id: `${play.id}-paid-matrix`,
      type: 'paid_test_matrix',
      title: `${play.channelName} controlled test matrix`,
      content: `Audience A: ${play.audience}\nMessage A: ${play.message}\nMessage B: ${plan.messaging.hookLine}\nOffer: ${play.offer}\nConversion event: ${play.metric}\nWeekly target: ${play.target}\nBudget cap: $${play.weeklyBudget}\nRule: test one audience × two messages; stop if attribution or conversion tracking is incomplete.`,
    };

    if (['founder-outreach', 'cold-email', 'linkedin', 'webinars-events'].includes(play.channelId)) return [brief, outreach, interview, landing];
    if (['content-seo', 'short-form-video', 'newsletter-sponsorships'].includes(play.channelId)) return [brief, calendar, landing, interview];
    if (['partnerships', 'affiliates', 'creator-partnerships', 'integration-marketplaces', 'retail-wholesale'].includes(play.channelId)) return [brief, partnership, outreach, landing];
    if (play.channelId === 'paid-acquisition') return [brief, paidMatrix, landing, interview];
    if (play.channelId === 'launch-platforms') return [brief, listing, calendar, landing];
    return [brief, outreach, landing, listing];
  });
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
    positioning: `Unverified alternative: ${name}. Confirm its category, promise, and target segment before using this brief.`,
    bestFitSegment: plan.positioning.bestFitSegment,
    strengths: ['Not yet verified from a primary source'],
    gaps: ['No evidence-backed opening has been established yet'],
    likelyObjection: `Why switch from ${name}?`,
    recommendedResponse: `Lead with verified evidence for ${plan.positioning.uniqueValueProposition}; do not make an unsupported competitor claim.`,
    lastVerifiedAt: undefined,
    sourceUrls: plan.researchSources.slice(0, 2).map((source) => source.url),
  }));
}

export function calculateGTMHealth(plan: GTMPlanV2, tasks = buildGTMTasks(plan)): GTMHealthScore {
  const generatedAt = new Date(plan.generatedAt).getTime();
  const currentWeek = Number.isFinite(generatedAt)
    ? Math.min(6, Math.max(1, Math.floor((Date.now() - generatedAt) / 604_800_000) + 1))
    : 1;
  const verifiedEvidence = (plan.evidenceItems ?? []).filter((item) => item.verified).length;
  const attributedClaims = (plan.claimAttributions ?? []).filter((claim) => !claim.assumption && claim.sourceIds.length > 0).length;
  const totalClaims = (plan.claimAttributions ?? []).length;
  const citationCoverage = totalClaims > 0 ? attributedClaims / totalClaims : 0;
  const positioningConfidence = clamp(
    (plan.researchStatus === 'complete' ? 55 : plan.researchStatus === 'limited' ? 40 : 20)
    + Math.min(20, verifiedEvidence * 5)
    + citationCoverage * 25,
  );
  const measuredPlays = plan.plays.filter((play) => typeof play.actual === 'number');
  const attributedPipeline = (plan.pipeline ?? []).filter((entry) => entry.sourceChannelId && entry.stage !== 'lost');
  const attributedPipelineValue = attributedPipeline.reduce((sum, entry) => sum + Math.max(0, entry.value), 0);
  const channelEvidence = clamp(measuredPlays.length * 25 + Math.min(25, attributedPipeline.length * 5) + (measuredPlays.length > 0 ? 25 : 0));
  const dueTasks = tasks.filter((task) => task.week <= currentWeek && task.status !== 'skipped');
  const completedDueTasks = dueTasks.filter((task) => task.status === 'done');
  const executionConsistency = clamp(dueTasks.length > 0 ? (completedDueTasks.length / dueTasks.length) * 100 : 0);
  const primary = plan.plays.find((play) => play.status === 'active') ?? plan.plays[0];
  const outcomeProgress = clamp(primary && typeof primary.actual === 'number' && primary.target > 0
    ? (primary.actual / primary.target) * 100
    : attributedPipeline.some((entry) => entry.stage === 'customer') ? 70 : 0);
  const overall = clamp(positioningConfidence * 0.25 + channelEvidence * 0.3 + executionConsistency * 0.25 + outcomeProgress * 0.2);
  const label = overall >= 80 ? 'compounding' : overall >= 65 ? 'healthy' : overall >= 45 ? 'forming' : 'fragile';
  const risks = [
    ...(plan.researchStatus !== 'complete' ? ['Market evidence is still limited.'] : []),
    ...(measuredPlays.length === 0 ? ['No linked Traction result yet.'] : []),
    ...(dueTasks.length > 0 && completedDueTasks.length === 0 ? ['No due GTM task has been completed.'] : []),
    ...(totalClaims > 0 && citationCoverage < 0.6 ? ['Most strategic claims are not yet tied to evidence.'] : []),
  ].slice(0, 3);
  const nextActions = [
    measuredPlays.length === 0 ? `Run and measure ${primary?.channelName ?? 'the primary play'}.` : 'Use the latest Traction decision to set next week.',
    dueTasks.length > completedDueTasks.length ? 'Complete the next task due this week.' : 'All due GTM tasks are complete; collect the next signal.',
  ];
  return {
    overall, positioningConfidence, channelEvidence, executionConsistency, outcomeProgress, label, risks, nextActions,
    currentWeek,
    dueTaskCount: dueTasks.length,
    completedDueTaskCount: completedDueTasks.length,
    measuredPlayCount: measuredPlays.length,
    attributedPipelineValue,
    calculation: [
      `Positioning: research status, ${verifiedEvidence} verified first-party sources, and ${Math.round(citationCoverage * 100)}% claim coverage.`,
      `Channel evidence: ${measuredPlays.length} measured plays and ${attributedPipeline.length} attributed pipeline records.`,
      `Execution: ${completedDueTasks.length}/${dueTasks.length} tasks due through week ${currentWeek}; future tasks are excluded.`,
      `Outcome: primary play actual versus target, with closed pipeline used only when no play actual exists.`,
    ],
  };
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
