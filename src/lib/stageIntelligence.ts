import { supabase } from '@/integrations/supabase/client';
import {
  STAGES,
  type CapitalMotion,
  type FounderOperatingStageId,
  type StageConfidenceBand,
} from '@/lib/stageDiagnostic';

export const FOUNDER_STAGE_MODEL_VERSION = 'stage_evidence_v1';

export type StageEvidenceType =
  | 'product_state'
  | 'customer_signal'
  | 'market_commitment'
  | 'live_product'
  | 'repeatable_growth'
  | 'capital_motion'
  | 'boundary_answer'
  | 'user_correction';

export type StageEvidenceSource =
  | 'self_report'
  | 'artifact'
  | 'platform'
  | 'external'
  | 'boundary_answer'
  | 'user_correction';

export type StageCorrectionReason =
  | 'product_state'
  | 'customer_evidence'
  | 'traction_evidence'
  | 'stage_definition'
  | 'capital_is_separate';

export interface FounderStageEvidence {
  id: string;
  user_id: string;
  evidence_key: string;
  evidence_type: StageEvidenceType;
  source_type: StageEvidenceSource;
  stage_supported: FounderOperatingStageId | null;
  reliability: number;
  source_entity_type: string | null;
  source_entity_id: string | null;
  observed_at: string;
  expires_at: string | null;
  active: boolean;
  metadata: Record<string, unknown>;
}

export interface FounderStageState {
  user_id: string;
  current_stage: FounderOperatingStageId;
  candidate_stage: FounderOperatingStageId;
  runner_up_stage: FounderOperatingStageId | null;
  score_margin: number;
  confidence_score: number;
  confidence_band: StageConfidenceBand;
  evidence_coverage: number;
  capital_motion: CapitalMotion;
  capital_evidence: boolean;
  rationale_codes: string[];
  model_version: string;
  candidate_since: string;
  last_transition_at: string | null;
  last_evaluated_at: string;
  stage_stale: boolean;
  user_confirmed_stage: FounderOperatingStageId | null;
  user_confirmed_at: string | null;
  user_override_stage: FounderOperatingStageId | null;
  user_override_until: string | null;
  correction_reason: StageCorrectionReason | null;
  boundary_question_key: string | null;
  boundary_answer: 'lower' | 'upper' | null;
  boundary_answered_at: string | null;
}

export interface FounderStageAssessmentInput {
  baseStage: FounderOperatingStageId;
  runnerUpStage: FounderOperatingStageId | null;
  confidenceScore: number;
  confidenceBand: StageConfidenceBand;
  scoreMargin: number;
  evidenceCoverage: number;
  capitalMotion: CapitalMotion;
  capitalEvidence: boolean;
  rationaleCodes: string[];
}

export interface FounderStageAssessment extends FounderStageAssessmentInput {
  candidateStage: FounderOperatingStageId;
  boundaryQuestion: FounderStageBoundaryQuestion | null;
}

export interface FounderStageBoundaryQuestion {
  key: string;
  lowerStage: FounderOperatingStageId;
  upperStage: FounderOperatingStageId;
  question: string;
  lowerLabel: string;
  upperLabel: string;
}

export interface ArtifactStageEvidence {
  evidenceType: StageEvidenceType;
  stageSupported: FounderOperatingStageId | null;
  reliability: number;
  rationaleCode: string;
}

const BOUNDARY_QUESTIONS: Record<string, Omit<FounderStageBoundaryQuestion, 'key'>> = {
  '1-2': {
    lowerStage: 1,
    upperStage: 2,
    question: 'Can a potential customer see or use something concrete today?',
    lowerLabel: 'Not yet — it is still an idea',
    upperLabel: 'Yes — there is a prototype or demo',
  },
  '2-3': {
    lowerStage: 2,
    upperStage: 3,
    question: 'Has a target customer tested it or made a concrete commitment?',
    lowerLabel: 'Not with a target customer yet',
    upperLabel: 'Yes — I have external evidence',
  },
  '3-4': {
    lowerStage: 3,
    upperStage: 4,
    question: 'Are you actively building the smallest version customers can use?',
    lowerLabel: 'No — I am still validating demand',
    upperLabel: 'Yes — the MVP is being built',
  },
  '4-5': {
    lowerStage: 4,
    upperStage: 5,
    question: 'Is there a live, accessible product flow for customers?',
    lowerLabel: 'Not live yet',
    upperLabel: 'Yes — customers can access it',
  },
  '5-6': {
    lowerStage: 5,
    upperStage: 6,
    question: 'Have you repeated a growth, revenue, or retention signal across at least two periods?',
    lowerLabel: 'Not repeatably yet',
    upperLabel: 'Yes — the signal has repeated',
  },
};

