import { BIZMAP_STAGE_ORDER, FOUNDER_STAGE_LABELS, type BizMapStage } from './bizmapStageOrder.ts';
import { deriveFounderProgress, type JourneyOutcomeSignal } from './founderProgress.ts';

/** One completed-stage signal from public_founder_progress_v1. Never artifact content. */
export interface PublicOutcomeRow {
  tool: string;
  artifact_type: string | null;
  status: string;
  completed_at: string | null;
  verified_at: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  verification_mode: string | null;
  buyer_proof_earned: boolean;
}

export interface PublicEvidenceCount {
  total: number;
  verified: number;
}

export interface PublicFounderProgress {
  /** False when only the owner can see it because they have not opted in. */
  visible: boolean;
  outcomes: PublicOutcomeRow[];
  evidence: {
    interviews: PublicEvidenceCount;
    commitments: PublicEvidenceCount;
    payments: PublicEvidenceCount;
  };
}

/** Who stands behind a completed stage, from the strongest check down. */
export type StageCheck = 'verified' | 'reviewed' | 'founder';

export interface PublicStageRow {
  stage: BizMapStage;
  label: string;
  status: 'done' | 'current' | 'upcoming' | 'optional';
  completedAt: string | null;
  check: StageCheck | null;
}

const STAGE_TOOL: Record<Exclude<BizMapStage, 'FUNDRAISING'>, string> = {
  IDENTITY: 'icp_builder',
  PROTOTYPE: 'demo_studio',
  VALIDATING: 'pmf_lab',
  BUILDING: 'mvp_builder',
  LAUNCH: 'gtm_strategist',
  TRACTION: 'traction_engine',
};

const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
const count = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

function evidenceCount(value: unknown): PublicEvidenceCount {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const total = count(record.total);
  return { total, verified: Math.min(total, count(record.verified)) };
}

/** Accepts the RPC payload and drops anything that is not the expected shape. */
export function normalizePublicProgress(raw: unknown): PublicFounderProgress | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const outcomes = Array.isArray(record.outcomes) ? record.outcomes : [];
  const evidence = record.evidence && typeof record.evidence === 'object' ? record.evidence as Record<string, unknown> : {};
  return {
    visible: record.visible === true,
    outcomes: outcomes.flatMap((item): PublicOutcomeRow[] => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const tool = text(row.tool);
      const status = text(row.status);
      if (!tool || !status) return [];
      return [{
        tool,
        status,
        artifact_type: text(row.artifact_type),
        completed_at: text(row.completed_at),
        verified_at: text(row.verified_at),
        reviewed_at: text(row.reviewed_at),
        updated_at: text(row.updated_at),
        verification_mode: text(row.verification_mode),
        buyer_proof_earned: row.buyer_proof_earned === true,
      }];
    }),
    evidence: {
      interviews: evidenceCount(evidence.interviews),
      commitments: evidenceCount(evidence.commitments),
      payments: evidenceCount(evidence.payments),
    },
  };
}

const outcomeDate = (row: PublicOutcomeRow) => row.reviewed_at ?? row.verified_at ?? row.completed_at ?? row.updated_at ?? null;

function stageCheck(row: PublicOutcomeRow | undefined): StageCheck {
  if (row?.verification_mode === 'platform_verified') return 'verified';
  if (row?.status === 'reviewed') return 'reviewed';
  return 'founder';
}

/**
 * The seven stages as a visitor sees them, completed by the same rules as the
 * founder's own dashboard. Fundraise is an optional overlay and never completes.
 */
export function buildPublicStages(progress: PublicFounderProgress): PublicStageRow[] {
  const signals: JourneyOutcomeSignal[] = progress.outcomes.map((row) => ({
    tool: row.tool,
    artifact_type: row.artifact_type ?? undefined,
    status: row.status,
    completed_at: row.completed_at,
    verified_at: row.verified_at,
    reviewed_at: row.reviewed_at,
    updated_at: row.updated_at,
    quality_checks: { buyerProofEarned: row.buyer_proof_earned },
  }));
  const derived = deriveFounderProgress({
    outcomes: signals,
    firstCustomerSprintCompletedAt: null,
    fundraisingReadinessCompletedAt: null,
    pitchDeckCompletedAt: null,
    savedInvestorCount: 0,
  });

  return BIZMAP_STAGE_ORDER.map((stage, index): PublicStageRow => {
    const label = FOUNDER_STAGE_LABELS[index];
    if (stage === 'FUNDRAISING') return { stage, label, status: 'optional', completedAt: null, check: null };
    const completedAt = derived.completedAt[stage];
    if (completedAt) {
      const source = progress.outcomes.find((row) => row.tool === STAGE_TOOL[stage] && outcomeDate(row) === completedAt);
      return { stage, label, status: 'done', completedAt, check: stageCheck(source) };
    }
    return { stage, label, status: stage === derived.currentStage ? 'current' : 'upcoming', completedAt: null, check: null };
  });
}

export function hasPublicEvidence(progress: PublicFounderProgress): boolean {
  const { interviews, commitments, payments } = progress.evidence;
  return interviews.total + commitments.total + payments.total > 0;
}
