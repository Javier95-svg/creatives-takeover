import type { OnboardingBlocker, OnboardingPrimaryGoal } from './onboardingContext.ts';

// Use the founder's stated need as the first matching signal. These labels
// match the mentor directory taxonomy and remain editable in Startup Profile.
const BY_BLOCKER: Partial<Record<OnboardingBlocker, string>> = {
  customer_clarity: 'Strategy',
  prospect_access: 'Business Development',
  messaging: 'Growth Marketing',
  sales_conversion: 'Sales',
  product_delivery: 'Product Development',
  traction_growth: 'Growth Marketing',
  fundraising: 'Fundraising',
  accountability: 'Strategy',
  team: 'HR & Team Building',
};

const BY_GOAL: Partial<Record<OnboardingPrimaryGoal, string>> = {
  validate_problem: 'Strategy',
  win_first_customer: 'Sales',
  reach_three_customers: 'Sales',
  repeatable_growth: 'Growth Marketing',
  build_product: 'Product Development',
  launch: 'Growth Marketing',
  raise: 'Fundraising',
};

export function onboardingSupportNeeds(goal: OnboardingPrimaryGoal | '', blocker: OnboardingBlocker | ''): string[] {
  return [...new Set([blocker && BY_BLOCKER[blocker], goal && BY_GOAL[goal]].filter((value): value is string => Boolean(value)))];
}
