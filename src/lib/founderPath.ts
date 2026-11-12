import { share } from './adoptionMetrics.ts';

/**
 * How far real founders get along the validation path, as returned by
 * admin_founder_path_v1() (20261111170000). Phase 6 of the 2026-11-11
 * capability plan: prove the path end to end with recruited founders.
 */
export type FounderPathStepKey =
  | 'icp'
  | 'published'
  | 'response'
  | 'pmf_score'
  | 'gtm_plan'
  | 'play_active'
  | 'proof_10'
  | 'traction_week';

export interface FounderPathFounder {
  userId: string;
  name: string;
  email: string | null;
  signedUpAt: string;
  /** 0 = nothing yet, 1..8 = the furthest step in path order. */
  furthest: number;
  reached: Record<FounderPathStepKey, boolean>;
}

export interface FounderPath {
  generatedAt: string;
  cohortId: string | null;
  since: string | null;
  accounts: number;
  steps: Array<{ step: FounderPathStepKey; founders: number }>;
  founders: FounderPathFounder[];
}

export const FOUNDER_PATH_STEPS: Array<{ key: FounderPathStepKey; label: string; short: string; hint: string }> = [
  { key: 'icp', label: 'ICP saved', short: 'ICP', hint: 'An ICP Builder draft' },
  { key: 'published', label: 'Something published', short: 'Live', hint: 'A survey, waitlist, demo page or MVP app' },
  { key: 'response', label: 'First outside response', short: 'Reply', hint: 'A survey answer, signup or lead form entry' },
  { key: 'pmf_score', label: 'PMF score', short: 'PMF', hint: 'Scored in PMF Lab' },
  { key: 'gtm_plan', label: 'GTM plan saved', short: 'GTM', hint: 'A plan from GTM Strategist' },
  { key: 'play_active', label: 'Play started', short: 'Play', hint: 'A GTM play active or completed' },
  { key: 'proof_10', label: 'First Customer Proof, 10 contacts', short: 'Proof', hint: 'A proof sprint with 10 or more contacts' },
  { key: 'traction_week', label: 'Traction week logged', short: 'Week', hint: 'A week saved in Traction Engine' },
];

/** The Phase 6 success bar: 3 founders at a PMF score, 1 at First Customer Proof. */
export const FOUNDER_PATH_TARGETS: Partial<Record<FounderPathStepKey, number>> = { pmf_score: 3, proof_10: 1 };

/** Each step with its label, its share of all accounts, and its target when it has one. */
export function founderPathRows(path: FounderPath) {
  const counts = new Map(path.steps.map((step) => [step.step, step.founders]));
  return FOUNDER_PATH_STEPS.map((step) => {
    const founders = counts.get(step.key) ?? 0;
    const target = FOUNDER_PATH_TARGETS[step.key];
    return {
      ...step,
      founders,
      ofAccounts: share(founders, path.accounts),
      target: target ?? null,
      targetMet: target !== undefined ? founders >= target : null,
    };
  });
}

/** The label of a founder's furthest step, or a dash before the first. */
export function furthestLabel(furthest: number) {
  return furthest > 0 ? FOUNDER_PATH_STEPS[Math.min(furthest, FOUNDER_PATH_STEPS.length) - 1].label : 'Not started';
}
