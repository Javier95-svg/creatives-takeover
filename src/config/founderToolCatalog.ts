import type { FeatureKey } from './planPermissions.ts';

export type FounderProductArea = 'bizmap' | 'insighta';
export type FounderToolRole = 'core' | 'support';

export type FounderJourneyStage =
  | 'IDENTITY'
  | 'PROTOTYPE'
  | 'VALIDATING'
  | 'BUILDING'
  | 'LAUNCH'
  | 'TRACTION'
  | 'FUNDRAISING';

export interface FounderToolDefinition {
  key: string;
  productArea: FounderProductArea;
  stage: FounderJourneyStage;
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  role: FounderToolRole;
  name: string;
  route: string;
  purpose: string;
  promisedArtifact: string;
  responsibleOutcome: string;
  entitlement: FeatureKey;
  analyticsKey: string;
}

export const FOUNDER_TOOL_CATALOG = [
  {
    key: 'icp_builder',
    productArea: 'bizmap',
    stage: 'IDENTITY',
    stageNumber: 1,
    role: 'core',
    name: 'ICP Builder',
    route: '/icp-builder',
    purpose: 'Define your ideal customer and the pain you solve.',
    promisedArtifact: 'Falsifiable customer decision',
    responsibleOutcome: 'Commit to one buyer, urgent pain, trigger, alternative, disqualifier, and three reachable example accounts.',
    entitlement: 'icp_builder',
    analyticsKey: 'icp_builder',
  },
  {
    key: 'demo_studio',
    productArea: 'bizmap',
    stage: 'PROTOTYPE',
    stageNumber: 2,
    role: 'core',
    name: 'Demo Studio',
    route: '/demo-studio',
    purpose: 'Create and publish your demand-capture page.',
    promisedArtifact: 'Published interactive proof page',
    responsibleOutcome: 'Publish one buyer-testable promise with a working CTA and measurement.',
    entitlement: 'demo_studio',
    analyticsKey: 'demo_studio',
  },
  {
    key: 'pmf_lab',
    productArea: 'bizmap',
    stage: 'VALIDATING',
    stageNumber: 3,
    role: 'core',
    name: 'PMF Lab',
    route: '/pmf-lab',
    purpose: 'Validate assumptions with evidence and interviews.',
    promisedArtifact: 'PMF decision report',
    responsibleOutcome: 'Reach a Build, Narrow, Pivot, or Stop decision from at least three independent buyer signals and one documented objection.',
    entitlement: 'pmf_lab',
    analyticsKey: 'pmf_lab',
  },
  {
    key: 'mvp_builder',
    productArea: 'bizmap',
    stage: 'BUILDING',
    stageNumber: 4,
    role: 'core',
    name: 'MVP Builder',
    route: '/mvp-builder',
    purpose: 'Build the product your ICP asked for.',
    promisedArtifact: 'Published working MVP',
    responsibleOutcome: 'Put one sellable customer workflow live with one instrumented success event.',
    entitlement: 'mvp_builder',
    analyticsKey: 'mvp_builder',
  },
  {
    key: 'tech_stack',
    productArea: 'bizmap',
    stage: 'BUILDING',
    stageNumber: 4,
    role: 'support',
    name: 'Tech Stack Builder',
    route: '/tech-stack',
    purpose: 'Pick your tools and get the budget.',
    promisedArtifact: 'Saved technology and budget plan',
    responsibleOutcome: 'Understand what to use, what it costs, and how to assemble it without blocking the MVP milestone.',
    entitlement: 'tech_stack',
    analyticsKey: 'tech_stack',
  },
  {
    key: 'gtm_strategist',
    productArea: 'bizmap',
    stage: 'LAUNCH',
    stageNumber: 5,
    role: 'core',
    name: 'GTM Strategist',
    route: '/go-to-market',
    purpose: 'Design one measurable acquisition cycle.',
    promisedArtifact: 'Pre-registered acquisition play',
    responsibleOutcome: 'Define one ICP, offer, channel, ten-prospect sample, success threshold, and kill rule for execution.',
    entitlement: 'gtm_strategist',
    analyticsKey: 'gtm_strategist',
  },
  {
    key: 'first_customer_sprint',
    productArea: 'bizmap',
    stage: 'LAUNCH',
    stageNumber: 5,
    role: 'core',
    name: 'First Customer Sprint',
    route: '/first-customer-sprint',
    purpose: 'Execute the acquisition play against qualified prospects.',
    promisedArtifact: 'Completed buyer-facing acquisition cycle',
    responsibleOutcome: 'Send ten founder-controlled messages and make a buyer-backed advance, repeat, loop-back, or pause decision.',
    entitlement: 'gtm_strategist',
    analyticsKey: 'first_customer_sprint',
  },
  {
    key: 'directories',
    productArea: 'bizmap',
    stage: 'LAUNCH',
    stageNumber: 5,
    role: 'support',
    name: 'Directories',
    route: '/directories',
    purpose: 'Browse the best places to submit your launch.',
    promisedArtifact: 'Attributed distribution shortlist',
    responsibleOutcome: 'Create measurable launch traffic and signups without blocking the Launch milestone.',
    entitlement: 'directories',
    analyticsKey: 'directories',
  },
  {
    key: 'traction_engine',
    productArea: 'insighta',
    stage: 'TRACTION',
    stageNumber: 6,
    role: 'core',
    name: 'Traction Engine',
    route: '/traction-engine',
    purpose: 'Track weekly growth and retention signals.',
    promisedArtifact: 'Comparable acquisition-cycle ledger',
    responsibleOutcome: 'Repeat the same ICP, offer, and channel in a second cycle and verify at least one qualified buyer signal.',
    entitlement: 'gtm_strategist',
    analyticsKey: 'traction_engine',
  },
  {
    key: 'insighta_test',
    productArea: 'insighta',
    stage: 'FUNDRAISING',
    stageNumber: 7,
    role: 'core',
    name: 'Fundraising Readiness',
    route: '/insighta-test',
    purpose: 'Measure your fundraising readiness.',
    promisedArtifact: 'Fundraising readiness diagnostic',
    responsibleOutcome: 'Know whether to strengthen traction, improve the deck, or begin targeted outreach.',
    entitlement: 'insighta_test',
    analyticsKey: 'insighta_test',
  },
  {
    key: 'pitch_deck_analyzer',
    productArea: 'insighta',
    stage: 'FUNDRAISING',
    stageNumber: 7,
    role: 'core',
    name: 'Pitch Deck Analyzer',
    route: '/pitch-deck-analyzer',
    purpose: 'Analyze your pitch deck.',
    promisedArtifact: 'Prioritized pitch deck analysis',
    responsibleOutcome: 'Enter investor conversations with a clearer, evidence-supported deck without implying funding is guaranteed.',
    entitlement: 'pitch_deck_analyzer',
    analyticsKey: 'pitch_deck_analyzer',
  },
  {
    key: 'vc_search',
    productArea: 'insighta',
    stage: 'FUNDRAISING',
    stageNumber: 7,
    role: 'core',
    name: 'VC Search',
    route: '/vc-search',
    purpose: 'Browse venture capital firms.',
    promisedArtifact: 'Target investor shortlist',
    responsibleOutcome: 'Spend outreach effort on better-fit investors without promising introductions or capital.',
    entitlement: 'vc_search_browse',
    analyticsKey: 'vc_search',
  },
  {
    key: 'accelerator_hunt',
    productArea: 'insighta',
    stage: 'FUNDRAISING',
    stageNumber: 7,
    role: 'support',
    name: 'Accelerator Hunt',
    route: '/accelerator-hunt',
    purpose: 'Find programs that fit your stage.',
    promisedArtifact: 'Target accelerator shortlist',
    responsibleOutcome: 'Focus applications on programs with credible founder and company fit.',
    entitlement: 'accelerator_browse',
    analyticsKey: 'accelerator_hunt',
  },
  {
    key: 'email_templates',
    productArea: 'insighta',
    stage: 'FUNDRAISING',
    stageNumber: 7,
    role: 'support',
    name: 'Email Templates',
    route: '/email-templates',
    purpose: 'Reach out smartly.',
    promisedArtifact: 'Ready-to-personalize outreach',
    responsibleOutcome: 'Start clearer fundraising conversations without promising replies or meetings.',
    entitlement: 'email_templates',
    analyticsKey: 'email_templates',
  },
] as const satisfies readonly FounderToolDefinition[];

