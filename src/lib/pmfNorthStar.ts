import type { JourneyOutcomeStatus } from './journeyOutcomes';

export const PMF_DECISION_WINDOW_DAYS = 14;
export const PMF_READY_SIGNAL_COUNT = 5;
export const PMF_VERIFIED_SIGNAL_COUNT = 25;

export const PMF_DECISIONS = ['build', 'narrow', 'pivot', 'stop'] as const;
export type PMFDecision = (typeof PMF_DECISIONS)[number];

export interface PMFDecisionQualification {
  contextStartedAt: string | Date;
  decisionReachedAt: string | Date;
  decision: string | null | undefined;
  outcomeStatus: JourneyOutcomeStatus;
  weightedSignalCount: number;
}

export function normalizePMFDecision(value: string | null | undefined): PMFDecision | null {
  const normalized = value?.trim().toLowerCase();
  return PMF_DECISIONS.includes(normalized as PMFDecision) ? normalized as PMFDecision : null;
}

export function getPMFOutcomeStatus(weightedSignalCount: number): JourneyOutcomeStatus {
  if (weightedSignalCount >= PMF_VERIFIED_SIGNAL_COUNT) return 'verified';
  if (weightedSignalCount >= PMF_READY_SIGNAL_COUNT) return 'ready';
  return 'draft';
}

export function qualifiesForFourteenDayPMFDecision(input: PMFDecisionQualification): boolean {
  if (!normalizePMFDecision(input.decision)) return false;
  if (!['ready', 'verified'].includes(input.outcomeStatus)) return false;
  if (input.weightedSignalCount < PMF_READY_SIGNAL_COUNT) return false;

  const startedAt = new Date(input.contextStartedAt).getTime();
  const reachedAt = new Date(input.decisionReachedAt).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(reachedAt) || reachedAt < startedAt) return false;

  return reachedAt - startedAt <= PMF_DECISION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
