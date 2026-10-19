// profiles.current_focus holds either the founder's own words (Edit Profile) or
// the goal code onboarding saved, such as 'reach_three_customers'. The retention
// emails read the code, so it stays a code in the database; the public profile
// shows the sentence instead.
const GOAL_LABELS: Record<string, string> = {
  validate_problem: 'Validating the customer problem',
  win_first_customer: 'Winning the first paying customer',
  reach_three_customers: 'Reaching three paying customers',
  repeatable_growth: 'Finding repeatable growth',
  build_product: 'Shipping the smallest useful product',
  launch: 'Launching and finding the first channel',
  raise: 'Preparing to raise funding',
};

export function currentFocusLabel(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  return GOAL_LABELS[text] ?? text;
}
