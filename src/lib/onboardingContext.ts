import {
  assignFounderStageV3,
  mapFounderStageToBizMapStage,
  mapFounderStageToBusinessStage,
  STAGES,
  type CapitalMotion,
  type FounderBlocker,
  type FounderOperatingStageId,
  type FounderStageId,
  type FounderStageQuizAnswersV3,
  type StageConfidenceBand,
} from './stageDiagnostic.ts';
import type { FounderLoop } from './founderCycle.ts';
import type { RoutineGoal } from './routineTemplates.ts';
import type { ActivationIntent } from './retentionSystem.ts';

export const ADAPTIVE_ONBOARDING_SCHEMA_VERSION = 1;
export const ADAPTIVE_ONBOARDING_FLOW_VERSION = 'adaptive_v1' as const;
export const CONTROL_ONBOARDING_FLOW_VERSION = 'control_v6' as const;

export type OnboardingFlowVersion =
  | typeof ADAPTIVE_ONBOARDING_FLOW_VERSION
  | typeof CONTROL_ONBOARDING_FLOW_VERSION;
export type OnboardingRolloutVariant = OnboardingFlowVersion;
export type OnboardingSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export type OnboardingBusinessModel =
  | 'b2b_saas'
  | 'service'
  | 'b2c_product'
  | 'marketplace'
  | 'ecommerce'
  | 'media'
  | 'other';

export type OnboardingEvidenceState =
  | 'none'
  | 'prospects'
  | 'replies'
  | 'conversations'
  | 'commitment'
  | 'payment'
  | 'repeatable_growth';

export type OnboardingCustomerCountBand = '0' | '1' | '2' | '3' | '4_plus';
export type OnboardingPrimaryGoal =
  | 'validate_problem'
  | 'win_first_customer'
  | 'reach_three_customers'
  | 'repeatable_growth'
  | 'build_product'
  | 'launch'
  | 'raise';
export type OnboardingBlocker =
  | 'customer_clarity'
  | 'prospect_access'
  | 'messaging'
  | 'sales_conversion'
  | 'product_delivery'
  | 'traction_growth'
  | 'fundraising'
  | 'accountability'
  | 'team';
export type OnboardingWeeklyCapacityHours = 2 | 5 | 10 | 20;
export type OnboardingCofounderSituation = 'actively_looking' | 'solo_ok';
export type OnboardingFundraisingStatus =
  | 'not_now'
  | 'preparing'
  | 'talking_investors'
  | 'raising_now';

export interface OnboardingAnswersV1 {
  startupBrief: string;
  businessModel: OnboardingBusinessModel | '';
  evidenceState: OnboardingEvidenceState | '';
  customerCountBand: OnboardingCustomerCountBand | '';
  primaryGoal: OnboardingPrimaryGoal | '';
  blocker: OnboardingBlocker | '';
  weeklyCapacityHours: OnboardingWeeklyCapacityHours | null;
  fundraisingStatus: OnboardingFundraisingStatus | '';
  cofounderSituation: OnboardingCofounderSituation | '';
  sectors: string[];
  country: string;
  selectedIntent: ActivationIntent | '';
}

export interface OnboardingContextV1 {
  schemaVersion: 1;
  flowVersion: OnboardingFlowVersion;
  assignedStage: FounderStageId;
  operatingStage: FounderOperatingStageId;
  runnerUpStage: FounderOperatingStageId | null;
  assignedStageLabel: string;
  businessStage: string;
  bizMapStage: string;
  founderLoop: FounderLoop;
  stageConfidence: number;
  stageConfidenceBand: StageConfidenceBand;
  stageScoreMargin: number;
  stageEvidenceCoverage: number;
  capitalMotion: CapitalMotion;
  capitalEvidence: boolean;
  stageRationaleCodes: string[];
  stageConflictFlags: string[];
  recommendedIntent: ActivationIntent;
  selectedIntent: ActivationIntent;
  recommendationAccepted: boolean;
  recommendationReasonCodes: string[];
  routineGoal: RoutineGoal;
  dataCompleteness: 'complete' | 'legacy_partial';
}