const RATIONALE_LABELS: Record<string, string> = {
  idea_only: 'You reported an idea without a testable product yet.',
  prototype_or_demo: 'You have a prototype, mockup, or demo.',
  mvp_or_beta: 'You have an MVP or beta in progress.',
  live_product: 'Your product is live for customers.',
  scaling_product: 'You reported a live product with growth activity.',
  no_real_users: 'No external customer evidence is recorded yet.',
  early_network_feedback: 'Your current feedback is from your immediate network.',
  target_customer_testing: 'Target customers are testing the proposition.',
  paying_customers: 'Paying-customer evidence is recorded.',
  repeat_or_retained_usage: 'Repeat usage or retention is recorded.',
  waitlist_or_interest: 'You have early market interest.',
  active_users: 'Active-user evidence is recorded.',
  revenue_signal: 'Revenue or customer payment is recorded.',
  repeatable_growth: 'A repeatable growth signal is recorded.',
  artifact_prototype: 'A prototype or demo artifact exists.',
  artifact_validation: 'A customer-validation artifact exists.',
  artifact_mvp: 'A usable MVP artifact exists.',
  artifact_live_product: 'A live-product artifact exists.',
  artifact_repeatable_growth: 'A repeatable-growth record exists.',
  user_correction: 'You corrected and confirmed this operating stage.',
};

const ARTIFACT_STAGE_EVIDENCE: Record<string, ArtifactStageEvidence | null> = {
  demo_studio_draft: {
    evidenceType: 'product_state',
    stageSupported: 2,
    reliability: 0.65,
    rationaleCode: 'artifact_prototype',
  },
  interactive_proof_page: {
    evidenceType: 'product_state',
    stageSupported: 2,
    reliability: 0.8,
    rationaleCode: 'artifact_prototype',
  },
  validation_draft: {
    evidenceType: 'customer_signal',
    stageSupported: null,
    reliability: 0.55,
    rationaleCode: 'artifact_validation',
  },
  pmf_report: {
    evidenceType: 'customer_signal',
    stageSupported: null,
    reliability: 0.55,
    rationaleCode: 'artifact_validation',
  },
  pmf_decision_report: {
    evidenceType: 'customer_signal',
    stageSupported: 3,
    reliability: 0.85,
    rationaleCode: 'artifact_validation',
  },
  mvp_scope: {
    evidenceType: 'product_state',
    stageSupported: null,
    reliability: 0.55,
    rationaleCode: 'artifact_mvp',
  },
  tech_stack_report: {
    evidenceType: 'product_state',
    stageSupported: null,
    reliability: 0.55,
    rationaleCode: 'artifact_mvp',
  },
  evidence_backed_mvp: {
    evidenceType: 'product_state',
    stageSupported: 4,
    reliability: 0.9,
    rationaleCode: 'artifact_mvp',
  },
  gtm_plan: {
    evidenceType: 'live_product',
    stageSupported: null,
    reliability: 0.55,
    rationaleCode: 'artifact_live_product',
  },
  gtm_acquisition_play: {
    evidenceType: 'live_product',
    stageSupported: 5,
    reliability: 0.65,
    rationaleCode: 'artifact_live_product',
  },
  traction_weekly_log: {
    evidenceType: 'repeatable_growth',
    stageSupported: 6,
    reliability: 0.6,
    rationaleCode: 'artifact_repeatable_growth',
  },
  verified_traction_ledger: {
    evidenceType: 'repeatable_growth',
    stageSupported: 6,
    reliability: 0.9,
    rationaleCode: 'artifact_repeatable_growth',
  },
  pitch_deck_analysis: {
    evidenceType: 'capital_motion',
    stageSupported: null,
    reliability: 0.65,
    rationaleCode: 'capital_motion_preparing',
  },
  insighta_readiness: null,
  mentor_saved: null,
  mentor_message: null,
  discovery_call: null,
  icp_analysis: null,
  customer_decision_brief: null,
};

function clampStage(value: number): FounderOperatingStageId {
  return Math.min(6, Math.max(1, Math.round(value))) as FounderOperatingStageId;
}

