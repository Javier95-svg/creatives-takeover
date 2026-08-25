import { BIZMAP_STAGE_ORDER, type BizMapStage } from './bizmapStages.ts';

export const OPERATING_STAGE_ORDER = BIZMAP_STAGE_ORDER.filter(
  (stage) => stage !== 'FUNDRAISING',
) as Exclude<BizMapStage, 'FUNDRAISING'>[];

export type FundraisingOverlayStatus = 'not_eligible' | 'eligible' | 'preparing' | 'outreach_ready';

export interface JourneyOutcomeSignal {
  tool: string;
  artifact_type?: string;
  quality_checks?: Record<string, unknown> | null;
  status: string;
  completed_at?: string | null;
  verified_at?: string | null;
  reviewed_at?: string | null;
  updated_at?: string | null;
}

export interface FounderProgressEvidence {
  outcomes: readonly JourneyOutcomeSignal[];
  firstCustomerSprintCompletedAt: string | null;
  fundraisingReadinessCompletedAt: string | null;
  pitchDeckCompletedAt: string | null;
  savedInvestorCount: number;
}

export interface DerivedFounderProgress {
  completedAt: Record<BizMapStage, string | null>;
  currentStage: Exclude<BizMapStage, 'FUNDRAISING'>;
  highestUnlockedStage: Exclude<BizMapStage, 'FUNDRAISING'>;
  fundraisingOverlay: {
    eligible: boolean;
    status: FundraisingOverlayStatus;
    readinessCompletedAt: string | null;
    pitchDeckCompletedAt: string | null;
    savedInvestorCount: number;
  };
}

const READY_STATUSES = new Set(['ready', 'verified', 'reviewed']);
const VERIFIED_STATUSES = new Set(['verified', 'reviewed']);

function outcomeDate(outcomes: readonly JourneyOutcomeSignal[], tool: string, statuses: Set<string>) {
  const candidate = outcomes.find((outcome) => outcome.tool === tool && statuses.has(outcome.status));
  return candidate?.reviewed_at ?? candidate?.verified_at ?? candidate?.completed_at ?? candidate?.updated_at ?? null;
}

function firstCustomerProofDate(outcomes: readonly JourneyOutcomeSignal[]) {
  const candidate = outcomes.find((outcome) => outcome.tool === 'gtm_strategist'
    && outcome.artifact_type === 'first_customer_proof'
    && outcome.quality_checks?.buyerProofEarned === true
    && READY_STATUSES.has(outcome.status));
  return candidate?.reviewed_at ?? candidate?.verified_at ?? candidate?.completed_at ?? candidate?.updated_at ?? null;
}

/** Pure, shared completion evaluator. Draft artifacts never complete a stage. */
export function deriveFounderProgress(evidence: FounderProgressEvidence): DerivedFounderProgress {
  const identity = outcomeDate(evidence.outcomes, 'icp_builder', READY_STATUSES);
  const prototype = outcomeDate(evidence.outcomes, 'demo_studio', READY_STATUSES);
  const validating = outcomeDate(evidence.outcomes, 'pmf_lab', READY_STATUSES);
  const building = outcomeDate(evidence.outcomes, 'mvp_builder', READY_STATUSES);
  const launch = firstCustomerProofDate(evidence.outcomes);
  const traction = outcomeDate(evidence.outcomes, 'traction_engine', VERIFIED_STATUSES);

  const completedAt: Record<BizMapStage, string | null> = {
    IDENTITY: identity,
    PROTOTYPE: prototype,
    VALIDATING: validating,
    BUILDING: building,
    LAUNCH: launch,
    TRACTION: traction,
    // Capital work is an overlay; it never completes or advances the operating journey.
    FUNDRAISING: null,
  };

  const firstIncompleteIndex = OPERATING_STAGE_ORDER.findIndex((stage) => !completedAt[stage]);
  const currentIndex = firstIncompleteIndex === -1
    ? OPERATING_STAGE_ORDER.length - 1
    : firstIncompleteIndex;
  const currentStage = OPERATING_STAGE_ORDER[currentIndex];
  const highestUnlockedStage = currentStage;
  const eligible = Boolean(traction);
  const status: FundraisingOverlayStatus = !eligible
    ? 'not_eligible'
    : evidence.savedInvestorCount > 0
      ? 'outreach_ready'
      : evidence.pitchDeckCompletedAt || evidence.fundraisingReadinessCompletedAt
        ? 'preparing'
        : 'eligible';

  return {
    completedAt,
    currentStage,
    highestUnlockedStage,
    fundraisingOverlay: {
      eligible,
      status,
      readinessCompletedAt: evidence.fundraisingReadinessCompletedAt,
      pitchDeckCompletedAt: evidence.pitchDeckCompletedAt,
      savedInvestorCount: evidence.savedInvestorCount,
    },
  };
}
