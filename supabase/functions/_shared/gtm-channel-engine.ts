export type GTMBusinessModel = 'b2b_saas' | 'b2c_product' | 'marketplace' | 'ecommerce' | 'service' | 'media';
export type GTMMotion = 'founder_led_sales' | 'sales_assisted' | 'product_led' | 'transactional' | 'marketplace_liquidity' | 'audience_led';

export interface GTMEvidenceItem {
  id: string;
  kind: 'website' | 'interview' | 'document' | 'pricing' | 'competitor' | 'traction' | 'founder_note';
  title: string;
  content: string;
  url?: string;
  sourceDate?: string;
  verified: boolean;
  channelIds?: string[];
  createdAt?: string;
}

export interface GTMIntakeV2 {
  productName: string;
  productUrl?: string;
  lifecycle: 'launch_ready' | 'live';
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

export interface ChannelRule {
  id: string;
  name: string;
  models: GTMBusinessModel[];
  motions: GTMMotion[];
  minHours: number;
  minBudget: number;
  strengths: string[];
  metric: string;
  target: number;
  prerequisites: string[];
  directories: string[];
  evidenceKeywords: string[];
  requiresLiveProduct?: boolean;
  requiresExistingCustomers?: boolean;
  minCustomerValue?: number;
}

const ALL_MODELS: GTMBusinessModel[] = ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce', 'service', 'media'];

export const CHANNEL_RULES: ChannelRule[] = [
  { id: 'founder-outreach', name: 'Founder-led outreach', models: ['b2b_saas', 'service', 'marketplace'], motions: ['founder_led_sales', 'sales_assisted'], minHours: 3, minBudget: 0, strengths: ['Networking', 'Cold outreach'], metric: 'Qualified conversations', target: 5, prerequisites: ['A defined buyer role', 'A clear problem-led message'], directories: ['linkedin', 'wellfound-angellist', 'crunchbase'], evidenceKeywords: ['conversation', 'demo', 'outreach', 'referral', 'network'] },
  { id: 'cold-email', name: 'Targeted cold email', models: ['b2b_saas', 'service'], motions: ['founder_led_sales', 'sales_assisted'], minHours: 4, minBudget: 50, strengths: ['Writing', 'Cold outreach'], metric: 'Positive replies', target: 5, prerequisites: ['A qualified prospect list', 'A verified sending domain'], directories: ['g2', 'capterra', 'alternativeto'], evidenceKeywords: ['email', 'reply', 'inbox', 'outbound', 'prospect'], minCustomerValue: 500 },
  { id: 'linkedin', name: 'LinkedIn authority + conversations', models: ['b2b_saas', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'audience_led'], minHours: 3, minBudget: 0, strengths: ['Writing', 'Networking'], metric: 'Qualified conversations', target: 5, prerequisites: ['A founder profile aligned to the offer'], directories: ['linkedin', 'indie-hackers', 'twitter-x'], evidenceKeywords: ['linkedin', 'professional network', 'thought leadership', 'social selling'] },
  { id: 'communities', name: 'Niche communities', models: ALL_MODELS, motions: ['founder_led_sales', 'product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minHours: 3, minBudget: 0, strengths: ['Writing', 'Networking'], metric: 'Activated users', target: 10, prerequisites: ['A named community where the ICP is active'], directories: ['indie-hackers', 'hacker-news-show-hn', 'dev-to', 'reddit-r-startups-r-saas-r-entrepreneur'], evidenceKeywords: ['community', 'forum', 'reddit', 'slack', 'discord', 'group'] },
  { id: 'launch-platforms', name: 'Launch platforms', models: ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce'], motions: ['product_led', 'transactional', 'marketplace_liquidity'], minHours: 5, minBudget: 0, strengths: ['Writing', 'Design', 'Networking'], metric: 'Activated signups', target: 25, prerequisites: ['A live product', 'A working onboarding path', 'Launch-day support capacity'], directories: ['product-hunt', 'betalist', 'peerlist', 'microlaunch', 'uneed'], evidenceKeywords: ['product hunt', 'launch', 'beta', 'early adopter'], requiresLiveProduct: true },
  { id: 'content-seo', name: 'Problem-led content + SEO', models: ['b2b_saas', 'b2c_product', 'ecommerce', 'service', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minHours: 5, minBudget: 0, strengths: ['Writing', 'Coding / Technical'], metric: 'Qualified organic visits', target: 100, prerequisites: ['Searchable customer problems', 'A repeatable publishing cadence'], directories: ['dev-to', 'hackernoon', 'saashub', 'alternativeto'], evidenceKeywords: ['search', 'google', 'seo', 'organic', 'content', 'how to'] },
  { id: 'short-form-video', name: 'Short-form video', models: ['b2c_product', 'ecommerce', 'marketplace', 'media'], motions: ['transactional', 'product_led', 'audience_led', 'marketplace_liquidity'], minHours: 5, minBudget: 0, strengths: ['Speaking / Video', 'Design'], metric: 'Activated profile visits', target: 50, prerequisites: ['A visually demonstrable outcome', 'Capacity to publish at least 3 times weekly'], directories: ['product-hunt', 'reddit-r-startups-r-saas-r-entrepreneur', 'twitter-x'], evidenceKeywords: ['tiktok', 'reels', 'short video', 'youtube shorts', 'visual'] },
  { id: 'partnerships', name: 'Distribution partnerships', models: ['b2b_saas', 'marketplace', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'marketplace_liquidity', 'audience_led'], minHours: 3, minBudget: 0, strengths: ['Networking'], metric: 'Qualified partner conversations', target: 3, prerequisites: ['A clear partner benefit', 'A list of complementary businesses'], directories: ['wellfound-angellist', 'f6s', 'crunchbase'], evidenceKeywords: ['partner', 'integration', 'reseller', 'affiliate', 'ecosystem'] },
  { id: 'paid-acquisition', name: 'Paid acquisition', models: ['b2c_product', 'ecommerce', 'b2b_saas'], motions: ['transactional', 'product_led'], minHours: 3, minBudget: 500, strengths: ['Design'], metric: 'Qualified conversions', target: 20, prerequisites: ['A proven conversion event', 'Known customer value', 'Conversion tracking'], directories: [], evidenceKeywords: ['paid', 'cpc', 'cac', 'roas', 'ads', 'conversion'], requiresLiveProduct: true, minCustomerValue: 40 },
  { id: 'referrals', name: 'Customer referral loop', models: ALL_MODELS, motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minHours: 2, minBudget: 0, strengths: ['Networking', 'Design'], metric: 'Referred activated users', target: 10, prerequisites: ['Existing satisfied users', 'A reason to share'], directories: [], evidenceKeywords: ['referral', 'word of mouth', 'invite', 'recommend'], requiresExistingCustomers: true },
  { id: 'product-loop', name: 'Product-led invitation loop', models: ['b2b_saas', 'b2c_product', 'marketplace'], motions: ['product_led', 'marketplace_liquidity'], minHours: 4, minBudget: 0, strengths: ['Coding / Technical', 'Design'], metric: 'Invited activated users', target: 15, prerequisites: ['A natural collaboration or sharing moment', 'Activation analytics'], directories: [], evidenceKeywords: ['invite', 'collaborate', 'share', 'viral', 'workspace'], requiresLiveProduct: true },
  { id: 'lifecycle-email', name: 'Lifecycle email activation', models: ['b2b_saas', 'b2c_product', 'marketplace', 'ecommerce', 'media'], motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minHours: 3, minBudget: 25, strengths: ['Writing', 'Coding / Technical'], metric: 'Activated recipients', target: 20, prerequisites: ['Permissioned leads or users', 'A measurable activation event'], directories: [], evidenceKeywords: ['waitlist', 'newsletter', 'email list', 'activation', 'onboarding'], requiresLiveProduct: true },
  { id: 'affiliates', name: 'Affiliate distribution', models: ['b2b_saas', 'b2c_product', 'ecommerce', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minHours: 3, minBudget: 100, strengths: ['Networking'], metric: 'Affiliate conversions', target: 10, prerequisites: ['Trackable attribution', 'Margin for a partner commission'], directories: [], evidenceKeywords: ['affiliate', 'commission', 'creator', 'publisher'], minCustomerValue: 30 },
  { id: 'creator-partnerships', name: 'Creator and influencer partnerships', models: ['b2c_product', 'ecommerce', 'marketplace', 'media'], motions: ['product_led', 'transactional', 'marketplace_liquidity', 'audience_led'], minHours: 4, minBudget: 250, strengths: ['Networking', 'Design', 'Speaking / Video'], metric: 'Creator-attributed conversions', target: 10, prerequisites: ['A visually clear offer', 'Trackable creator links or codes'], directories: ['twitter-x'], evidenceKeywords: ['creator', 'influencer', 'youtube', 'instagram', 'audience'] },
  { id: 'webinars-events', name: 'Expert webinars and events', models: ['b2b_saas', 'service', 'media'], motions: ['founder_led_sales', 'sales_assisted', 'audience_led'], minHours: 5, minBudget: 100, strengths: ['Speaking / Video', 'Networking'], metric: 'Qualified attendees', target: 20, prerequisites: ['A teachable urgent problem', 'A follow-up path'], directories: ['linkedin'], evidenceKeywords: ['webinar', 'event', 'conference', 'workshop', 'demo'], minCustomerValue: 500 },
  { id: 'integration-marketplaces', name: 'Integration and app marketplaces', models: ['b2b_saas', 'b2c_product'], motions: ['product_led', 'sales_assisted'], minHours: 5, minBudget: 0, strengths: ['Coding / Technical', 'Networking'], metric: 'Marketplace activations', target: 15, prerequisites: ['A live integration', 'Marketplace listing eligibility'], directories: ['product-hunt', 'saashub'], evidenceKeywords: ['integration', 'app marketplace', 'plugin', 'extension', 'ecosystem'], requiresLiveProduct: true },
  { id: 'newsletter-sponsorships', name: 'Newsletter sponsorships', models: ['b2b_saas', 'b2c_product', 'ecommerce', 'media'], motions: ['product_led', 'transactional', 'audience_led'], minHours: 2, minBudget: 300, strengths: ['Writing', 'Networking'], metric: 'Qualified referred visits', target: 100, prerequisites: ['A measurable landing page', 'A newsletter with verified audience fit'], directories: [], evidenceKeywords: ['newsletter', 'sponsorship', 'subscriber', 'email audience'] },
  { id: 'retail-wholesale', name: 'Retail and wholesale distribution', models: ['ecommerce'], motions: ['transactional'], minHours: 5, minBudget: 500, strengths: ['Networking'], metric: 'Qualified buyer conversations', target: 5, prerequisites: ['Wholesale-ready margins', 'Inventory and fulfillment capacity'], directories: [], evidenceKeywords: ['retail', 'wholesale', 'stockist', 'store', 'distributor'], requiresLiveProduct: true },
];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function inferMotion(intake: GTMIntakeV2): GTMMotion {
  if (intake.businessModel === 'marketplace') return 'marketplace_liquidity';
  if (intake.businessModel === 'ecommerce') return 'transactional';
  if (intake.businessModel === 'media') return 'audience_led';
  if (intake.businessModel === 'service') return 'founder_led_sales';
  if (intake.businessModel === 'b2b_saas') return (intake.averageCustomerValue ?? 0) >= 5000 ? 'sales_assisted' : 'founder_led_sales';
  return 'product_led';
}

export function rankChannels(intake: GTMIntakeV2, context: { researchText?: string; researchSourceIds?: string[] } = {}) {
  const motion = inferMotion(intake);
  const evidenceItems = intake.firstPartyEvidence ?? [];
  const evidenceText = [intake.targetSegment, intake.buyingTrigger, intake.currentTraction, context.researchText, ...evidenceItems.map((item) => `${item.title} ${item.content}`)].filter(Boolean).join(' ').toLowerCase();
  return CHANNEL_RULES.map((rule) => {
    const matchingKeywords = rule.evidenceKeywords.filter((keyword) => evidenceText.includes(keyword.toLowerCase()));
    const taggedEvidence = evidenceItems.filter((item) => item.channelIds?.includes(rule.id));
    const sourceIds = Array.from(new Set([...taggedEvidence.map((item) => item.id), ...(context.researchSourceIds ?? [])])).slice(0, 6);
    let rejectionReason: string | undefined;
    if (!rule.models.includes(intake.businessModel)) rejectionReason = 'Does not fit this business model.';
    else if (!rule.motions.includes(motion)) rejectionReason = 'Does not fit the selected GTM motion.';
    else if (intake.weeklyTimeHours < rule.minHours) rejectionReason = `Requires at least ${rule.minHours} hours per week.`;
    else if (intake.monthlyBudget < rule.minBudget) rejectionReason = `Requires at least $${rule.minBudget} per month.`;
    else if (rule.requiresLiveProduct && intake.lifecycle !== 'live') rejectionReason = 'Requires a live product and measurable conversion path.';
    else if (rule.requiresExistingCustomers && /none|no users|pre-launch|no measured/i.test(intake.currentTraction)) rejectionReason = 'Requires existing satisfied customers or users.';
    else if (rule.minCustomerValue && (intake.averageCustomerValue ?? intake.averageOrderValue ?? 0) < rule.minCustomerValue) rejectionReason = `Requires customer value of at least $${rule.minCustomerValue}.`;

    const customerValue = intake.averageCustomerValue ?? intake.averageOrderValue ?? 0;
    const economicsKnown = customerValue > 0 || Boolean(intake.pricing?.trim());
    const tractionLower = intake.currentTraction.toLowerCase();
    const hasMeasuredTraction = !/none|no users|pre-launch|no measured/i.test(tractionLower) && /\d|customer|user|revenue|reply|demo|sale|subscriber|conversion/i.test(tractionLower);
    const channelMentioned = [rule.id, rule.name, ...rule.evidenceKeywords].some((value) => tractionLower.includes(value.toLowerCase()));
    const strengthMatches = rule.strengths.filter((strength) => intake.founderStrengths.includes(strength));
    const breakdown = {
      audienceEvidence: clamp(35 + (intake.buyingTrigger?.trim() ? 10 : 0) + (intake.buyerRole?.trim() ? 5 : 0) + Math.min(30, matchingKeywords.length * 8) + (taggedEvidence.length > 0 ? 10 : 0)),
      motionEconomicsFit: clamp((rule.motions.includes(motion) ? 55 : 20) + (rule.models.includes(intake.businessModel) ? 15 : 0) + (economicsKnown ? 10 : 0) + (!rule.minCustomerValue || customerValue >= rule.minCustomerValue ? 10 : 0)),
      tractionEvidence: clamp(20 + (hasMeasuredTraction ? 20 : 0) + (channelMentioned ? 25 : 0) + (taggedEvidence.some((item) => item.kind === 'traction') ? 20 : 0)),
      founderConstraints: clamp(35 + Math.min(35, Math.max(0, intake.weeklyTimeHours - rule.minHours) * 6) + (intake.monthlyBudget >= rule.minBudget ? 20 : 0) + (rule.minBudget === 0 ? 10 : 0)),
      founderStrengths: clamp(strengthMatches.length > 1 ? 95 : strengthMatches.length === 1 ? 80 : 45),
    };
    const raw = breakdown.audienceEvidence * .25 + breakdown.motionEconomicsFit * .25 + breakdown.tractionEvidence * .2 + breakdown.founderConstraints * .15 + breakdown.founderStrengths * .15;
    const scoreEvidence = {
      audienceEvidence: { explanation: matchingKeywords.length ? `Matched buyer evidence: ${matchingKeywords.slice(0, 4).join(', ')}.` : 'No channel-specific buyer-location evidence was found.', sourceIds },
      motionEconomicsFit: { explanation: `${rule.name} is ${rule.motions.includes(motion) ? 'compatible' : 'not compatible'} with the ${motion.replaceAll('_', ' ')} motion${economicsKnown ? ' and supplied economics' : '; economics remain incomplete'}.`, sourceIds: taggedEvidence.map((item) => item.id) },
      tractionEvidence: { explanation: channelMentioned ? 'Founder traction is attributable to this channel.' : hasMeasuredTraction ? 'Measured traction exists but is not attributable to this channel.' : 'No measured channel evidence exists yet.', sourceIds: taggedEvidence.map((item) => item.id) },
      founderConstraints: { explanation: `Requires ${rule.minHours} hours/week and $${rule.minBudget}/month against ${intake.weeklyTimeHours} hours and $${intake.monthlyBudget}.`, sourceIds: [] },
      founderStrengths: { explanation: strengthMatches.length ? `Matched strengths: ${strengthMatches.join(', ')}.` : 'No declared strength directly supports this channel.', sourceIds: [] },
    };
    return { rule, eligible: !rejectionReason, rejectionReason, score: rejectionReason ? Math.min(clamp(raw), 49) : clamp(raw), breakdown, scoreEvidence };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}
