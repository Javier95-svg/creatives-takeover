import { PMF_SIGNAL_THRESHOLDS, type PmfEvidenceGrade } from './pmfConfidence.ts';

export type ValidationSprintStatus =
  | 'started'
  | 'customer_defined'
  | 'sourcing'
  | 'gathering_evidence'
  | 'decision_ready'
  | 'completed'
  | 'abandoned';

export type ValidationDecision =
  | 'build'
  | 'narrow'
  | 'pivot'
  | 'stop'
  | 'collect_more_evidence';

export interface CustomerDecisionBrief {
  idea: string;
  primarySegment: string;
  currentAlternative: string;
  urgencyTrigger: string;
  decisionNeeded: string;
}

export interface ValidationSprintRow {
  id: string;
  user_id: string;
  status: ValidationSprintStatus;
  hypothesis: string | null;
  primary_segment: string | null;
  current_step: number;
  icp_outcome_id: string | null;
  pmf_outcome_id: string | null;
  decision: ValidationDecision | null;
  recommendation: ValidationDecision | null;
  evidence_grade: PmfEvidenceGrade;
  credit_spend_total: number;
  customer_brief: CustomerDecisionBrief;
  assumptions: string[];
  interview_plan: string[];
  outreach_script: string | null;
  next_experiment: string | null;
  override_rationale: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationEvidenceRow {
  id: string;
  sprint_id: string;
  source_type: 'interview' | 'transcript' | 'hosted_survey' | 'demo_behavior' | 'external_research';
  source_id: string;
  source_label: string;
  participant_fingerprint: string;
  summary: string | null;
  signal: 'supports' | 'contradicts' | 'neutral';
  weight: number;
  verification_mode: 'founder_reported' | 'corroborated' | 'platform_verified';
  occurred_at: string | null;
  created_at: string;
}

export interface ValidationDecisionResult {
  sprintId: string;
  outcomeId: string;
  status: 'draft' | 'ready' | 'verified';
  verificationMode: string;
  signalCount: number;
  evidenceGrade: PmfEvidenceGrade;
  weightedScore: number;
  recommendation: ValidationDecision;
  decision: ValidationDecision;
  wasOverridden: boolean;
  nextExperiment: string;
  recommendedNextRoute: string;
}

export const EMPTY_CUSTOMER_BRIEF: CustomerDecisionBrief = {
  idea: '',
  primarySegment: '',
  currentAlternative: '',
  urgencyTrigger: '',
  decisionNeeded: '',
};

const GUEST_KEY = 'ct_validation_sprint_guest_v1';

export function loadGuestValidationBrief(): CustomerDecisionBrief {
  if (typeof window === 'undefined') return EMPTY_CUSTOMER_BRIEF;
  try {
    const value = JSON.parse(window.localStorage.getItem(GUEST_KEY) || '{}') as Partial<CustomerDecisionBrief>;
    return { ...EMPTY_CUSTOMER_BRIEF, ...value };
  } catch {
    return EMPTY_CUSTOMER_BRIEF;
  }
}

export function saveGuestValidationBrief(brief: CustomerDecisionBrief) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GUEST_KEY, JSON.stringify(brief));
}

export function clearGuestValidationBrief() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_KEY);
}

export function buildValidationHypothesis(brief: CustomerDecisionBrief) {
  return `${brief.primarySegment || 'The selected customer'} needs a better way to handle ${brief.idea || 'this problem'} when ${brief.urgencyTrigger || 'the trigger occurs'}, instead of ${brief.currentAlternative || 'their current alternative'}.`;
}

export function buildUntestedAssumptions(brief: CustomerDecisionBrief) {
  return [
    `${brief.primarySegment || 'The target customer'} experiences this problem often enough to act.`,
    `The urgency trigger "${brief.urgencyTrigger || 'not yet defined'}" creates a real decision window.`,
    `The current alternative "${brief.currentAlternative || 'not yet defined'}" is costly or frustrating enough to replace.`,
  ];
}

export function buildFiveInterviewPlan(brief: CustomerDecisionBrief) {
  const segment = brief.primarySegment || 'the target segment';
  return Array.from({ length: 5 }, (_, index) =>
    `Conversation ${index + 1}: find one person in ${segment}; ask about the last time the problem happened, what they did, and what it cost.`,
  );
}

export function buildOutreachScript(brief: CustomerDecisionBrief) {
  const segment = brief.primarySegment || 'your field';
  return `Hi — I’m researching how people in ${segment} handle ${brief.idea || 'a recurring workflow'}. I’m not selling anything. Could I ask about the last time this happened and what you did? It takes 15 minutes, and honest criticism is the most useful response.`;
}

export function resolveEvidenceGrade(count: number): PmfEvidenceGrade {
  if (count >= PMF_SIGNAL_THRESHOLDS.decisionGrade) return 'decision_grade';
  if (count >= PMF_SIGNAL_THRESHOLDS.emerging) return 'emerging';
  if (count >= PMF_SIGNAL_THRESHOLDS.directional) return 'directional';
  return 'insufficient';
}

export function nextEvidenceThreshold(count: number) {
  if (count < 5) return 5;
  if (count < 10) return 10;
  if (count < 25) return 25;
  return null;
}

export async function fingerprintParticipant(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  const bytes = new TextEncoder().encode(normalized || crypto.randomUUID());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function buildEvidenceBuildBrief(
  sprint: ValidationSprintRow,
  evidence: ValidationEvidenceRow[],
  result?: ValidationDecisionResult | null,
) {
  const brief = sprint.customer_brief ?? EMPTY_CUSTOMER_BRIEF;
  const outcome = result?.decision ?? sprint.decision ?? 'collect_more_evidence';
  return [
    '# Evidence-backed build brief',
    '',
    `Decision: ${outcome.replaceAll('_', ' ').toUpperCase()}`,
    `Evidence grade: ${result?.evidenceGrade ?? sprint.evidence_grade}`,
    `Independent signals: ${result?.signalCount ?? evidence.length}`,
    '',
    '## Customer',
    brief.primarySegment || sprint.primary_segment || 'Not defined',
    '',
    '## Problem and trigger',
    brief.idea || sprint.hypothesis || 'Not defined',
    brief.urgencyTrigger ? `Trigger: ${brief.urgencyTrigger}` : '',
    brief.currentAlternative ? `Current alternative: ${brief.currentAlternative}` : '',
    '',
    '## Evidence summary',
    ...evidence.map((item, index) => `${index + 1}. [${item.signal}] ${item.summary || item.source_label} (${item.verification_mode})`),
    '',
    '## Constraints for Lovable, Bolt, v0, or a developer',
    '- Build for the primary customer above.',
    '- Solve one core job before adding secondary features.',
    '- Instrument one observable success event.',
    '- Preserve the evidence provenance; do not turn assumptions into product claims.',
    '',
    '## Next experiment',
    result?.nextExperiment || sprint.next_experiment || 'Collect the next independent customer signal.',
  ].filter(Boolean).join('\n');
}

export function downloadTextFile(filename: string, contents: string, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
