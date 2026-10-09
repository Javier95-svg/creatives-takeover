import { ANGEL_SECTOR_OPTIONS } from '../data/angelSectors.ts';
import { isActivationIntent } from './activationIntent.ts';

/**
 * The allowed value for every onboarding answer, checked on the server before
 * anything is stored. The database repeats these checks (see
 * onboarding_answers_problem) so a direct RPC call cannot store a value the
 * rest of the platform does not recognise.
 *
 * Pure and import-light on purpose: the onboarding-context edge function and
 * node tests load it without the browser Supabase client.
 */

export const ANSWER_OPTIONS = {
  businessModel: ['b2b_saas', 'service', 'b2c_product', 'marketplace', 'ecommerce', 'media', 'other'],
  evidenceState: ['none', 'prospects', 'replies', 'conversations', 'commitment', 'payment', 'repeatable_growth'],
  productState: ['idea_only', 'prototype_demo', 'mvp_beta', 'live_product'],
  customerCountBand: ['0', '1', '2', '3', '4_plus'],
  revenueBand: ['none', 'under_1k', '1k_10k', '10k_50k', 'over_50k'],
  primaryGoal: ['validate_problem', 'win_first_customer', 'reach_three_customers', 'repeatable_growth', 'build_product', 'launch', 'raise'],
  blocker: ['customer_clarity', 'prospect_access', 'messaging', 'sales_conversion', 'product_delivery', 'traction_growth', 'fundraising', 'accountability', 'team'],
  fundraisingStatus: ['not_now', 'preparing', 'talking_investors', 'raising_now'],
  cofounderSituation: ['actively_looking', 'solo_ok'],
  runwayMonths: ['under_3', '3_6', '6_12', 'over_12', 'not_applicable'],
  builderStartingPoint: ['exploring', 'idea_chosen'],
} as const;

export const WEEKLY_CAPACITY_OPTIONS = [2, 5, 10, 20] as const;
export const MAX_SECTORS = 12;

type Answers = Record<string, unknown>;

function isBlank(value: unknown) {
  return value === undefined || value === null || value === '';
}

/**
 * The first problem with a set of answers, or null. Only fields that are
 * present are checked, so the same rule serves a full completion and a
 * partial focus edit.
 */
export function onboardingAnswersProblem(answers: Answers): string | null {
  for (const [field, options] of Object.entries(ANSWER_OPTIONS)) {
    const value = answers[field];
    if (isBlank(value)) continue;
    if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) {
      return `Invalid value for ${field}`;
    }
  }

  const capacity = answers.weeklyCapacityHours;
  if (!isBlank(capacity) && !(WEEKLY_CAPACITY_OPTIONS as readonly unknown[]).includes(Number(capacity))) {
    return 'Invalid value for weeklyCapacityHours';
  }

  if (answers.sectors !== undefined) {
    const sectors = answers.sectors;
    if (!Array.isArray(sectors) || sectors.length > MAX_SECTORS) return 'Invalid sectors';
    if (sectors.some((sector) => typeof sector !== 'string' || !(ANGEL_SECTOR_OPTIONS as readonly string[]).includes(sector))) {
      return 'Invalid sectors';
    }
  }

  if (answers.workingDays !== undefined) {
    const days = answers.workingDays;
    if (!Array.isArray(days) || days.length > 7 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return 'Invalid workingDays';
    }
  }

  if (!isBlank(answers.selectedIntent) && !isActivationIntent(answers.selectedIntent)) {
    return 'Invalid value for selectedIntent';
  }
  if (typeof answers.startupBrief === 'string' && answers.startupBrief.trim().length > 280) return 'Startup brief is too long';
  if (typeof answers.country === 'string' && answers.country.trim().length > 100) return 'Country is too long';
  if (typeof answers.projectName === 'string' && answers.projectName.trim().length > 120) return 'Project name is too long';
  return null;
}
