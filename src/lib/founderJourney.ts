import { BIZMAP_STAGES, BIZMAP_STAGE_ORDER, type BizMapStage } from './bizmapStages.ts';
import type { FoundationalMilestone, ToolCompletionSignals } from './taskCalendar.ts';
import type { OnboardingContextV1 } from './onboardingContext.ts';
import type { JourneyOutcomeStatus, JourneyTool } from './journeyOutcomes.ts';
import { STARTUP_STAGE_EXECUTION_LOOPS, type EvidenceLevel, type ExperimentResult, type FounderExecutionLoop } from './marketExperiment.ts';

export interface FounderJourneyOutcomeSignal {
  artifactId: string;
  status: JourneyOutcomeStatus;
  verificationMode: string;
  validationContextId: string | null;
  updatedAt: string;
}

export interface CTVerificationClaimSignal {
  id: string;
  sourceTool: JourneyTool | null;
  claim: string;
  claimType: string;
  evidenceLevel: EvidenceLevel;
  result: ExperimentResult;
  status: 'pending' | 'verified' | 'rejected' | 'expired' | 'legacy';
  missingEvidence: string[];
  nextAction: string | null;
  unlockedBenefit: string | null;
  updatedAt: string;
}

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
  outcomes: Partial<Record<JourneyTool, FounderJourneyOutcomeSignal>>;
  verificationClaims: CTVerificationClaimSignal[];
}

export const EMPTY_FOUNDER_JOURNEY_EXTRAS: FounderJourneyExtras = {
  traction: null,
  demoStudio: null,
  pmf: null,
  pitchDeck: null,
  mvpPublished: null,
  fundraisingActivity: null,
  outcomes: {},
  verificationClaims: [],
};

export type JourneyStageStatus = 'complete' | 'current' | 'upcoming';
export type JourneyToolStatus = 'done' | 'started' | 'not_started';

export interface JourneyStageNode {
  stage: BizMapStage;
  numeral: string;
  title: string;
  status: JourneyStageStatus;
  optional: boolean;
  hasActivity: boolean;
  route: string;
  executionLoop: FounderExecutionLoop;
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
  role: 'core' | 'support' | 'fundraising';
  outcomeStatus: JourneyOutcomeStatus | null;
  verificationMode: string | null;
  contextId: string | null;
  ctClaim: CTVerificationClaimSignal | null;
}

export interface JourneyNextAction {
  key: string;
  label: string;
  route: string;
  reason: string;
  expectedEvidence: string;
  artifactId: string | null;
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
  onboardingContext?: OnboardingContextV1 | null;
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
    // The legacy score remains supporting context. It can only complete the
    // display stage when at least one acquisition claim is independently CT Verified.
    const hasVerifiedAcquisition = extras.verificationClaims.some((claim) => (
      claim.evidenceLevel === 'ct_verified'
      && ['acquisition_execution', 'repeatable_channel'].includes(claim.claimType)
    ));
    const completed = Boolean(
      stageState[stage]?.completed || (stage === 'TRACTION' && extras.traction?.phaseSevenReady && hasVerifiedAcquisition),
    );