function confidenceBand(score: number): StageConfidenceBand {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function isActiveEvidence(evidence: FounderStageEvidence, now = Date.now()) {
  if (!evidence.active) return false;
  if (!evidence.expires_at) return true;
  const expiresAt = Date.parse(evidence.expires_at);
  return Number.isNaN(expiresAt) || expiresAt > now;
}

export function getArtifactStageEvidence(artifactType: string): ArtifactStageEvidence | null {
  return ARTIFACT_STAGE_EVIDENCE[artifactType] ?? null;
}

export function getFounderStageBoundaryQuestion(
  firstStage: FounderOperatingStageId,
  secondStage: FounderOperatingStageId | null,
  band: StageConfidenceBand,
): FounderStageBoundaryQuestion | null {
  if (!secondStage || band === 'high' || Math.abs(firstStage - secondStage) !== 1) return null;
  const lowerStage = Math.min(firstStage, secondStage);
  const upperStage = Math.max(firstStage, secondStage);
  const definition = BOUNDARY_QUESTIONS[`${lowerStage}-${upperStage}`];
  if (!definition) return null;
  return {
    key: `stage-boundary-${lowerStage}-${upperStage}`,
    ...definition,
  };
}

export function deriveFounderStageAssessment(
  input: FounderStageAssessmentInput,
  evidence: FounderStageEvidence[],
): FounderStageAssessment {
  const activeEvidence = evidence.filter((item) => isActiveEvidence(item));
  const hasCapitalPreparationEvidence = activeEvidence.some((item) =>
    item.evidence_type === 'capital_motion' && item.reliability >= 0.6);
  const byStage = new Map<FounderOperatingStageId, FounderStageEvidence[]>();
  for (const item of activeEvidence) {
    if (!item.stage_supported) continue;
    const rows = byStage.get(item.stage_supported) ?? [];
    rows.push(item);
    byStage.set(item.stage_supported, rows);
  }

  let candidateStage = input.baseStage;
  for (const [stage, rows] of byStage) {
    const verified = rows.some((row) =>
      row.reliability >= 0.8
      && ['artifact', 'platform', 'external', 'user_correction'].includes(row.source_type));
    const independentSources = new Set(rows.map((row) =>
      `${row.source_type}:${row.source_entity_type ?? row.evidence_type}:${row.source_entity_id ?? 'single'}`));
    if ((verified || independentSources.size >= 2) && stage > candidateStage) {
      candidateStage = stage;
    }
  }

  const candidateEvidence = byStage.get(candidateStage) ?? [];
  const strongSignals = candidateEvidence.filter((row) => row.reliability >= 0.8).length;
  const distinctEvidenceTypes = new Set(
    activeEvidence
      .filter((row) => row.evidence_type !== 'capital_motion')
      .map((row) => row.evidence_type),
  ).size;
  const distinctEvidenceSources = new Set(
    activeEvidence
      .filter((row) => row.evidence_type !== 'capital_motion')
      .map((row) => row.source_type),
  ).size;
  const evidenceDerivedCoverage = Math.min(
    1,
    0.34 + distinctEvidenceTypes * 0.14 + distinctEvidenceSources * 0.08,
  );
  const evidenceCoverage = Math.min(
    1,
    Math.max(input.evidenceCoverage, evidenceDerivedCoverage),
  );
  const evidenceDerivedConfidence = Math.round(
    44
    + strongSignals * 16
    + Math.min(3, candidateEvidence.length) * 5
    + evidenceCoverage * 12,
  );
  const adjustedConfidence = Math.min(
    96,
    Math.max(35, input.confidenceScore, evidenceDerivedConfidence),
  );
  const rationaleCodes = Array.from(new Set([
    ...input.rationaleCodes,
    ...candidateEvidence
      .map((row) => typeof row.metadata.rationale_code === 'string' ? row.metadata.rationale_code : null)
      .filter((value): value is string => Boolean(value)),
  ])).slice(0, 6);
  const runnerUpStage = input.runnerUpStage && input.runnerUpStage !== candidateStage
    ? input.runnerUpStage
    : candidateStage > 1
      ? clampStage(candidateStage - 1)
      : 2;
  const nextBand = confidenceBand(adjustedConfidence);

  return {
    ...input,
    candidateStage,
    runnerUpStage,
    confidenceScore: adjustedConfidence,
    confidenceBand: nextBand,
    evidenceCoverage,
    capitalMotion: input.capitalMotion === 'active'
      ? 'active'
      : hasCapitalPreparationEvidence
        ? 'preparing'
        : input.capitalMotion,
    rationaleCodes,
    boundaryQuestion: getFounderStageBoundaryQuestion(candidateStage, runnerUpStage, nextBand),
  };
}

export function getStageExplanation(
  state: Pick<FounderStageState, 'current_stage' | 'rationale_codes' | 'stage_stale'>,
): string[] {
  const explanations = state.rationale_codes
    .map((code) => RATIONALE_LABELS[code])
    .filter((value): value is string => Boolean(value));
  if (state.stage_stale) {
    explanations.unshift('New evidence suggests an earlier stage; confirm your current reality below.');
  }
  if (explanations.length === 0) {
    explanations.push(`Your current product and customer evidence best matches ${STAGES[state.current_stage].label}.`);
  }
  return Array.from(new Set(explanations)).slice(0, 3);
}

function normalizeEvidence(value: unknown): FounderStageEvidence {
  const row = value as Record<string, unknown>;
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    evidence_key: String(row.evidence_key ?? ''),
    evidence_type: row.evidence_type as StageEvidenceType,
    source_type: row.source_type as StageEvidenceSource,
    stage_supported: row.stage_supported == null ? null : clampStage(Number(row.stage_supported)),
    reliability: Number(row.reliability ?? 0),
    source_entity_type: typeof row.source_entity_type === 'string' ? row.source_entity_type : null,
    source_entity_id: typeof row.source_entity_id === 'string' ? row.source_entity_id : null,
    observed_at: String(row.observed_at ?? ''),
    expires_at: typeof row.expires_at === 'string' ? row.expires_at : null,
    active: row.active !== false,
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {},
  };
}

