import type { BizMapStage } from '@/lib/bizmapStages';

export const ACTIVATION_JOURNEY_KEY = 'activationJourney';
export const ROOKIE_WELCOME_PREVIEW_PATH = '/community/angels?preview=rookie-welcome';

export type ActivationEntryStage = 'stage_i' | 'stage_ii' | 'stage_iii';
export type ActivationStatus = 'not_started' | 'in_progress' | 'completed_first_output';

export interface ActivationJourneyState {
  entryStage: ActivationEntryStage;
  status: ActivationStatus;
  startRoute: string;
  nextRoute: string;
  firstOutputLabel: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface ToolJourneyGuide {
  stageLabel: string;
  title: string;
  description: string;
  doneLabel: string;
  nextRoute: string;
  nextLabel: string;
  completedLabel: string;
}

export function getActivationEntryStageStartRoute(entryStage: ActivationEntryStage): string {
  switch (entryStage) {
    case 'stage_i':
      return '/icp-builder';
    case 'stage_ii':
      return '/waitlist';
    case 'stage_iii':
      return '/pmf-lab';
    default:
      return '/icp-builder';
  }
}

export function getActivationEntryStageNextRoute(entryStage: ActivationEntryStage): string {
  switch (entryStage) {
    case 'stage_i':
      return '/waitlist';
    case 'stage_ii':
      return '/pmf-lab';
    case 'stage_iii':
      return '/mvp-builder';
    default:
      return '/waitlist';
  }
}

export function getActivationEntryStageFirstOutputLabel(entryStage: ActivationEntryStage): string {
  switch (entryStage) {
    case 'stage_i':
      return 'a saved ICP decision';
    case 'stage_ii':
      return 'a saved waitlist draft';
    case 'stage_iii':
      return 'saved PMF evidence';
    default:
      return 'a saved first output';
  }
}

export function getActivationEntryStageFromBizMapStage(stage: BizMapStage): ActivationEntryStage {
  switch (stage) {
    case 'IDENTITY':
      return 'stage_i';
    case 'PROTOTYPE':
      return 'stage_ii';
    default:
      return 'stage_iii';
  }
}

export function getToolJourneyGuide(route: string): ToolJourneyGuide | null {
  switch (route) {
    case '/icp-builder':
      return {
        stageLabel: 'Stage I · Identity',
        title: 'Reach the aha moment with a saved ICP',
        description: 'Use this tool to land on one clear customer segment instead of leaving with broad ideas.',
        doneLabel: 'Done means running the analysis and saving a recommended first ICP you can act on.',
        nextRoute: '/waitlist',
        nextLabel: 'Next: Draft your waitlist page',
        completedLabel: 'ICP saved. Your next move is turning that segment into a demand test.',
      };
    case '/waitlist':
      return {
        stageLabel: 'Stage II · Prototype',
        title: 'Turn your ICP into a real demand test',
        description: 'The goal here is not polish. It is leaving with a waitlist page you can save, share, and iterate on.',
        doneLabel: 'Done means saving a waitlist draft or publishing a page you can start sending to real users.',
        nextRoute: '/pmf-lab',
        nextLabel: 'Next: Validate the demand signals',
        completedLabel: 'Waitlist draft saved. Use PMF Lab to judge whether the demand is strong enough to keep building.',
      };
    case '/pmf-lab':
      return {
        stageLabel: 'Stage III · Validation',
        title: 'Validate before you commit to building',
        description: 'Bring your interviews, waitlist signals, and evidence into one place before you scope an MVP.',
        doneLabel: 'Done means saving PMF evidence or a PMF report with enough real signals to justify the next step.',
        nextRoute: '/mvp-builder',
        nextLabel: 'Next: Scope the MVP',
        completedLabel: 'Validation saved. If the evidence is strong, you can move into MVP scoping with less guesswork.',
      };
    default:
      return null;
  }
}

export function getDefaultActivationJourney(entryStage: ActivationEntryStage, now = new Date().toISOString()): ActivationJourneyState {
  return {
    entryStage,
    status: 'in_progress',
    startRoute: getActivationEntryStageStartRoute(entryStage),
    nextRoute: getActivationEntryStageNextRoute(entryStage),
    firstOutputLabel: getActivationEntryStageFirstOutputLabel(entryStage),
    startedAt: now,
    completedAt: null,
  };
}

export function readActivationJourneyFromPreferences(value: unknown): ActivationJourneyState | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const activation = record[ACTIVATION_JOURNEY_KEY];
  if (!activation || typeof activation !== 'object') return null;

  const candidate = activation as Record<string, unknown>;
  const entryStage = candidate.entryStage;
  const status = candidate.status;

  if (
    entryStage !== 'stage_i' &&
    entryStage !== 'stage_ii' &&
    entryStage !== 'stage_iii'
  ) {
    return null;
  }

  if (
    status !== 'not_started' &&
    status !== 'in_progress' &&
    status !== 'completed_first_output'
  ) {
    return null;
  }

  return {
    entryStage,
    status,
    startRoute: typeof candidate.startRoute === 'string' ? candidate.startRoute : getActivationEntryStageStartRoute(entryStage),
    nextRoute: typeof candidate.nextRoute === 'string' ? candidate.nextRoute : getActivationEntryStageNextRoute(entryStage),
    firstOutputLabel:
      typeof candidate.firstOutputLabel === 'string'
        ? candidate.firstOutputLabel
        : getActivationEntryStageFirstOutputLabel(entryStage),
    startedAt: typeof candidate.startedAt === 'string' ? candidate.startedAt : null,
    completedAt: typeof candidate.completedAt === 'string' ? candidate.completedAt : null,
  };
}

export function mergeActivationJourneyIntoPreferences(
  existingPreferences: unknown,
  activationJourney: ActivationJourneyState,
): Record<string, unknown> {
  const base =
    existingPreferences && typeof existingPreferences === 'object'
      ? { ...(existingPreferences as Record<string, unknown>) }
      : {};

  return {
    ...base,
    [ACTIVATION_JOURNEY_KEY]: activationJourney,
  };
}

export function shouldUseActivationStartRoute(returnUrl: string): boolean {
  return returnUrl === '/dashboard' || returnUrl === ROOKIE_WELCOME_PREVIEW_PATH;
}