    return {
      stage,
      numeral: definition?.numeral ?? '',
      title: definition?.title ?? stage,
      status: completed ? 'complete' : stage === currentStage ? 'current' : 'upcoming',
      optional: stage === 'FUNDRAISING',
      hasActivity: stageHasActivity(stage, toolSignals, extras),
      route: stagePrimaryRoute(stage),
      executionLoop: STARTUP_STAGE_EXECUTION_LOOPS[stage],
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

type JourneyToolTileDraft = Omit<JourneyToolTile, 'stage' | 'isCurrentStage' | 'role' | 'outcomeStatus' | 'verificationMode' | 'contextId' | 'ctClaim'>;

const TILE_STAGES: Record<string, BizMapStage> = {
  'icp-builder': 'IDENTITY',
  'demo-studio': 'PROTOTYPE',
  'pmf-lab': 'VALIDATING',
  'mvp-builder': 'BUILDING',
  'gtm-strategist': 'LAUNCH',
  'traction-engine': 'TRACTION',
  'pitch-deck-analyzer': 'FUNDRAISING',
  'tech-stack': 'BUILDING',
  directories: 'LAUNCH',
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
      key: 'tech-stack',
      label: 'Tech Stack Builder',
      status: toolSignals.techStackCompleted ? 'done' : 'not_started',
      outputLine: toolSignals.techStackCompleted ? 'Optional stack review saved' : 'Review compatibility, costs, rollout, and risks',
      highlight: 'Optional support',
      route: '/tech-stack',
      updatedAt: null,
    },
    {
      key: 'directories',
      label: 'Directories',
      status: 'not_started',
      outputLine: 'Attribute directory submissions to your GTM play',
      highlight: 'Optional support',
      route: '/directories',
      updatedAt: null,
    },
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
    const outcomeKey = draft.key.replaceAll('-', '_') as keyof FounderJourneyExtras['outcomes'];
    const outcome = inputs.extras.outcomes[outcomeKey];
    const ctClaim = inputs.extras.verificationClaims.find((claim) => claim.sourceTool === outcomeKey) ?? null;
    return {
      ...draft,
      stage,
      isCurrentStage: stage === inputs.currentStage,
      role: ['tech-stack', 'directories'].includes(draft.key)
        ? 'support'
        : stage === 'FUNDRAISING' ? 'fundraising' : 'core',
      outcomeStatus: outcome?.status ?? null,
      verificationMode: outcome?.verificationMode ?? null,
      contextId: outcome?.validationContextId ?? null,
      ctClaim,
    };
  });
}