export function normalizeFounderStageState(value: unknown): FounderStageState {
  const row = value as Record<string, unknown>;
  const band = row.confidence_band === 'high' || row.confidence_band === 'medium'
    ? row.confidence_band
    : 'low';
  const capital = row.capital_motion === 'active' || row.capital_motion === 'preparing'
    ? row.capital_motion
    : 'inactive';
  return {
    user_id: String(row.user_id ?? ''),
    current_stage: clampStage(Number(row.current_stage ?? 1)),
    candidate_stage: clampStage(Number(row.candidate_stage ?? row.current_stage ?? 1)),
    runner_up_stage: row.runner_up_stage == null ? null : clampStage(Number(row.runner_up_stage)),
    score_margin: Number(row.score_margin ?? 0),
    confidence_score: Number(row.confidence_score ?? 50),
    confidence_band: band,
    evidence_coverage: Number(row.evidence_coverage ?? 0),
    capital_motion: capital,
    capital_evidence: row.capital_evidence === true,
    rationale_codes: Array.isArray(row.rationale_codes)
      ? row.rationale_codes.filter((item): item is string => typeof item === 'string')
      : [],
    model_version: typeof row.model_version === 'string' ? row.model_version : FOUNDER_STAGE_MODEL_VERSION,
    candidate_since: String(row.candidate_since ?? ''),
    last_transition_at: typeof row.last_transition_at === 'string' ? row.last_transition_at : null,
    last_evaluated_at: String(row.last_evaluated_at ?? ''),
    stage_stale: row.stage_stale === true,
    user_confirmed_stage: row.user_confirmed_stage == null ? null : clampStage(Number(row.user_confirmed_stage)),
    user_confirmed_at: typeof row.user_confirmed_at === 'string' ? row.user_confirmed_at : null,
    user_override_stage: row.user_override_stage == null ? null : clampStage(Number(row.user_override_stage)),
    user_override_until: typeof row.user_override_until === 'string' ? row.user_override_until : null,
    correction_reason: typeof row.correction_reason === 'string'
      ? row.correction_reason as StageCorrectionReason
      : null,
    boundary_question_key: typeof row.boundary_question_key === 'string' ? row.boundary_question_key : null,
    boundary_answer: row.boundary_answer === 'lower' || row.boundary_answer === 'upper'
      ? row.boundary_answer
      : null,
    boundary_answered_at: typeof row.boundary_answered_at === 'string' ? row.boundary_answered_at : null,
  };
}

