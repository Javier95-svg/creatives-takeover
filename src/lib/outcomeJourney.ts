export const OUTCOME_JOURNEY_CONTRACT_VERSION = 'outcome_journey_v1' as const;

export const OUTCOME_JOURNEY_STAGE_KEYS = [
  'target',
  'proof',
  'validate',
  'deliver',
  'acquire',
  'repeat',
  'capital',
] as const;

export type OutcomeJourneyStageKey = (typeof OUTCOME_JOURNEY_STAGE_KEYS)[number];
export type JourneyArtifactState = 'missing' | 'draft' | 'usable' | 'published';
export type JourneyOutcomeState = 'not_started' | 'in_progress' | 'achieved' | 'verified';
export type JourneyTransitionDecision = 'advance' | 'repeat' | 'loop_back' | 'pause' | 'close';

export interface FounderOutcomeJourney {
  id: string;
  user_id: string;
  cohort_key: string;
  contract_version: string;
  entry_stage: OutcomeJourneyStageKey;
  current_stage: OutcomeJourneyStageKey;
  status: 'active' | 'paused' | 'completed' | 'closed';
  entry_evidence: Record<string, unknown>;
  acquisition_source: string | null;
  capital_eligible_at: string | null;
  started_at: string;
}

export interface OutcomeJourneyStageRun {
  id: string;
  journey_id: string;
  user_id: string;
  stage: OutcomeJourneyStageKey;
  attempt_number: number;
  source_tool: string | null;
  artifact_state: JourneyArtifactState;
  outcome_state: JourneyOutcomeState;
  transition_decision: JourneyTransitionDecision | null;
  next_stage: OutcomeJourneyStageKey | null;
  branch_reason: string | null;
  evidence_summary: Record<string, unknown>;
  entered_at: string;
  first_action_at: string | null;
  transition_offered_at: string | null;
  transition_started_at: string | null;
  artifact_usable_at: string | null;
  outcome_achieved_at: string | null;
  outcome_verified_at: string | null;
  exited_at: string | null;
}

export interface OutcomeJourneySnapshot {
  version: 1;
  journey: FounderOutcomeJourney | null;
  stageRuns: OutcomeJourneyStageRun[];
}

export interface OutcomeJourneyContract {
  stage: OutcomeJourneyStageKey;
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  coreTool: string;
  route: string;
  outcome: string;
  observableMinimum: readonly string[];
}

export const OUTCOME_JOURNEY_CONTRACTS: Record<OutcomeJourneyStageKey, OutcomeJourneyContract> = {
  target: {
    stage: 'target', stageNumber: 1, label: 'Target', coreTool: 'icp_builder', route: '/icp-builder',
    outcome: 'Commit to one falsifiable ICP and three reachable example accounts.',
    observableMinimum: ['buyer_role', 'company_type', 'urgent_pain', 'buying_trigger', 'current_alternative', 'non_fit_segment', 'three_reachable_accounts'],
  },
  proof: {
    stage: 'proof', stageNumber: 2, label: 'Proof', coreTool: 'demo_studio', route: '/demo-studio',
    outcome: 'Publish one buyer-testable promise with a working CTA and measurement.',
    observableMinimum: ['public_url', 'buyer_promise', 'interactive_proof', 'single_cta', 'analytics'],
  },
  validate: {
    stage: 'validate', stageNumber: 3, label: 'Validate', coreTool: 'pmf_lab', route: '/pmf-lab',
    outcome: 'Make a Build, Narrow, Pivot, or Stop decision from three independent buyer signals.',
    observableMinimum: ['decision', 'three_independent_signals', 'documented_objection', 'source_provenance'],
  },
  deliver: {
    stage: 'deliver', stageNumber: 4, label: 'Deliver', coreTool: 'mvp_builder', route: '/mvp-builder',
    outcome: 'Put one sellable customer workflow live with one measurable success event.',
    observableMinimum: ['one_customer', 'one_job', 'live_url', 'smoke_test', 'success_event'],
  },
  acquire: {
    stage: 'acquire', stageNumber: 5, label: 'Acquire', coreTool: 'first_customer_sprint', route: '/first-customer-sprint',
    outcome: 'Complete one pre-registered acquisition cycle and make a buyer-backed decision.',
    observableMinimum: ['one_icp', 'one_offer', 'one_channel', 'ten_prospects', 'ten_messages', 'cycle_decision'],
  },
  repeat: {
    stage: 'repeat', stageNumber: 6, label: 'Repeat', coreTool: 'traction_engine', route: '/traction-engine',
    outcome: 'Generate a qualified buyer signal from the same acquisition motion in two separate cycles.',
    observableMinimum: ['two_comparable_cycles', 'buyer_signal_each_cycle', 'one_verified_signal'],
  },
  capital: {
    stage: 'capital', stageNumber: 7, label: 'Capital', coreTool: 'insighta_test', route: '/insighta-test',
    outcome: 'Make a defensible raise-now or keep-proving decision from verified traction and runway.',
    observableMinimum: ['verified_repeatable_demand', 'runway', 'capital_need', 'raise_decision'],
  },
};

export interface OutcomeEvidenceInventory {
  eligibleForFirstCustomerSprint?: boolean;
  specificTarget: boolean;
  liveBuyerProof: boolean;
  qualifiedBuyerEvidence: boolean;
  measurableSuccessEvent: boolean;
  completedAcquisitionCycle: boolean;
  repeatedDemand: boolean;
  verifiedRepeatableDemand?: boolean;
  wantsToRaise?: boolean;
}

