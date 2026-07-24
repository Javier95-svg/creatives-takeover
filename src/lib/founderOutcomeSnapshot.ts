import type { BizMapStage } from '@/lib/bizmapStages';
import type { JourneyOutcomeStatus, JourneyTool, VerificationMode } from '@/lib/journeyOutcomes';

export type OutcomeSnapshotStatus = 'not_started' | JourneyOutcomeStatus;

export interface FounderOutcomeItem {
  tool: JourneyTool;
  stage: string;
  status: OutcomeSnapshotStatus;
  completionScore: number | null;
  verificationMode: VerificationMode;
  warnings: string[];
  nextAction: string | null;
  artifactType: string | null;
  artifactId: string | null;
  outcomeId: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  decision?: 'build' | 'narrow' | 'pivot' | 'stop' | 'collect_more_evidence' | null;
  evidenceGrade?: 'insufficient' | 'directional' | 'emerging' | 'decision_grade' | null;
}

export interface ValidationSprintSnapshot {
  id: string;
  status: string;
  hypothesis: string | null;
  primary_segment: string | null;
  current_step: number;
  icp_outcome_id: string | null;
  pmf_outcome_id: string | null;
  decision: string | null;
  recommendation: string | null;
  evidence_grade: string;
  credit_spend_total: number;
  next_experiment: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface FounderOutcomeSnapshot {
  version: 1;
  generatedAt: string;
  outcomes: Record<JourneyTool, FounderOutcomeItem>;
  stages: Record<string, {
    status: OutcomeSnapshotStatus;
    completed: boolean;
    verified: boolean;
    completedAt: string | null;
    outcomeId: string | null;
  }>;
  validationSprint: ValidationSprintSnapshot | null;
  recommendedNextRoute: string;
  currentStage: BizMapStage;
  handoffs: Record<string, {
    id: string;
    status: 'pending' | 'consumed' | 'failed';
    sourceOutcomeId: string;
    sourceVersionId: string;
    consumedArtifactId: string | null;
    createdAt: string;
  }>;
  capitalOptional: true;
}

export const OUTCOME_COMPLETE_STATUSES = new Set<OutcomeSnapshotStatus>([
  'ready',
  'verified',
  'reviewed',
]);

export function isOutcomeComplete(status: OutcomeSnapshotStatus | undefined) {
  return Boolean(status && OUTCOME_COMPLETE_STATUSES.has(status));
}

export function isFounderOutcomeSnapshot(value: unknown): value is FounderOutcomeSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<FounderOutcomeSnapshot>;
  return (
    candidate.version === 1 &&
    Boolean(candidate.outcomes && typeof candidate.outcomes === 'object' && !Array.isArray(candidate.outcomes)) &&
    Boolean(candidate.stages && typeof candidate.stages === 'object' && !Array.isArray(candidate.stages)) &&
    typeof candidate.recommendedNextRoute === 'string' &&
    typeof candidate.currentStage === 'string' &&
    candidate.capitalOptional === true
  );
}
