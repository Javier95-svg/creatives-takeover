import { BIZMAP_STAGES, BIZMAP_STAGE_ORDER, type BizMapStage } from './bizmapStages.ts';
import type { FoundationalMilestone, ToolCompletionSignals } from './taskCalendar.ts';

export interface TractionJourneySignal {
  latestScore: number | null;
  previousScore?: number | null;
  weekStartDate: string | null;
  phaseSevenReady: boolean;
  updatedAt: string | null;
}

export interface DemoStudioJourneySignal {
  projectName: string | null;
  publishedDemoCount: number;
  signupCount?: number | null;
  updatedAt: string | null;
}

export interface PmfJourneySignal {
  latestScore: number | null;
  scoredAt: string | null;
}

export interface FundraisingActivitySignal {
  viewsThisMonth: number;
}

export interface PitchDeckJourneySignal {
  overallScore: number | null;
  verdict: string | null;
  createdAt: string | null;
}

export interface MvpPublishedJourneySignal {
  subdomainSlug: string | null;
  deploymentUrl: string | null;
  updatedAt: string | null;
}

export interface FounderJourneyExtras {
  traction: TractionJourneySignal | null;
  demoStudio: DemoStudioJourneySignal | null;
  pmf: PmfJourneySignal | null;
  pitchDeck: PitchDeckJourneySignal | null;
  mvpPublished: MvpPublishedJourneySignal | null;
  fundraisingActivity: FundraisingActivitySignal | null;
}

export const EMPTY_FOUNDER_JOURNEY_EXTRAS: FounderJourneyExtras = {
  traction: null,
  demoStudio: null,
  pmf: null,
  pitchDeck: null,
  mvpPublished: null,
  fundraisingActivity: null,
};

export type JourneyStageStatus = 'complete' | 'current' | 'upcoming';
export type JourneyToolStatus = 'done' | 'started' | 'not_started';

export interface JourneyStageNode {
  stage: BizMapStage;
  numeral: string;
  title: string;
  status: JourneyStageStatus;
  hasActivity: boolean;
  route: string;
}

export interface JourneyToolTile {
  key: string;
  label: string;
  stage: BizMapStage;
  isCurrentStage: boolean;
  status: JourneyToolStatus;
  outputLine: string;
  highlight: string | null;
  route: string;
  updatedAt: string | null;
}

export interface JourneyNextAction {
  key: string;
  label: string;
  route: string;
}

export interface FounderJourneySnapshot {
  stages: JourneyStageNode[];
  tools: JourneyToolTile[];
  nextAction: JourneyNextAction | null;
  stagesCompleted: number;
  progressPercent: number;
  isEmpty: boolean;
  lastTouched: { label: string; route: string; updatedAt: string } | null;
}

export interface StageCompletionState {
  completed: boolean;
  completedAt: string | null;
}

export interface BuildFounderJourneyInputs {
  currentStage: BizMapStage;
  stageState: Partial<Record<BizMapStage, StageCompletionState>>;
  toolSignals: ToolCompletionSignals;
  extras: FounderJourneyExtras;
  foundationalMilestones: FoundationalMilestone[];
}

function stagePrimaryRoute(stage: BizMapStage): string {
  const definition = BIZMAP_STAGES.find((entry) => entry.id === stage);
  return definition?.tools[0]?.route ?? '/bizmap-ai';
}

function stageHasActivity(
  stage: BizMapStage,
  toolSignals: ToolCompletionSignals,
  extras: FounderJourneyExtras,
): boolean {
  switch (stage) {
    case 'IDENTITY':
      return Boolean(toolSignals.icpCompleted);
    case 'PROTOTYPE':
      return Boolean(toolSignals.waitlistCompleted || extras.demoStudio);
    case 'VALIDATING':
      return Boolean(toolSignals.pmfCompleted || extras.pmf);
    case 'BUILDING':
      return Boolean(toolSignals.mvpCompleted || toolSignals.techStackCompleted || extras.mvpPublished);
    case 'LAUNCH':
      return Boolean(toolSignals.gtmCompleted);
    case 'TRACTION':
      return Boolean(extras.traction);
    case 'FUNDRAISING':
      return Boolean(extras.pitchDeck || (extras.fundraisingActivity?.viewsThisMonth ?? 0) > 0);
    default:
      return false;
  }
}