/** Selects the earliest missing business outcome, not the earliest unused tool. */
export function assessOutcomeJourneyEntry(input: OutcomeEvidenceInventory): OutcomeJourneyStageKey {
  if (input.verifiedRepeatableDemand && input.wantsToRaise) return 'capital';
  if (input.repeatedDemand) return 'repeat';
  // The concierge cohort already has a sellable product. Its urgent missing
  // outcome is acquisition, even when its earlier evidence lives outside CT.
  if (input.eligibleForFirstCustomerSprint && !input.completedAcquisitionCycle) return 'acquire';
  if (!input.specificTarget) return 'target';
  if (!input.liveBuyerProof) return 'proof';
  if (!input.qualifiedBuyerEvidence) return 'validate';
  if (!input.measurableSuccessEvent) return 'deliver';
  if (!input.completedAcquisitionCycle) return 'acquire';
  return 'repeat';
}

export interface AcquisitionCycleEvidence {
  prospects: number;
  messagesSent: number;
  replies: number;
  conversations: number;
  commitments: number;
  payments: number;
  finalDecision?: 'continue' | 'narrow_segment' | 'change_offer' | 'change_message' | 'change_channel' | 'pivot' | 'pause' | null;
  decisionNotes?: string | null;
}

export interface JourneyTransitionResult {
  outcomeState: JourneyOutcomeState;
  decision: JourneyTransitionDecision | null;
  nextStage: OutcomeJourneyStageKey | null;
  reason: string;
  hasBuyerSignal: boolean;
}

export function evaluateAcquisitionCycle(input: AcquisitionCycleEvidence): JourneyTransitionResult {
  const hasBuyerSignal = input.replies > 0 || input.conversations > 0 || input.commitments > 0 || input.payments > 0;
  if (input.prospects < 10) {
    return { outcomeState: 'in_progress', decision: null, nextStage: 'acquire', reason: 'Attach 10 qualified prospects.', hasBuyerSignal };
  }
  if (input.messagesSent < 10) {
    return { outcomeState: 'in_progress', decision: null, nextStage: 'acquire', reason: 'Send 10 founder-controlled messages.', hasBuyerSignal };
  }
  if (hasBuyerSignal) {
    return { outcomeState: 'achieved', decision: 'advance', nextStage: 'repeat', reason: 'A qualified buyer signal is ready to repeat.', hasBuyerSignal: true };
  }
  const hasDecision = Boolean(input.finalDecision && input.decisionNotes?.trim());
  if (!hasDecision) {
    return { outcomeState: 'in_progress', decision: null, nextStage: 'acquire', reason: 'Record the evidence-backed cycle decision.', hasBuyerSignal: false };
  }
  if (input.finalDecision === 'pivot' || input.finalDecision === 'narrow_segment') {
    return { outcomeState: 'achieved', decision: 'loop_back', nextStage: input.finalDecision === 'narrow_segment' ? 'target' : 'validate', reason: 'The evidence invalidated an upstream assumption.', hasBuyerSignal: false };
  }
  if (input.finalDecision === 'pause') {
    return { outcomeState: 'achieved', decision: 'pause', nextStage: null, reason: 'The founder paused after completing the acquisition sample.', hasBuyerSignal: false };
  }
  return { outcomeState: 'achieved', decision: 'repeat', nextStage: 'acquire', reason: 'Revise one offer, message, or channel variable and run another cycle.', hasBuyerSignal: false };
}

export interface DemandCycle {
  audience: string;
  offer: string;
  channel: string;
  qualifiedBuyerSignals: number;
  verificationModes: readonly string[];
}

const normalizeMotionValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function evaluateRepeatableDemand(cycles: readonly DemandCycle[]) {
  const signalCycles = cycles.filter((cycle) => cycle.qualifiedBuyerSignals > 0);
  const grouped = new Map<string, DemandCycle[]>();
  for (const cycle of signalCycles) {
    const key = [cycle.audience, cycle.offer, cycle.channel].map(normalizeMotionValue).join('|');
    grouped.set(key, [...(grouped.get(key) ?? []), cycle]);
  }
  const repeated = [...grouped.values()].find((group) => group.length >= 2) ?? [];
  const verified = repeated.some((cycle) => cycle.verificationModes.some((mode) => mode === 'platform_verified' || mode === 'reviewer_verified'));
  return {
    achieved: repeated.length >= 2 && verified,
    verified: repeated.length >= 2 && verified,
    patternDetected: repeated.length >= 2,
    comparableCycleCount: repeated.length,
    missingEvidence: repeated.length < 2
      ? 'Run the same ICP, offer, and channel in a second acquisition cycle.'
      : verified
        ? null
        : 'Submit one buyer signal for platform or reviewer verification.',
  };
}

export const LEGACY_ACTIVATION_STAGE: Record<string, OutcomeJourneyStageKey> = {
  run_icp: 'target',
  build_demo: 'proof',
  publish_proof: 'proof',
  start_validation: 'validate',
  build_mvp: 'deliver',
  plan_gtm: 'acquire',
  first_customer_sprint: 'acquire',
  log_traction: 'repeat',
  analyze_pitch_deck: 'capital',
  unlock_pitch_deck: 'capital',
  unlock_insighta: 'capital',
};

export function stageForLegacyActivationIntent(intent: unknown): OutcomeJourneyStageKey | null {
  return typeof intent === 'string' ? LEGACY_ACTIVATION_STAGE[intent] ?? null : null;
}
