type OutcomeFlag =
  | 'journey_outcome_truth_v1'
  | 'validation_sprint_v1'
  | 'homepage_validation_positioning_v1'
  | 'credit_rollover_v1';

const ENV_KEYS: Record<OutcomeFlag, string> = {
  journey_outcome_truth_v1: 'VITE_JOURNEY_OUTCOME_TRUTH_V1',
  validation_sprint_v1: 'VITE_VALIDATION_SPRINT_V1',
  homepage_validation_positioning_v1: 'VITE_HOMEPAGE_VALIDATION_POSITIONING_V1',
  credit_rollover_v1: 'VITE_CREDIT_ROLLOVER_V1',
};

/**
 * Outcome-led features ship on with an environment-level kill switch. Set the
 * matching VITE_* value to "false" to roll a surface back without deleting data.
 */
export function isOutcomeFeatureEnabled(flag: OutcomeFlag): boolean {
  const value = import.meta.env[ENV_KEYS[flag]];
  return value !== 'false';
}

export const OUTCOME_FEATURE_FLAGS = {
  journeyOutcomeTruth: () => isOutcomeFeatureEnabled('journey_outcome_truth_v1'),
  validationSprint: () => isOutcomeFeatureEnabled('validation_sprint_v1'),
  homepagePositioning: () => isOutcomeFeatureEnabled('homepage_validation_positioning_v1'),
  creditRollover: () => isOutcomeFeatureEnabled('credit_rollover_v1'),
} as const;
