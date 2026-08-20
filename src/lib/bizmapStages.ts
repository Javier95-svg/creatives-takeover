import { Bot, Boxes, Compass, FlaskConical, Globe, Layers, Rocket, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getFounderTool } from '../config/founderToolCatalog.ts';

export const BIZMAP_STAGE_ORDER = [
  'IDENTITY',
  'PROTOTYPE',
  'VALIDATING',
  'BUILDING',
  'LAUNCH',
  'TRACTION',
  'FUNDRAISING',
] as const;

export type BizMapStage = (typeof BIZMAP_STAGE_ORDER)[number];

export interface BizMapToolDefinition {
  id: string;
  name: string;
  route: string;
  stage: BizMapStage;
  description: string;
  icon: LucideIcon;
  beta?: boolean;
}

export interface BizMapStageDefinition {
  id: BizMapStage;
  order: number;
  numeral: string;
  title: string;
  description: string;
  tools: BizMapToolDefinition[];
}

export interface StageTaskTemplate {
  id: string;
  stage: BizMapStage;
  title: string;
  priority: 'high' | 'medium' | 'low';
  route: string;
}

export const DEFAULT_CURRENT_STAGE: BizMapStage = 'IDENTITY';
export const DEFAULT_HIGHEST_UNLOCKED_STAGE: BizMapStage = 'PROTOTYPE';
export const PMF_REQUIRED_SIGNALS = 25;

export const BIZMAP_TOOLS: BizMapToolDefinition[] = [
  {
    id: 'icp-builder',
    name: getFounderTool('icp_builder').name,
    route: getFounderTool('icp_builder').route,
    stage: 'IDENTITY',
    description: getFounderTool('icp_builder').purpose,
    icon: Target,
  },
  {
    id: 'waitlist-maker',
    name: getFounderTool('demo_studio').name,
    route: getFounderTool('demo_studio').route,
    stage: 'PROTOTYPE',
    description: getFounderTool('demo_studio').purpose,
    icon: Layers,
  },
  {
    id: 'pmf-lab',
    name: getFounderTool('pmf_lab').name,
    route: getFounderTool('pmf_lab').route,
    stage: 'VALIDATING',
    description: getFounderTool('pmf_lab').purpose,
    icon: FlaskConical,
  },
  {
    id: 'mvp-builder',
    name: getFounderTool('mvp_builder').name,
    route: getFounderTool('mvp_builder').route,
    stage: 'BUILDING',
    description: getFounderTool('mvp_builder').purpose,
    icon: Rocket,
  },
  {
    id: 'tech-stack',
    name: getFounderTool('tech_stack').name,
    route: getFounderTool('tech_stack').route,
    stage: 'BUILDING',
    description: getFounderTool('tech_stack').purpose,
    icon: Boxes,
  },
  {
    id: 'gtm-strategist',
    name: getFounderTool('gtm_strategist').name,
    route: getFounderTool('gtm_strategist').route,
    stage: 'LAUNCH',
    description: getFounderTool('gtm_strategist').purpose,
    icon: Globe,
  },
  {
    id: 'traction-growth',
    name: getFounderTool('traction_engine').name,
    route: getFounderTool('traction_engine').route,
    stage: 'TRACTION',
    description: getFounderTool('traction_engine').purpose,
    icon: Globe,
  },
  {
    id: 'vc-search',
    name: getFounderTool('vc_search').name,
    route: getFounderTool('vc_search').route,
    stage: 'FUNDRAISING',
    description: getFounderTool('vc_search').purpose,
    icon: Target,
  },
  {
    id: 'accelerator-hunt',
    name: getFounderTool('accelerator_hunt').name,
    route: getFounderTool('accelerator_hunt').route,
    stage: 'FUNDRAISING',
    description: getFounderTool('accelerator_hunt').purpose,
    icon: Rocket,
  },
  {
    id: 'pitch-deck-analyzer',
    name: getFounderTool('pitch_deck_analyzer').name,
    route: getFounderTool('pitch_deck_analyzer').route,
    stage: 'FUNDRAISING',
    description: getFounderTool('pitch_deck_analyzer').purpose,
    icon: Layers,
  },
  {
    id: 'launch-directories',
    name: getFounderTool('directories').name,
    route: getFounderTool('directories').route,
    stage: 'LAUNCH',
    description: getFounderTool('directories').purpose,
    icon: Compass,
  },
];

