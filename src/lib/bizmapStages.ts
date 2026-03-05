import { Boxes, Compass, FlaskConical, Globe, Layers, Rocket, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const BIZMAP_STAGE_ORDER = [
  'IDENTITY',
  'PROTOTYPE',
  'VALIDATING',
  'BUILDING',
  'LAUNCH',
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
export const PMF_REQUIRED_SIGNALS = 5;

export const BIZMAP_TOOLS: BizMapToolDefinition[] = [
  {
    id: 'icp-builder',
    name: 'ICP Builder',
    route: '/icp-builder',
    stage: 'IDENTITY',
    description: 'Define your ideal customer profile and the pain point you are gonna solve.',
    icon: Target,
  },
  {
    id: 'waitlist-maker',
    name: 'Waitlist Maker',
    route: '/waitlist',
    stage: 'PROTOTYPE',
    description: 'Create and publish your demand-capture landing page.',
    icon: Layers,
  },
  {
    id: 'pmf-lab',
    name: 'PMF Lab',
    route: '/pmf-lab',
    stage: 'VALIDATING',
    description: 'Validate assumptions with evidence and interview signals.',
    icon: FlaskConical,
  },
  {
    id: 'mvp-builder',
    name: 'MVP Builder',
    route: '/mvp-builder',
    stage: 'BUILDING',
    description: 'Scope your MVP delivery plan and saved build spec.',
    icon: Rocket,
    beta: true,
  },
  {
    id: 'tech-stack',
    name: 'Tech Stack',
    route: '/tech-stack',
    stage: 'BUILDING',
    description: 'Choose and save your technical stack strategy.',
    icon: Boxes,
  },
  {
    id: 'gtm-strategist',
    name: 'GTM Strategist',
    route: '/go-to-market',
    stage: 'LAUNCH',
    description: 'Generate and save/export your go-to-market plan.',
    icon: Globe,
  },
  {
    id: 'launch-directories',
    name: 'Directories',
    route: '/directories',
    stage: 'LAUNCH',
    description: 'Find the best platforms to submit and promote your product launch.',
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
    title: 'VALIDATING',
    description: 'Run validation loops and gather enough evidence to proceed.',
    tools: BIZMAP_TOOLS.filter((tool) => tool.stage === 'VALIDATING'),
  },
  {
    id: 'BUILDING',
    order: 4,
    numeral: 'IV',
    title: 'BUILDING',
    description: 'Lock scope, lock stack, and prepare a build-ready execution plan.',
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
];

export const STAGE_TASKS: Record<BizMapStage, StageTaskTemplate[]> = {
  IDENTITY: [
    { id: 'identity-icp-profile', stage: 'IDENTITY', title: 'Complete and save your ICP profile', priority: 'high', route: '/icp-builder' },
    { id: 'identity-top-pains', stage: 'IDENTITY', title: 'List top 3 customer pains and urgency level', priority: 'high', route: '/icp-builder' },
    { id: 'identity-segments', stage: 'IDENTITY', title: 'Select target industries and buyer persona', priority: 'medium', route: '/icp-builder' },
  ],
  PROTOTYPE: [
    { id: 'prototype-value-prop', stage: 'PROTOTYPE', title: 'Write a one-line value proposition for the waitlist page', priority: 'high', route: '/waitlist' },
    { id: 'prototype-page-copy', stage: 'PROTOTYPE', title: 'Draft hero copy and core benefits', priority: 'medium', route: '/waitlist' },
    { id: 'prototype-publish', stage: 'PROTOTYPE', title: 'Publish your waitlist and get one signup (or mark it ready)', priority: 'high', route: '/waitlist' },
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
};

export type OnboardingBizMapStageSelection =
  | 'stage_i'
  | 'stage_ii';

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

export function getStageByRoute(route: string): BizMapStage | null {
  const tool = BIZMAP_TOOLS.find((item) => item.route === route);
  return tool?.stage ?? null;
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
    default:
      return { currentStage: DEFAULT_CURRENT_STAGE, highestUnlockedStage: DEFAULT_HIGHEST_UNLOCKED_STAGE };
  }
}