export async function fetchFounderStageEvidence(userId: string) {
  const { data, error } = await supabase
    .from('founder_stage_evidence' as never)
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('observed_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map(normalizeEvidence);
}

export async function fetchFounderStageState(userId: string) {
  const { data, error } = await supabase
    .from('founder_stage_state' as never)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeFounderStageState(data) : null;
}

export async function syncFounderStageState(
  assessment: FounderStageAssessment,
  trigger: string,
) {
  const { data, error } = await supabase.rpc('sync_founder_stage_state_v1' as never, {
    p_candidate_stage: assessment.candidateStage,
    p_runner_up_stage: assessment.runnerUpStage,
    p_score_margin: assessment.scoreMargin,
    p_confidence_score: assessment.confidenceScore,
    p_confidence_band: assessment.confidenceBand,
    p_evidence_coverage: assessment.evidenceCoverage,
    p_capital_motion: assessment.capitalMotion,
    p_capital_evidence: assessment.capitalEvidence,
    p_rationale_codes: assessment.rationaleCodes,
    p_trigger: trigger,
    p_boundary_question_key: assessment.boundaryQuestion?.key ?? null,
  } as never);
  if (error) throw error;
  return normalizeFounderStageState(data);
}

export async function confirmFounderStage(
  confirmedStage: FounderOperatingStageId,
  reason: StageCorrectionReason,
) {
  const { data, error } = await supabase.rpc('confirm_founder_stage_v1' as never, {
    p_confirmed_stage: confirmedStage,
    p_reason: reason,
  } as never);
  if (error) throw error;
  return normalizeFounderStageState(data);
}

export async function answerFounderStageBoundary(
  question: FounderStageBoundaryQuestion,
  answer: 'lower' | 'upper',
) {
  const supportedStage = answer === 'upper' ? question.upperStage : question.lowerStage;
  const { data, error } = await supabase.rpc('answer_founder_stage_boundary_v1' as never, {
    p_question_key: question.key,
    p_answer: answer,
    p_supported_stage: supportedStage,
  } as never);
  if (error) throw error;
  return normalizeFounderStageState(data);
}

export async function recordFounderStageEvidence(params: {
  evidenceKey: string;
  evidenceType: StageEvidenceType;
  sourceType: StageEvidenceSource;
  stageSupported: FounderOperatingStageId | null;
  reliability: number;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  observedAt?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.rpc('record_founder_stage_evidence_v1' as never, {
    p_evidence_key: params.evidenceKey,
    p_evidence_type: params.evidenceType,
    p_source_type: params.sourceType,
    p_stage_supported: params.stageSupported,
    p_reliability: params.reliability,
    p_source_entity_type: params.sourceEntityType ?? null,
    p_source_entity_id: params.sourceEntityId ?? null,
    p_observed_at: params.observedAt ?? new Date().toISOString(),
    p_metadata: params.metadata ?? {},
  } as never);
  if (error) throw error;
}

export async function recordArtifactStageEvidence(params: {
  userId: string;
  artifactType: string;
  artifactId?: string | null;
  observedAt?: string;
}) {
  const mapping = getArtifactStageEvidence(params.artifactType);
  if (!mapping) return;
  await recordFounderStageEvidence({
    evidenceKey: `artifact:${params.artifactType}:${params.artifactId ?? 'latest'}`,
    evidenceType: mapping.evidenceType,
    sourceType: 'artifact',
    stageSupported: mapping.stageSupported,
    reliability: mapping.reliability,
    sourceEntityType: params.artifactType,
    sourceEntityId: params.artifactId ?? null,
    observedAt: params.observedAt,
    metadata: { rationale_code: mapping.rationaleCode },
  });

  const [persisted, evidence] = await Promise.all([
    fetchFounderStageState(params.userId),
    fetchFounderStageEvidence(params.userId),
  ]);
  if (!persisted) return;

  const assessment = deriveFounderStageAssessment({
    baseStage: persisted.current_stage,
    runnerUpStage: persisted.runner_up_stage,
    confidenceScore: persisted.confidence_score,
    confidenceBand: persisted.confidence_band,
    scoreMargin: persisted.score_margin,
    evidenceCoverage: persisted.evidence_coverage,
    capitalMotion: persisted.capital_motion,
    capitalEvidence: persisted.capital_evidence,
    rationaleCodes: persisted.rationale_codes,
  }, evidence);
  await syncFounderStageState(assessment, `artifact:${params.artifactType}`);
}