export const BIZMAP_STAGES: BizMapStageDefinition[] = [
  {
    id: 'IDENTITY',
    order: 1,
    numeral: 'I',
    title: 'IDENTITY',
    description: 'Define exactly who you serve and why they care.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'IDENTITY'),
  },
  {
    id: 'PROTOTYPE',
    order: 2,
    numeral: 'II',
    title: 'PROTOTYPE',
    description: 'Create a prototype landing narrative and collect demand signals.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'PROTOTYPE'),
  },
  {
    id: 'VALIDATING',
    order: 3,
    numeral: 'III',
    title: 'VALIDATION',
    description: 'Run validation loops and gather enough evidence to proceed.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'VALIDATING'),
  },
  {
    id: 'BUILDING',
    order: 4,
    numeral: 'IV',
    title: 'BUILDING',
    description: 'Approve an evidence-backed MVP scope and prepare a build-ready execution plan.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'BUILDING'),
  },
  {
    id: 'LAUNCH',
    order: 5,
    numeral: 'V',
    title: 'LAUNCH',
    description: 'Build the GTM system and move from product to traction.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'LAUNCH'),
  },
  {
    id: 'TRACTION',
    order: 6,
    numeral: 'VI',
    title: 'TRACTION',
    description: 'Turn launch activity into repeatable acquisition, retention, and revenue signals.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'TRACTION'),
  },
  {
    id: 'FUNDRAISING',
    order: 7,
    numeral: 'VII',
    title: 'FUNDRAISING',
    description: 'Prepare the investor narrative, target list, and data room for the raise.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'FUNDRAISING'),
  },
];

export const STAGE_TASKS: Record<BizMapStage, StageTaskTemplate[]> = {
  IDENTITY: [
    { id: 'identity-icp-profile', stage: 'IDENTITY', title: 'Complete and save your ICP profile', priority: 'high', route: '/icp-builder' },
    { id: 'identity-top-pains', stage: 'IDENTITY', title: 'List top 3 customer pains and urgency level', priority: 'high', route: '/icp-builder' },
    { id: 'identity-segments', stage: 'IDENTITY', title: 'Select target industries and buyer persona', priority: 'medium', route: '/icp-builder' },
  ],
  PROTOTYPE: [
    { id: 'prototype-value-prop', stage: 'PROTOTYPE', title: 'Write a one-line value proposition for the waitlist page', priority: 'high', route: '/demo-studio' },
    { id: 'prototype-page-copy', stage: 'PROTOTYPE', title: 'Draft hero copy and core benefits', priority: 'medium', route: '/demo-studio' },
    { id: 'prototype-publish', stage: 'PROTOTYPE', title: 'Publish your waitlist and get one signup (or mark it ready)', priority: 'high', route: '/demo-studio' },
  ],
  VALIDATING: [
    { id: 'validating-checklist', stage: 'VALIDATING', title: 'Save PMF validation checklist', priority: 'high', route: '/pmf-lab' },
    { id: 'validating-interviews', stage: 'VALIDATING', title: `Capture at least ${PMF_REQUIRED_SIGNALS} interviews or surveys`, priority: 'high', route: '/pmf-lab' },
    { id: 'validating-hypothesis', stage: 'VALIDATING', title: 'Define your top PMF hypotheses and risks', priority: 'medium', route: '/pmf-lab' },
  ],
  BUILDING: [
    { id: 'building-scope', stage: 'BUILDING', title: 'Save MVP scope and product spec', priority: 'high', route: '/mvp-builder' },
    { id: 'building-stack', stage: 'BUILDING', title: 'Save Tech Stack recommendation', priority: 'high', route: '/tech-stack' },
    { id: 'building-estimate', stage: 'BUILDING', title: 'Estimate budget and build timeline', priority: 'medium', route: '/mvp-builder' },
  ],
  LAUNCH: [
    { id: 'launch-channels', stage: 'LAUNCH', title: 'Define first distribution channels', priority: 'high', route: '/go-to-market' },
    { id: 'launch-checklist', stage: 'LAUNCH', title: 'Save launch checklist and KPIs', priority: 'medium', route: '/go-to-market' },
    { id: 'launch-plan-export', stage: 'LAUNCH', title: 'Save/export GTM plan', priority: 'high', route: '/go-to-market' },
  ],
  TRACTION: [
    { id: 'traction-channel-test', stage: 'TRACTION', title: 'Choose one acquisition channel to test this week', priority: 'high', route: '/insighta' },
    { id: 'traction-retention-review', stage: 'TRACTION', title: 'Review first-month retention and activation drop-off', priority: 'high', route: '/core-metrics' },
    { id: 'traction-revenue-funnel', stage: 'TRACTION', title: 'Map the revenue funnel from visitor to paid customer', priority: 'medium', route: '/go-to-market' },
    { id: 'traction-growth-experiment', stage: 'TRACTION', title: 'Launch one measurable growth experiment', priority: 'high', route: '/insighta' },
  ],
  FUNDRAISING: [
    { id: 'fundraising-pitch-deck', stage: 'FUNDRAISING', title: 'Review your pitch deck narrative', priority: 'high', route: '/pitch-deck-analyzer' },
    { id: 'fundraising-investor-list', stage: 'FUNDRAISING', title: 'Build a target investor list', priority: 'high', route: '/vc-search' },
    { id: 'fundraising-accelerator-shortlist', stage: 'FUNDRAISING', title: 'Shortlist accelerator programs that fit your stage', priority: 'medium', route: '/accelerator-hunt' },
    { id: 'fundraising-traction-story', stage: 'FUNDRAISING', title: 'Write the traction story investors should remember', priority: 'high', route: '/go-to-market' },
    { id: 'fundraising-data-room', stage: 'FUNDRAISING', title: 'Prepare a lightweight data room checklist', priority: 'medium', route: '/vc-search' },
  ],
};

