export type ProofVerificationMode = 'founder_reported' | 'corroborated' | 'platform_verified';

export interface PublishedProofCase {
  id: string;
  slug: string;
  title: string;
  summary: string;
  approved_public_identity: string | null;
  founder_stage: string;
  starting_assumption: string;
  actions_completed: string[];
  evidence_summary: string;
  verification_mode: ProofVerificationMode;
  decision_changed: string;
  external_outcome: string;
  published_at: string;
}

export interface PublishedProofMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  cohort_label: string;
  period_start: string;
  period_end: string;
  denominator: number;
  source_systems: string[];
  published_at: string;
}