function buildNextAction(inputs: BuildFounderJourneyInputs): JourneyNextAction | null {
  if (
    inputs.onboardingContext
    && !Object.values(inputs.toolSignals).some(Boolean)
  ) {
    const firstActionByIntent: Record<OnboardingContextV1['selectedIntent'], JourneyNextAction> = {
      find_mentor: { key: 'intent:find-mentor', label: 'Find one mentor', route: '/mentorship?mentorSource=onboarding', reason: 'You chose expert support as your first step.', expectedEvidence: 'One relevant mentor saved or contacted', artifactId: null },
      build_demo: { key: 'intent:build-demo', label: 'Build your first demo', route: '/demo-studio/try', reason: 'A testable prototype is the fastest next proof.', expectedEvidence: 'A published demo with one measurable CTA', artifactId: null },
      run_icp: { key: 'intent:run-icp', label: 'Define your first ICP', route: '/icp-builder?mode=fast', reason: 'Your first customer must be specific before testing demand.', expectedEvidence: 'A saved customer decision brief', artifactId: null },
      start_validation: { key: 'intent:start-validation', label: 'Validate one idea', route: '/decision-sprint', reason: 'Customer evidence is the next uncertainty to reduce.', expectedEvidence: 'A customer conversation or costly commitment', artifactId: null },
      build_mvp: { key: 'intent:build-mvp', label: 'Scope your MVP', route: '/mvp-scope', reason: 'You selected building as your immediate goal.', expectedEvidence: 'One customer, one job, and no more than three essential features', artifactId: null },
      plan_gtm: { key: 'intent:plan-gtm', label: 'Create your GTM plan', route: '/go-to-market', reason: 'A focused acquisition play is your next operating step.', expectedEvidence: 'One primary channel, target, asset, and kill rule', artifactId: null },
      log_traction: { key: 'intent:log-traction', label: "Log this week's traction", route: '/traction-engine', reason: 'Weekly evidence turns launch activity into a decision.', expectedEvidence: 'An attributed weekly traction log', artifactId: null },
      analyze_pitch_deck: { key: 'intent:analyze-deck', label: 'Analyze your pitch deck', route: '/pitch-deck-analyzer', reason: 'You selected fundraising narrative as the current gap.', expectedEvidence: 'A deck analysis with resolved actions', artifactId: null },
      unlock_pitch_deck: { key: 'intent:unlock-deck', label: 'Resume your pitch analysis', route: '/pitch-deck-analyzer?hydrate=1', reason: 'An unfinished pitch artifact is ready to continue.', expectedEvidence: 'A saved deck analysis', artifactId: null },
      unlock_tech_stack: { key: 'intent:unlock-stack', label: 'Resume your tech stack', route: '/tech-stack?hydrate=1', reason: 'Your optional stack review is unfinished.', expectedEvidence: 'A costed compatibility and rollout report', artifactId: null },
      unlock_insighta: { key: 'intent:unlock-insighta', label: 'Finish your diagnostic', route: '/insighta-test?hydrate=1', reason: 'Your fundraising readiness answers can be restored.', expectedEvidence: 'A readiness result with one routed next action', artifactId: null },
      save_mentor: { key: 'intent:save-mentor', label: 'Save one mentor', route: '/mentorship?mentorSource=onboarding', reason: 'You chose a human support action.', expectedEvidence: 'One relevant mentor saved', artifactId: null },
      send_message: { key: 'intent:send-message', label: 'Start one conversation', route: '/mentorship?mentorSource=onboarding', reason: 'A real conversation is the next useful signal.', expectedEvidence: 'One founder or mentor conversation started', artifactId: null },
      book_call: { key: 'intent:book-call', label: 'Message one mentor', route: '/mentorship?mentorSource=onboarding&activationIntent=send_message', reason: 'A mentor conversation can unblock the current decision.', expectedEvidence: 'One mentor conversation requested', artifactId: null },
    };
    return firstActionByIntent[inputs.onboardingContext.selectedIntent];
  }

  const currentStageIndex = BIZMAP_STAGE_ORDER.indexOf(inputs.currentStage);
  const firstIncompleteFoundation = inputs.foundationalMilestones.find((milestone) => (
    !milestone.completed
    && BIZMAP_STAGE_ORDER.indexOf(milestone.stage) >= currentStageIndex
  )) ?? inputs.foundationalMilestones.find((milestone) => !milestone.completed);
  if (firstIncompleteFoundation) {
    return {
      key: firstIncompleteFoundation.key,
      label: firstIncompleteFoundation.title,
      route: firstIncompleteFoundation.route,
      reason: `This is the next incomplete core outcome in your ${inputs.currentStage.toLowerCase()} stage.`,
      expectedEvidence: firstIncompleteFoundation.description ?? firstIncompleteFoundation.title,
      artifactId: null,
    };
  }
  const hasVerifiedAcquisition = inputs.extras.verificationClaims.some((claim) => (
    claim.evidenceLevel === 'ct_verified'
    && ['acquisition_execution', 'repeatable_channel'].includes(claim.claimType)
  ));
  if (!inputs.extras.traction?.phaseSevenReady || !hasVerifiedAcquisition) {
    return { key: 'traction-weekly-log', label: "Evaluate this week's acquisition evidence", route: '/traction-engine', reason: 'Your core pathway needs a pre-registered sample, observed result, and explicit decision.', expectedEvidence: 'One metric-level acquisition claim with its denominator, source, threshold, and decision', artifactId: inputs.extras.outcomes.traction_engine?.artifactId ?? null };
  }
  return null;
}

export function buildFounderJourneySnapshot(inputs: BuildFounderJourneyInputs): FounderJourneySnapshot {
  const stages = buildStages(inputs);
  const tools = buildTools(inputs);

  const requiredStages = stages.filter((node) => !node.optional);
  const stagesCompleted = requiredStages.filter((node) => node.status === 'complete').length;
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
    progressPercent: Math.round((stagesCompleted / requiredStages.length) * 100),
    isEmpty,
    lastTouched,
  };
}