export interface OnboardingSessionV1 {
  id: string;
  user_id: string;
  schema_version: number;
  flow_version: OnboardingFlowVersion;
  rollout_variant: OnboardingRolloutVariant;
  source: string;
  plan_snapshot: string | null;
  device_snapshot: 'mobile' | 'desktop' | null;
  status: OnboardingSessionStatus;
  current_step: number;
  answers: Partial<OnboardingAnswersV1>;
  derived_context: OnboardingContextV1 | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

export const EMPTY_ONBOARDING_ANSWERS_V1: OnboardingAnswersV1 = {
  startupBrief: '',
  businessModel: '',
  evidenceState: '',
  customerCountBand: '',
  primaryGoal: '',
  blocker: '',
  weeklyCapacityHours: null,
  fundraisingStatus: '',
  cofounderSituation: '',
  sectors: [],
  country: '',
  selectedIntent: '',
};

const EVIDENCE_TO_PRODUCT: Record<OnboardingEvidenceState, FounderStageQuizAnswersV3['productStatus']> = {
  none: 'idea_only',
  prospects: 'prototype_demo',
  replies: 'prototype_demo',
  conversations: 'prototype_demo',
  commitment: 'mvp_beta',
  payment: 'live_product',
  repeatable_growth: 'scaling_product',
};

const EVIDENCE_TO_TRACTION: Record<OnboardingEvidenceState, FounderStageQuizAnswersV3['tractionSignal']> = {
  none: 'none',
  prospects: 'waitlist_interest',
  replies: 'waitlist_interest',
  conversations: 'waitlist_interest',
  commitment: 'active_users',
  payment: 'revenue',
  repeatable_growth: 'repeatable_growth',
};

const BLOCKER_TO_LEGACY: Record<OnboardingBlocker, FounderBlocker> = {
  customer_clarity: 'customer_clarity',
  prospect_access: 'demand_validation',
  messaging: 'go_to_market',
  sales_conversion: 'go_to_market',
  product_delivery: 'product_build',
  traction_growth: 'traction_growth',
  fundraising: 'fundraising',
  accountability: 'solo',
  team: 'solo',
};

const GOAL_TO_MAIN_FOCUS: Record<OnboardingPrimaryGoal, NonNullable<FounderStageQuizAnswersV3['mainFocus']>> = {
  validate_problem: 'validate_demand',
  win_first_customer: 'launch_market',
  reach_three_customers: 'launch_market',
  repeatable_growth: 'grow_channels',
  build_product: 'build_product',
  launch: 'launch_market',
  raise: 'raise_capital',
};

const GOAL_TO_ROUTINE: Record<OnboardingPrimaryGoal, RoutineGoal> = {
  validate_problem: 'validate_idea',
  win_first_customer: 'grow_audience',
  reach_three_customers: 'grow_audience',
  repeatable_growth: 'grow_audience',
  build_product: 'launch_product',
  launch: 'launch_product',
  raise: 'raise_funding',
};

function customerCountFromBand(band: OnboardingCustomerCountBand | '') {
  if (band === '1') return 1;
  if (band === '2') return 2;
  if (band === '3') return 3;
  if (band === '4_plus') return 4;
  return 0;
}

export function requiresCustomerCount(answer: OnboardingEvidenceState | '') {
  return answer === 'commitment' || answer === 'payment' || answer === 'repeatable_growth';
}

export function requiresFundraisingStatus(
  goal: OnboardingPrimaryGoal | '',
  blocker: OnboardingBlocker | '',
) {
  return goal === 'raise' || blocker === 'fundraising';
}

export function requiresCofounderSituation(blocker: OnboardingBlocker | '') {
  return blocker === 'accountability' || blocker === 'team';
}

export function deriveFounderLoopFromAnswers(answers: OnboardingAnswersV1): FounderLoop {
  const customers = customerCountFromBand(answers.customerCountBand);
  if (answers.evidenceState === 'repeatable_growth' || customers >= 3 || answers.primaryGoal === 'repeatable_growth') {
    return 'GROW';
  }
  if (answers.evidenceState === 'payment' || customers > 0 || answers.primaryGoal === 'reach_three_customers') {
    return 'SELL';
  }
  return 'PROVE';
}

export function deriveStageAnswersFromOnboarding(
  answers: OnboardingAnswersV1,
): FounderStageQuizAnswersV3 {
  const evidence = answers.evidenceState || 'none';
  const blocker = answers.blocker || 'customer_clarity';
  const goal = answers.primaryGoal || 'validate_problem';
  const customerCount = customerCountFromBand(answers.customerCountBand);

  return {
    productStatus: EVIDENCE_TO_PRODUCT[evidence],
    tractionSignal: EVIDENCE_TO_TRACTION[evidence],
    blocker: BLOCKER_TO_LEGACY[blocker],
    fundraisingStatus: answers.fundraisingStatus || (goal === 'raise' ? 'preparing' : 'not_now'),
    customerTesting:
      customerCount > 0 || evidence === 'payment' || evidence === 'repeatable_growth'
        ? customerCount >= 3 || evidence === 'repeatable_growth'
          ? 'repeat_customers'
          : 'paying_customers'
        : evidence === 'conversations' || evidence === 'commitment'
          ? 'target_customers'
          : evidence === 'replies'
            ? 'friends_family'
            : 'no_one',
    mainFocus: GOAL_TO_MAIN_FOCUS[goal],
  };
}

export function recommendIntentFromAnswers(
  answers: OnboardingAnswersV1,
  assignedStage: FounderStageId,
): { intent: ActivationIntent; reasonCodes: string[] } {
  if (answers.primaryGoal === 'raise' || answers.blocker === 'fundraising') {
    return { intent: 'analyze_pitch_deck', reasonCodes: ['fundraising_goal'] };
  }
  if (answers.blocker === 'team' || answers.blocker === 'accountability') {
    return { intent: 'find_mentor', reasonCodes: ['human_support_needed'] };
  }
  if (answers.blocker === 'customer_clarity') {
    return { intent: 'run_icp', reasonCodes: ['customer_clarity_blocker'] };
  }
  if (answers.primaryGoal === 'validate_problem' || answers.blocker === 'prospect_access') {
    return { intent: 'start_validation', reasonCodes: ['external_evidence_goal'] };
  }
  if (answers.primaryGoal === 'build_product' || answers.blocker === 'product_delivery') {
    return { intent: 'build_mvp', reasonCodes: ['product_delivery_goal'] };
  }
  if (
    answers.primaryGoal === 'win_first_customer'
    || answers.primaryGoal === 'reach_three_customers'
    || answers.primaryGoal === 'launch'
    || answers.blocker === 'messaging'
    || answers.blocker === 'sales_conversion'
  ) {
    return { intent: 'plan_gtm', reasonCodes: ['sales_or_launch_goal'] };
  }
  if (answers.primaryGoal === 'repeatable_growth' || answers.blocker === 'traction_growth') {
    return { intent: 'log_traction', reasonCodes: ['growth_goal'] };
  }

  const stageFallback: Record<FounderStageId, ActivationIntent> = {
    1: 'run_icp',
    2: 'build_demo',
    3: 'start_validation',
    4: 'build_mvp',
    5: 'plan_gtm',
    6: 'log_traction',
    7: 'analyze_pitch_deck',
  };
  return { intent: stageFallback[assignedStage], reasonCodes: ['stage_fallback'] };
}

export function deriveOnboardingContextV1(
  answers: OnboardingAnswersV1,
  options: {
    flowVersion?: OnboardingFlowVersion;
    selectedIntent?: ActivationIntent | null;
    dataCompleteness?: OnboardingContextV1['dataCompleteness'];
  } = {},
): OnboardingContextV1 {
  const stageAnswers = deriveStageAnswersFromOnboarding(answers);
  const diagnostic = assignFounderStageV3(stageAnswers);
  const recommendation = recommendIntentFromAnswers(answers, diagnostic.assignedStage);
  const selectedIntent = options.selectedIntent || answers.selectedIntent || recommendation.intent;
  const routineGoal = answers.cofounderSituation === 'actively_looking'
    ? 'find_cofounders'
    : GOAL_TO_ROUTINE[answers.primaryGoal || 'validate_problem'];

  return {
    schemaVersion: 1,
    flowVersion: options.flowVersion ?? ADAPTIVE_ONBOARDING_FLOW_VERSION,
    assignedStage: diagnostic.assignedStage,
    operatingStage: diagnostic.operatingStage,
    runnerUpStage: diagnostic.runnerUpStage,
    assignedStageLabel: STAGES[diagnostic.assignedStage].name,
    businessStage: mapFounderStageToBusinessStage(diagnostic.assignedStage),
    bizMapStage: mapFounderStageToBizMapStage(diagnostic.assignedStage),
    founderLoop: deriveFounderLoopFromAnswers(answers),
    stageConfidence: diagnostic.confidence,
    stageConfidenceBand: diagnostic.confidenceBand,
    stageScoreMargin: diagnostic.scoreMargin,
    stageEvidenceCoverage: diagnostic.evidenceCoverage,
    capitalMotion: diagnostic.capitalMotion,
    capitalEvidence: diagnostic.capitalEvidence,
    stageRationaleCodes: diagnostic.primarySignals,
    stageConflictFlags: diagnostic.conflictFlags,
    recommendedIntent: recommendation.intent,
    selectedIntent,
    recommendationAccepted: selectedIntent === recommendation.intent,
    recommendationReasonCodes: recommendation.reasonCodes,
    routineGoal,
    dataCompleteness: options.dataCompleteness ?? 'complete',
  };
}

export function isAdaptiveOnboardingComplete(answers: OnboardingAnswersV1) {
  const briefLength = answers.startupBrief.trim().length;
  if (briefLength < 20 || briefLength > 280) return false;
  if (!answers.businessModel || !answers.evidenceState || !answers.primaryGoal || !answers.blocker) return false;
  if (!answers.weeklyCapacityHours || !answers.selectedIntent) return false;
  if (requiresCustomerCount(answers.evidenceState) && !answers.customerCountBand) return false;
  if (requiresFundraisingStatus(answers.primaryGoal, answers.blocker) && !answers.fundraisingStatus) return false;
  if (requiresCofounderSituation(answers.blocker) && !answers.cofounderSituation) return false;
  return true;
}