export type OnboardingBizMapStageSelection =
  | 'stage_i'
  | 'stage_ii'
  | 'stage_iii';

export function getStageIndex(stage: BizMapStage): number {
  return BIZMAP_STAGE_ORDER.indexOf(stage);
}

export function getStageByOrder(order: number): BizMapStage {
  return BIZMAP_STAGE_ORDER[Math.max(0, Math.min(order, BIZMAP_STAGE_ORDER.length - 1))];
}

export function isStageUnlocked(stage: BizMapStage, highestUnlockedStage: BizMapStage): boolean {
  return getStageIndex(stage) <= getStageIndex(highestUnlockedStage);
}

export function maxStage(a: BizMapStage, b: BizMapStage): BizMapStage {
  return getStageIndex(a) >= getStageIndex(b) ? a : b;
}

export function minStage(a: BizMapStage, b: BizMapStage): BizMapStage {
  return getStageIndex(a) <= getStageIndex(b) ? a : b;
}

export function getNextStage(stage: BizMapStage): BizMapStage | null {
  const index = getStageIndex(stage);
  if (index === -1 || index === BIZMAP_STAGE_ORDER.length - 1) return null;
  return BIZMAP_STAGE_ORDER[index + 1];
}

export function getPreviousStage(stage: BizMapStage): BizMapStage | null {
  const index = getStageIndex(stage);
  if (index <= 0) return null;
  return BIZMAP_STAGE_ORDER[index - 1];
}

// Routes that belong to a stage but are not the stage's BIZMAP_TOOLS entry
// (the TRACTION tool points at /insighta, while the working surface lives at
// /traction-engine).
const EXTRA_STAGE_ROUTES: Record<string, BizMapStage> = {
  '/traction-engine': 'TRACTION',
};

export function getStageByRoute(route: string): BizMapStage | null {
  const tool = BIZMAP_TOOLS.find((item) => item.route === route);
  return tool?.stage ?? EXTRA_STAGE_ROUTES[route] ?? null;
}

export function getToolByRoute(route: string): BizMapToolDefinition | null {
  return BIZMAP_TOOLS.find((item) => item.route === route) ?? null;
}

export function getRequiredUnlockMessage(stage: BizMapStage): string {
  const previous = getPreviousStage(stage);
  if (!previous) return 'This stage is available.';

  const previousDefinition = BIZMAP_STAGES.find((item) => item.id === previous);
  return `Complete Stage ${previousDefinition?.numeral ?? ''} (${previousDefinition?.title ?? previous}) to unlock this stage.`;
}

export function onboardingSelectionToProgress(selection: OnboardingBizMapStageSelection): {
  currentStage: BizMapStage;
  highestUnlockedStage: BizMapStage;
} {
  switch (selection) {
    case 'stage_i':
      return { currentStage: 'IDENTITY', highestUnlockedStage: 'PROTOTYPE' };
    case 'stage_ii':
      return { currentStage: 'PROTOTYPE', highestUnlockedStage: 'PROTOTYPE' };
    case 'stage_iii':
      return { currentStage: 'BUILDING', highestUnlockedStage: 'BUILDING' };
    default:
      return { currentStage: DEFAULT_CURRENT_STAGE, highestUnlockedStage: DEFAULT_HIGHEST_UNLOCKED_STAGE };
  }
}

export const BUSINESS_PLANNER_RESOURCE_ITEM = {
  name: 'Business Planner',
  route: '/bizmap-ai',
  description: 'Guided startup development cycle and founder workflow',
  icon: Bot,
};