function buildStages(inputs: BuildFounderJourneyInputs): JourneyStageNode[] {
  const { currentStage, stageState, extras, toolSignals } = inputs;

  return BIZMAP_STAGE_ORDER.map((stage) => {
    const definition = BIZMAP_STAGES.find((entry) => entry.id === stage);
    // Traction completion is display-only here: derived from Phase-7 readiness,
    // never written back to user_progress (useBizMapProgress owns writes).
    const completed = Boolean(
      stageState[stage]?.completed || (stage === 'TRACTION' && extras.traction?.phaseSevenReady),
    );

    return {
      stage,
      numeral: definition?.numeral ?? '',
      title: definition?.title ?? stage,
      status: completed ? 'complete' : stage === currentStage ? 'current' : 'upcoming',
      hasActivity: stageHasActivity(stage, toolSignals, extras),
      route: stagePrimaryRoute(stage),
    } satisfies JourneyStageNode;
  });
}

function formatDeckLine(pitchDeck: PitchDeckJourneySignal): string {
  if (pitchDeck.overallScore == null) return 'Pitch deck analyzed';
  const verdict = pitchDeck.verdict ? ` — ${pitchDeck.verdict}` : '';
  return `Deck score ${pitchDeck.overallScore}${verdict}`;
}

function formatSignupSuffix(signupCount: number | null | undefined): string {
  if (!signupCount || signupCount <= 0) return '';
  return ` · ${signupCount} signup${signupCount === 1 ? '' : 's'}`;
}

type JourneyToolTileDraft = Omit<JourneyToolTile, 'stage' | 'isCurrentStage'>;

const TILE_STAGES: Record<string, BizMapStage> = {
  'icp-builder': 'IDENTITY',
  'demo-studio': 'PROTOTYPE',
  'pmf-lab': 'VALIDATING',
  'mvp-builder': 'BUILDING',
  'gtm-strategist': 'LAUNCH',
  'traction-engine': 'TRACTION',
  'pitch-deck-analyzer': 'FUNDRAISING',
};

function buildTools(inputs: BuildFounderJourneyInputs): JourneyToolTile[] {
  const { toolSignals, extras, stageState } = inputs;
  const { traction, demoStudio, pmf, pitchDeck, mvpPublished, fundraisingActivity } = extras;

  const demoTile: JourneyToolTileDraft = (() => {
    const base = {
      key: 'demo-studio',
      label: 'Demo Studio',
      highlight: null,
      route: '/demo-studio',
      updatedAt: demoStudio?.updatedAt ?? stageState.PROTOTYPE?.completedAt ?? null,
    };
    const signupSuffix = formatSignupSuffix(demoStudio?.signupCount);
    if (demoStudio && demoStudio.publishedDemoCount > 0) {
      const count = demoStudio.publishedDemoCount;
      return {
        ...base,
        status: 'done' as const,
        outputLine: `${count} published demo${count === 1 ? '' : 's'}${signupSuffix}`,
      };
    }
    if (toolSignals.waitlistCompleted) {
      return { ...base, status: 'done' as const, outputLine: `Demand page live${signupSuffix}` };
    }
    if (demoStudio) {
      return { ...base, status: 'started' as const, outputLine: 'Demo project in progress' };
    }
    return { ...base, status: 'not_started' as const, outputLine: 'Publish a demo or waitlist page' };
  })();

  const mvpTile: JourneyToolTileDraft = (() => {
    const base = {
      key: 'mvp-builder',
      label: 'MVP Builder',
      highlight: null,
      route: '/mvp-builder',
      updatedAt: mvpPublished?.updatedAt ?? stageState.BUILDING?.completedAt ?? null,
    };
    if (mvpPublished) {
      return {
        ...base,
        status: 'done' as const,
        outputLine: mvpPublished.subdomainSlug
          ? `Live at ${mvpPublished.subdomainSlug}.creatives-takeover.com`
          : 'MVP site published',
      };
    }
    if (toolSignals.mvpCompleted && toolSignals.techStackCompleted) {
      return { ...base, status: 'done' as const, outputLine: 'MVP scope + tech stack saved' };
    }
    if (toolSignals.mvpCompleted) {
      return { ...base, status: 'done' as const, outputLine: 'MVP scope saved' };
    }
    if (toolSignals.techStackCompleted) {
      return { ...base, status: 'started' as const, outputLine: 'Tech stack saved — scope your MVP' };
    }
    return { ...base, status: 'not_started' as const, outputLine: 'Scope your MVP build' };
  })();

  const tractionDelta =
    traction && traction.latestScore != null && traction.previousScore != null
      ? traction.latestScore - traction.previousScore
      : null;
  const tractionTile: JourneyToolTileDraft = {
    key: 'traction-engine',
    label: 'Traction Engine',
    status: traction?.phaseSevenReady ? 'done' : traction ? 'started' : 'not_started',
    outputLine:
      traction && traction.latestScore != null
        ? `Traction score ${traction.latestScore}`
        : traction
          ? 'Weekly traction log started'
          : 'Log your first traction week',
    highlight: traction?.phaseSevenReady
      ? 'Phase 7 ready'
      : tractionDelta != null
        ? `${tractionDelta >= 0 ? '+' : ''}${tractionDelta} vs last week`
        : null,
    route: '/traction-engine',
    updatedAt: traction?.updatedAt ?? null,
  };

  const drafts: JourneyToolTileDraft[] = [
    {
      key: 'icp-builder',
      label: 'ICP Builder',
      status: toolSignals.icpCompleted ? 'done' : 'not_started',
      outputLine: toolSignals.icpCompleted ? 'ICP profile saved' : 'Define who you serve',
      highlight: null,
      route: '/icp-builder',
      updatedAt: stageState.IDENTITY?.completedAt ?? null,
    },
    demoTile,
    {
      key: 'pmf-lab',
      label: 'PMF Lab',
      status: toolSignals.pmfCompleted ? 'done' : 'not_started',
      outputLine:
        pmf?.latestScore != null
          ? `PMF score ${pmf.latestScore}`
          : toolSignals.pmfCompleted
            ? 'Validation evidence captured'
            : 'Capture validation evidence',
      highlight: null,
      route: '/pmf-lab',
      updatedAt: pmf?.scoredAt ?? stageState.VALIDATING?.completedAt ?? null,
    },
    mvpTile,
    {
      key: 'gtm-strategist',
      label: 'GTM Strategist',
      status: toolSignals.gtmCompleted ? 'done' : 'not_started',
      outputLine: toolSignals.gtmCompleted ? 'GTM plan saved' : 'Plan your go-to-market',
      highlight: null,
      route: '/go-to-market',
      updatedAt: stageState.LAUNCH?.completedAt ?? null,
    },
    tractionTile,
    {
      key: 'pitch-deck-analyzer',
      label: 'Fundraising prep',
      status: pitchDeck ? 'done' : 'not_started',
      outputLine: pitchDeck ? formatDeckLine(pitchDeck) : 'Analyze your pitch deck',
      highlight:
        fundraisingActivity && fundraisingActivity.viewsThisMonth > 0
          ? `${fundraisingActivity.viewsThisMonth} investor look${fundraisingActivity.viewsThisMonth === 1 ? '' : 's'} this month`
          : null,
      route: '/pitch-deck-analyzer',
      updatedAt: pitchDeck?.createdAt ?? null,
    },
  ];

  return drafts.map((draft) => {
    const stage = TILE_STAGES[draft.key] ?? 'IDENTITY';
    return { ...draft, stage, isCurrentStage: stage === inputs.currentStage };
  });
}

