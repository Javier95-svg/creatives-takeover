/**
 * SINGLE SOURCE OF TRUTH for plan-based access rules.
 *
 * Components should call usePlanAccess(feature) instead of hardcoding tier checks.
 */

export type Plan = 'rookie' | 'starter' | 'rising' | 'pro';

export type AccessRule =
  | 'full'
  | 'free'
  | 'credits'
  | 'locked'
  | 'locked_progressive'
  | 'list_only'
  | 'quota_1_per_month'
  | 'quota_2_per_month'
  | 'quota_10_per_month'
  | 'quota_3_free_then_credits'
  | 'business_case_only';

export const PLAN_PERMISSIONS: Record<string, Record<Plan, AccessRule>> = {
  dashboard_mode: { rookie: 'full', starter: 'full', rising: 'full', pro: 'full' },

  icp_builder:    { rookie: 'free',   starter: 'free',   rising: 'free',    pro: 'free' },
  waitlist_maker: { rookie: 'locked', starter: 'credits', rising: 'full',   pro: 'full' },
  pmf_lab:        { rookie: 'locked', starter: 'credits', rising: 'full',   pro: 'full' },
  mvp_builder:    { rookie: 'locked_progressive', starter: 'locked_progressive', rising: 'credits', pro: 'credits' },
  tech_stack:     { rookie: 'locked_progressive', starter: 'locked_progressive', rising: 'full',    pro: 'full' },
  gtm_strategist: { rookie: 'locked_progressive', starter: 'locked_progressive', rising: 'credits', pro: 'credits' },
  directories:    { rookie: 'locked_progressive', starter: 'locked_progressive', rising: 'full',    pro: 'full' },

  discovery_calls:  { rookie: 'quota_1_per_month', starter: 'quota_2_per_month', rising: 'quota_3_free_then_credits', pro: 'full' },
  cofounder_posts:  { rookie: 'quota_1_per_month', starter: 'quota_2_per_month', rising: 'full', pro: 'full' },
  angels_community: { rookie: 'locked', starter: 'locked', rising: 'locked', pro: 'full' },

  vc_search_browse:      { rookie: 'full', starter: 'full', rising: 'full', pro: 'full' },
  vc_search_profile:     { rookie: 'locked', starter: 'quota_2_per_month', rising: 'quota_10_per_month', pro: 'full' },
  accelerator_browse:    { rookie: 'full', starter: 'full', rising: 'full', pro: 'full' },
  accelerator_profile:   { rookie: 'locked', starter: 'quota_2_per_month', rising: 'quota_10_per_month', pro: 'full' },

  email_templates:     { rookie: 'locked', starter: 'full', rising: 'full', pro: 'full' },
  pitch_deck_analyzer: { rookie: 'locked', starter: 'locked', rising: 'full', pro: 'full' },
  prompt_library:      { rookie: 'business_case_only', starter: 'full', rising: 'full', pro: 'full' },
  insighta_test:       { rookie: 'full', starter: 'full', rising: 'full', pro: 'full' },

  newspaper: { rookie: 'full', starter: 'full', rising: 'full', pro: 'full' },
  profile:   { rookie: 'full', starter: 'full', rising: 'full', pro: 'full' },

  group_office_hours: { rookie: 'locked', starter: 'locked', rising: 'locked', pro: 'full' },
  priority_support:   { rookie: 'locked', starter: 'locked', rising: 'locked', pro: 'full' },
};

export const MONTHLY_FREE_QUOTAS: Record<string, Record<Plan, number>> = {
  discovery_calls:      { rookie: 1, starter: 2, rising: 3, pro: Infinity },
  cofounder_posts:      { rookie: 1, starter: 2, rising: Infinity, pro: Infinity },
  vc_profiles:          { rookie: 0, starter: 2, rising: 10, pro: Infinity },
  accelerator_profiles: { rookie: 0, starter: 2, rising: 10, pro: Infinity },
};

export const PLAN_LABELS: Record<Plan, string> = {
  rookie: 'Rookie',
  starter: 'Starter',
  rising: 'Rising',
  pro: 'Pro',
};

export const UPGRADE_TARGET: Partial<Record<AccessRule, Plan>> = {
  locked: 'starter',
  locked_progressive: 'rising',
  list_only: 'starter',
  quota_1_per_month: 'starter',
  quota_2_per_month: 'rising',
  quota_10_per_month: 'pro',
  business_case_only: 'starter',
};