export type FounderToolKey = (typeof FOUNDER_TOOL_CATALOG)[number]['key'];

export const FOUNDER_TOOLS_BY_KEY = Object.fromEntries(
  FOUNDER_TOOL_CATALOG.map((tool) => [tool.key, tool]),
) as Record<FounderToolKey, (typeof FOUNDER_TOOL_CATALOG)[number]>;

export const FOUNDER_TOOLS_BY_ROUTE = Object.fromEntries(
  FOUNDER_TOOL_CATALOG.map((tool) => [tool.route, tool]),
) as Record<string, (typeof FOUNDER_TOOL_CATALOG)[number]>;

export function getFounderTool(key: FounderToolKey) {
  return FOUNDER_TOOLS_BY_KEY[key];
}

export function getFounderToolsForProduct(productArea: FounderProductArea) {
  return FOUNDER_TOOL_CATALOG.filter((tool) => tool.productArea === productArea);
}

export function getFounderToolsForStage(stage: FounderJourneyStage) {
  return FOUNDER_TOOL_CATALOG.filter((tool) => tool.stage === stage);
}

/** The guided journey only renders tools a founder must use to earn a stage outcome. */
export function getCoreFounderToolsForStage(stage: FounderJourneyStage) {
  return getFounderToolsForStage(stage).filter((tool) => tool.role === 'core');
}

export function getCoreFounderToolsForProduct(productArea: FounderProductArea) {
  return getFounderToolsForProduct(productArea).filter((tool) => tool.role === 'core');
}