function buildNextAction(inputs: BuildFounderJourneyInputs): JourneyNextAction | null {
  const firstIncompleteFoundation = inputs.foundationalMilestones.find((milestone) => !milestone.completed);
  if (firstIncompleteFoundation) {
    return {
      key: firstIncompleteFoundation.key,
      label: firstIncompleteFoundation.title,
      route: firstIncompleteFoundation.route,
    };
  }
  if (!inputs.extras.traction?.phaseSevenReady) {
    return { key: 'traction-weekly-log', label: "Log this week's traction", route: '/traction-engine' };
  }
  if (!inputs.extras.pitchDeck) {
    return { key: 'pitch-deck-analysis', label: 'Analyze your pitch deck', route: '/pitch-deck-analyzer' };
  }
  return null;
}

export function buildFounderJourneySnapshot(inputs: BuildFounderJourneyInputs): FounderJourneySnapshot {
  const stages = buildStages(inputs);
  const tools = buildTools(inputs);

  const stagesCompleted = stages.filter((node) => node.status === 'complete').length;
  const isEmpty =
    !Object.values(inputs.toolSignals).some(Boolean) &&
    !inputs.extras.traction &&
    !inputs.extras.demoStudio &&
    !inputs.extras.pmf &&
    !inputs.extras.pitchDeck &&
    !inputs.extras.mvpPublished;

  const lastTouched = tools
    .filter((tile): tile is JourneyToolTile & { updatedAt: string } => Boolean(tile.updatedAt))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((tile) => ({ label: tile.label, route: tile.route, updatedAt: tile.updatedAt }))[0] ?? null;

  return {
    stages,
    tools,
    nextAction: buildNextAction(inputs),
    stagesCompleted,
    progressPercent: Math.round((stagesCompleted / stages.length) * 100),
    isEmpty,
    lastTouched,
  };
}
