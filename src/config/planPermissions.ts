/**
 * Canonical plan-entitlement catalog.
 *
 * Route guards, dashboard rendering, quota widgets, and credit charging should
 * all resolve from this file instead of hardcoded tier checks.
 */

import { CREDIT_COSTS, getCreditCostForPlan, TIER_MONTHLY_CREDITS, type CreditFeature } from './constants.ts';

export { CREDIT_COSTS };

export type Plan = 'rookie' | 'starter' | 'rising' | 'pro';

export interface PlanSummary {
  name: string;
  price: number;
  monthlyCredits: number;
  vcViewLimit: number;
  acceleratorViewLimit: number;
  description: string;
}

export type GateState =
  | 'full'
  | 'credit_gated'
  | 'preview_only'
  | 'quota_limited'
  | 'locked'
  | 'hidden';

export type AccessRule = GateState;
export type MonetizationModel =
  | 'free'
  | 'credit_metered'
  | 'quota_limited'
  | 'plan_gated';

export type RestrictionReason =
  | 'plan_locked'
  | 'preview_only'
  | 'insufficient_credits'
  | 'monthly_limit_reached'
  | 'payment_lapsed';

export type DashboardModeVariant = 'rookie' | 'starter' | 'rising' | 'pro';

export type DashboardNavIconKey =
  | 'home'
  | 'folder_open'
  | 'bookmark_check'
  | 'calendar'
  | 'check_square'
  | 'target'
  | 'clipboard_list'
  | 'bar_chart_3'
  | 'gift'
  | 'repeat_2';

export type DashboardSidebarToolKey =
  | 'icp_builder'
  | 'waitlist_maker'
  | 'pmf_lab'
  | 'mvp_builder'
  | 'tech_stack'
  | 'gtm_strategist'
  | 'directories'
  | 'find_mentor'
  | 'find_cofounder'
  | 'find_angel'
  | 'vc_search'
  | 'accelerator_hunt'
  | 'email_templates'
  | 'pitch_deck_analyzer'
  | 'insighta_test'
  | 'newspaper'
  | 'prompt_library'
  | 'saved_mentors'
  | 'decision_sprint'
  | 'core_metrics'
  | 'ai_goals';

export interface DashboardNavItem {
  path: string;
  label: string;
  description?: string;
  iconKey: DashboardNavIconKey;
  sectionId?: string;
}

export interface DashboardModeConfig {
  label: string;
  badgeDescription: string;
  subtitle: string;
  sectionIds: string[];
  activeStages: number[];
  previewStages: number[];
  showUpgradeBanner: boolean;
  navItems: DashboardNavItem[];
  visibleTools: DashboardSidebarToolKey[];
}

export type DashboardSurfaceFeature =
  | 'dashboard_access'
  | 'focus_funnel'
  | 'core_metrics'
  | 'routine'
  | 'decision_sprint'
  | 'your_tasks';

export interface DashboardSurfaceAccessResult {
  feature: DashboardSurfaceFeature;
  plan: Plan;
  hasAccess: boolean;
  requiredPlan?: Plan;
}

export type FeatureKey =
  | 'dashboard_mode'
  | 'icp_builder'
  | 'waitlist_maker'
  | 'demo_studio'
  | 'pmf_lab'
  | 'mvp_builder'
  | 'tech_stack'
  | 'gtm_strategist'
  | 'directories'
  | 'discovery_calls'
  | 'cofounder_posts'
  | 'angels_community'
  | 'vc_search_browse'
  | 'vc_search_profile'
  | 'accelerator_browse'
  | 'accelerator_profile'
  | 'email_templates'
  | 'pitch_deck_analyzer'
  | 'prompt_library'
  | 'prompt_library_export'
  | 'insighta_test'
  | 'newspaper'
  | 'profile';

export type QuotaFeatureKey =
  | 'discovery_calls'
  | 'cofounder_posts'
  | 'vc_search_profile'
  | 'accelerator_profile'
  | 'directories';

interface FeatureEntitlementConfig {
  state: GateState;
  monetizationModel?: MonetizationModel;
  visibility?: 'visible' | 'hidden';
  requiredPlan?: Plan;
  monthlyLimit?: number;
  creditFeature?: CreditFeature;
  freeModelsOnly?: boolean;
  dashboardMode?: DashboardModeVariant;
}

export interface EntitlementResult {
  plan: Plan;
  state: GateState;
  reason?: RestrictionReason;
  upgradeTarget?: Plan;
  creditFeature?: CreditFeature;
  creditCost?: number;
  monetizationModel: MonetizationModel;
  monthlyLimit?: number;
  usedThisMonth?: number;
  remaining?: number;
  resetsAt?: string;
  dashboardMode?: DashboardModeVariant;
  uiMode: 'full' | 'preview' | 'locked';
  isVisible: boolean;
  freeModelsOnly: boolean;
}

export interface QuotaStatus {
  feature: QuotaFeatureKey;
  plan: Plan;
  state: GateState;
  used: number;
  limit: number;
  remaining: number;
  hasUnlimited: boolean;
  canUse: boolean;
  isLocked: boolean;
  upgradeTarget?: Plan;
}

export const PLAN_LABELS: Record<Plan, string> = {
  rookie: 'Rookie',
  starter: 'Starter',
  rising: 'Rising',
  pro: 'Pro',
};

export const PLAN_SEQUENCE: Plan[] = ['rookie', 'starter', 'rising', 'pro'];

export const PLAN_MONTHLY_CREDITS: Record<Plan, number> = {
  rookie: TIER_MONTHLY_CREDITS.rookie,
  starter: TIER_MONTHLY_CREDITS.starter,
  rising: TIER_MONTHLY_CREDITS.rising,
  pro: TIER_MONTHLY_CREDITS.pro,
};

export const PLAN_HIGHLIGHTS: Record<Plan, string[]> = {
  rookie: [
    'Stage 1 guided dashboard (Rookie Mode)',
    'ICP Builder free + Insighta Test & Newspaper',
    'MVP Builder, billed per action from credits',
    'Browse VC Search & Accelerator Hunt',
    'Unlimited Discovery Calls (10 credits per booking)',
  ],
  starter: [
    'Everything in Rookie, with Stages 1-3 unlocked',
    'Demo Studio + Product-Market Fit Lab',
    'Full Email Templates library',
    'VC Search & Accelerator Hunt: 2 profile views/month',
    '2 Find a Co-Founder posts per month',
  ],
  rising: [
    'Everything in Starter, with all 5 stages active',
    'GTM Strategist + Tech Stack Builder',
    'Pitch Deck Analyzer (full access)',
    'Founders Unleashed podcast + Newspaper exclusives',
    'VC Search & Accelerator Hunt: 10 profile views/month',
    'Unlimited Find a Co-Founder posts',
  ],
  pro: [
    'Everything in Rising, plus the Pro War Room',
    'Find Your Angel investor matching',
    'Fundraising-aware dashboard & insights',
    'Priority founder support',
    'Unlimited VC Search & Accelerator profile views',
    'Unlimited Find a Co-Founder posts',
  ],
};

const SHARED_DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { path: '/dashboard', label: 'Command Center', description: 'Daily overview', iconKey: 'home' },
  { path: '/dashboard/files', label: 'Files', description: 'Saved proof and artifacts', iconKey: 'folder_open' },
  { path: '/dashboard/tasks', label: 'Tasks', description: 'Actions and deadlines', iconKey: 'check_square' },
  { path: '/dashboard/routine', label: 'Routine', description: 'Habits and weekly rhythm', iconKey: 'repeat_2' },
  { path: '/dashboard/referral', label: 'Referrals', description: 'Invite and grow', iconKey: 'gift' },
];

export const DASHBOARD_MODE_CONFIG: Record<DashboardModeVariant, DashboardModeConfig> = {
  rookie: {
    label: 'Rookie Mode',
    badgeDescription: 'Guided and simplified',
    subtitle: 'A simplified dashboard for getting the first signal right.',
    sectionIds: ['mode-welcome', 'mode-usage', 'mode-preview'],
    activeStages: [1],
    previewStages: [4, 5],
    showUpgradeBanner: true,
    navItems: SHARED_DASHBOARD_NAV_ITEMS,
    visibleTools: ['icp_builder', 'mvp_builder', 'saved_mentors', 'find_mentor', 'find_cofounder'],
  },
  starter: {
    label: 'Starter Mode',
    badgeDescription: 'Structured and progressing',
    subtitle: 'A structured workspace for moving through Stages 1 to 3.',
    sectionIds: ['mode-tasks', 'mode-usage'],
    activeStages: [1, 2, 3],
    previewStages: [4, 5],
    showUpgradeBanner: true,
    navItems: SHARED_DASHBOARD_NAV_ITEMS,
    visibleTools: ['icp_builder', 'waitlist_maker', 'pmf_lab', 'mvp_builder', 'saved_mentors', 'find_mentor', 'find_cofounder', 'vc_search', 'accelerator_hunt', 'email_templates', 'prompt_library', 'ai_goals'],
  },
  rising: {
    label: 'Rising Mode',
    badgeDescription: 'Operational and productive',
    subtitle: 'Your full operator cockpit across all five stages.',
    sectionIds: ['mode-usage', 'routine', 'your-tasks'],
    activeStages: [1, 2, 3, 4, 5],
    previewStages: [],
    showUpgradeBanner: false,
    navItems: SHARED_DASHBOARD_NAV_ITEMS,
    visibleTools: ['icp_builder', 'waitlist_maker', 'pmf_lab', 'mvp_builder', 'tech_stack', 'gtm_strategist', 'directories', 'saved_mentors', 'decision_sprint', 'core_metrics', 'ai_goals', 'find_mentor', 'find_cofounder', 'vc_search', 'accelerator_hunt', 'email_templates', 'pitch_deck_analyzer', 'insighta_test', 'newspaper', 'prompt_library'],
  },
  pro: {
    label: 'Pro Mode',
    badgeDescription: 'Strategic and data-rich',
    subtitle: 'Your fundraising-aware command layer with premium support.',
    sectionIds: ['mode-support', 'mode-fundraising', 'mode-usage', 'routine', 'your-tasks'],
    activeStages: [1, 2, 3, 4, 5],
    previewStages: [],
    showUpgradeBanner: false,
    navItems: SHARED_DASHBOARD_NAV_ITEMS,
    visibleTools: ['icp_builder', 'waitlist_maker', 'pmf_lab', 'mvp_builder', 'tech_stack', 'gtm_strategist', 'directories', 'saved_mentors', 'decision_sprint', 'core_metrics', 'ai_goals', 'find_mentor', 'find_cofounder', 'find_angel', 'vc_search', 'accelerator_hunt', 'email_templates', 'pitch_deck_analyzer', 'insighta_test', 'newspaper', 'prompt_library'],
  },
};

const DASHBOARD_SURFACE_PATHS: Record<Exclude<DashboardSurfaceFeature, 'dashboard_access'>, string> = {
  focus_funnel: '/dashboard/tasks',
  core_metrics: '/core-metrics',
  routine: '/dashboard/routine',
  decision_sprint: '/decision-sprint',
  your_tasks: '/dashboard/tasks',
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard_mode: 'Dashboard Mode',
  icp_builder: 'ICP Builder',
  waitlist_maker: 'Demo Studio',
  demo_studio: 'Demo Studio',
  pmf_lab: 'PMF Lab',
  mvp_builder: 'MVP Builder',
  tech_stack: 'Tech Stack Builder',
  gtm_strategist: 'GTM Strategist',
  directories: 'Directories',
  discovery_calls: 'Discovery Calls',
  cofounder_posts: 'Find a Co-Founder posts',
  angels_community: 'Find Your Angel',
  vc_search_browse: 'VC Search',
  vc_search_profile: 'VC Search profiles',
  accelerator_browse: 'Accelerator Hunt',
  accelerator_profile: 'Accelerator Hunt profiles',
  email_templates: 'Email Templates',
  pitch_deck_analyzer: 'Pitch Deck Analyzer',
  prompt_library: 'Prompt Library',
  prompt_library_export: 'Prompt Library export',
  insighta_test: 'Insighta Test',
  newspaper: 'Newspaper',
  profile: 'Profile',
};

export const QUOTA_FEATURE_LABELS: Record<QuotaFeatureKey, { singular: string; plural: string }> = {
  discovery_calls: { singular: 'discovery call', plural: 'discovery calls' },
  cofounder_posts: { singular: 'Find a Co-Founder post', plural: 'Find a Co-Founder posts' },
  vc_search_profile: { singular: 'VC profile view', plural: 'VC profile views' },
  accelerator_profile: { singular: 'accelerator profile view', plural: 'accelerator profile views' },
  directories: { singular: 'directory visit', plural: 'directory visits' },
};

export const FEATURE_ENTITLEMENTS: Record<FeatureKey, Record<Plan, FeatureEntitlementConfig>> = {
  dashboard_mode: {
    rookie: { state: 'full', dashboardMode: 'rookie' },
    starter: { state: 'full', dashboardMode: 'starter' },
    rising: { state: 'full', dashboardMode: 'rising' },
    pro: { state: 'full', dashboardMode: 'pro' },
  },

  icp_builder: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  waitlist_maker: {
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
  },
  // Demo Studio reuses the WAITLIST_GENERATION credit key for now so billing
  // stays intact while it gets its own entitlement surface.
  demo_studio: {
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'WAITLIST_GENERATION' },
  },
  // creditFeature is PMF_SCORING — the key the live PMF Lab actually charges
  // (5 credits) — so the quoted cost matches the charge on every plan.
  pmf_lab: {
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PMF_SCORING' },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PMF_SCORING' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PMF_SCORING' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PMF_SCORING' },
  },
  mvp_builder: {
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'APP_BUILDER_GENERATE', freeModelsOnly: true },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'APP_BUILDER_GENERATE', freeModelsOnly: true },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'APP_BUILDER_GENERATE' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'APP_BUILDER_GENERATE' },
  },
  tech_stack: {
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'TECH_STACK_GENERATION' },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'TECH_STACK_GENERATION' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'TECH_STACK_GENERATION' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'TECH_STACK_GENERATION' },
  },
  gtm_strategist: {
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'GTM_ANALYSIS' },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'GTM_ANALYSIS' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'GTM_ANALYSIS' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'GTM_ANALYSIS' },
  },
  // Open to every plan, metered like VC Search: a few free directory "Visit"
  // opens per month, then upgrade for more. Pro is unlimited.
  directories: {
    rookie: { state: 'quota_limited', monetizationModel: 'quota_limited', monthlyLimit: 3, requiredPlan: 'starter' },
    starter: { state: 'quota_limited', monetizationModel: 'quota_limited', monthlyLimit: 10, requiredPlan: 'rising' },
    rising: { state: 'quota_limited', monetizationModel: 'quota_limited', monthlyLimit: 15, requiredPlan: 'pro' },
    pro: { state: 'full', monetizationModel: 'quota_limited' },
  },

  discovery_calls: {
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'DISCOVERY_CALL' },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'DISCOVERY_CALL' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'DISCOVERY_CALL' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'DISCOVERY_CALL' },
  },
  cofounder_posts: {
    rookie: { state: 'quota_limited', monetizationModel: 'quota_limited', monthlyLimit: 1, requiredPlan: 'starter' },
    starter: { state: 'quota_limited', monetizationModel: 'quota_limited', monthlyLimit: 2, requiredPlan: 'rising' },
    rising: { state: 'full', monetizationModel: 'quota_limited' },
    pro: { state: 'full', monetizationModel: 'quota_limited' },
  },
  angels_community: {
    rookie: { state: 'locked', monetizationModel: 'plan_gated', visibility: 'hidden', requiredPlan: 'pro' },
    starter: { state: 'locked', monetizationModel: 'plan_gated', visibility: 'hidden', requiredPlan: 'pro' },
    rising: { state: 'locked', monetizationModel: 'plan_gated', visibility: 'hidden', requiredPlan: 'pro' },
    pro: { state: 'full', monetizationModel: 'plan_gated' },
  },

  vc_search_browse: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  vc_search_profile: {
    rookie: { state: 'locked', requiredPlan: 'starter', monthlyLimit: 0 },
    starter: { state: 'quota_limited', monthlyLimit: 2, requiredPlan: 'rising' },
    rising: { state: 'quota_limited', monthlyLimit: 10, requiredPlan: 'pro' },
    pro: { state: 'full' },
  },
  accelerator_browse: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  accelerator_profile: {
    rookie: { state: 'locked', requiredPlan: 'starter', monthlyLimit: 0 },
    starter: { state: 'quota_limited', monthlyLimit: 2, requiredPlan: 'rising' },
    rising: { state: 'quota_limited', monthlyLimit: 10, requiredPlan: 'pro' },
    pro: { state: 'full' },
  },

  email_templates: {
    rookie: { state: 'locked', visibility: 'hidden', requiredPlan: 'starter' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  pitch_deck_analyzer: {
    // Open to every tier: anonymous/free get the Quick Score; signed-in users get
    // the deep audit (1st free, then credit-metered).
    rookie: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PITCH_DECK_ANALYZER' },
    starter: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PITCH_DECK_ANALYZER' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PITCH_DECK_ANALYZER' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PITCH_DECK_ANALYZER' },
  },
  prompt_library: {
    rookie: { state: 'full', freeModelsOnly: true },
    starter: { state: 'full', freeModelsOnly: true },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  prompt_library_export: {
    rookie: { state: 'locked', monetizationModel: 'plan_gated', requiredPlan: 'rising' },
    starter: { state: 'locked', monetizationModel: 'plan_gated', requiredPlan: 'rising' },
    rising: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PROMPT_GENERATION' },
    pro: { state: 'full', monetizationModel: 'credit_metered', creditFeature: 'PROMPT_GENERATION' },
  },
  insighta_test: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  newspaper: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
  profile: {
    rookie: { state: 'full' },
    starter: { state: 'full' },
    rising: { state: 'full' },
    pro: { state: 'full' },
  },
};

export const PLAN_PERMISSIONS: Record<FeatureKey, Record<Plan, AccessRule>> = Object.fromEntries(
  Object.entries(FEATURE_ENTITLEMENTS).map(([feature, plans]) => [
    feature,
    Object.fromEntries(
      Object.entries(plans).map(([plan, config]) => [plan, config.state])
    ),
  ])
) as Record<FeatureKey, Record<Plan, AccessRule>>;

export const MONTHLY_FREE_QUOTAS: Record<string, Record<Plan, number>> = {
  discovery_calls: { rookie: Infinity, starter: Infinity, rising: Infinity, pro: Infinity },
  cofounder_posts: { rookie: 1, starter: 2, rising: Infinity, pro: Infinity },
  vc_profiles: { rookie: 0, starter: 2, rising: 10, pro: Infinity },
  accelerator_profiles: { rookie: 0, starter: 2, rising: 10, pro: Infinity },
  directory_visits: { rookie: 3, starter: 10, rising: 15, pro: Infinity },
};

export const PLAN_SUMMARIES: Record<Plan, PlanSummary> = {
  rookie: {
    name: PLAN_LABELS.rookie,
    price: 0,
    monthlyCredits: PLAN_MONTHLY_CREDITS.rookie,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.rookie,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.rookie,
    description: 'A guided Stage 1 dashboard with light monthly usage and previews of the later build and launch layers.',
  },
  starter: {
    name: PLAN_LABELS.starter,
    price: 9,
    monthlyCredits: PLAN_MONTHLY_CREDITS.starter,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.starter,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.starter,
    description: 'Structured execution across Stages 1 to 3 with PMF workflows, prompt shortcuts, and light investor research.',
  },
  rising: {
    name: PLAN_LABELS.rising,
    price: 29,
    monthlyCredits: PLAN_MONTHLY_CREDITS.rising,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.rising,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.rising,
    description: 'Full operating cockpit across all five stages with credit-metered build tools and 10 VC plus 10 accelerator profile views per billing cycle.',
  },
  pro: {
    name: PLAN_LABELS.pro,
    price: 65,
    monthlyCredits: PLAN_MONTHLY_CREDITS.pro,
    vcViewLimit: MONTHLY_FREE_QUOTAS.vc_profiles.pro,
    acceleratorViewLimit: MONTHLY_FREE_QUOTAS.accelerator_profiles.pro,
    description: 'Premium war room with Angels access, unlimited research views, and added support for fundraising execution.',
  },
};

export function normalizePlan(value: string | null | undefined): Plan {
  const normalized = (value || 'rookie').trim().toLowerCase();

  if (['pro', 'professional', 'elite', 'team', 'teams', 'enterprise'].includes(normalized)) {
    return 'pro';
  }
  if (['rising', 'creator', 'premium'].includes(normalized)) {
    return 'rising';
  }
  if (['starter', 'basic'].includes(normalized)) {
    return 'starter';
  }

  return 'rookie';
}

export function getNextPlan(plan: Plan): Plan {
  const currentIndex = PLAN_SEQUENCE.indexOf(plan);
  if (currentIndex < 0 || currentIndex === PLAN_SEQUENCE.length - 1) {
    return 'pro';
  }

  return PLAN_SEQUENCE[currentIndex + 1];
}

export function resolveDashboardMode(plan: Plan): DashboardModeVariant {
  return FEATURE_ENTITLEMENTS.dashboard_mode[plan]?.dashboardMode ?? plan;
}

export function getDashboardModeConfig(mode: DashboardModeVariant): DashboardModeConfig {
  return DASHBOARD_MODE_CONFIG[mode];
}

export function getPlanThatActivatesStage(stageId: number): Plan | undefined {
  return PLAN_SEQUENCE.find((plan) => {
    const mode = resolveDashboardMode(plan);
    return DASHBOARD_MODE_CONFIG[mode].activeStages.includes(stageId);
  });
}

export function resolveDashboardSurfaceAccess(
  feature: DashboardSurfaceFeature,
  plan: Plan
): DashboardSurfaceAccessResult {
  if (feature === 'dashboard_access') {
    return { feature, plan, hasAccess: true };
  }

  const targetPath = DASHBOARD_SURFACE_PATHS[feature];
  const currentMode = resolveDashboardMode(plan);
  const hasAccess = getDashboardModeConfig(currentMode).navItems.some((item) => item.path === targetPath);

  if (hasAccess) {
    return { feature, plan, hasAccess: true };
  }

  const requiredPlan = PLAN_SEQUENCE.find((candidatePlan) => {
    const candidateMode = resolveDashboardMode(candidatePlan);
    return getDashboardModeConfig(candidateMode).navItems.some((item) => item.path === targetPath);
  });

  return {
    feature,
    plan,
    hasAccess: false,
    requiredPlan,
  };
}

export function resolveEntitlement(feature: FeatureKey, plan: Plan): EntitlementResult {
  const config = FEATURE_ENTITLEMENTS[feature]?.[plan] ?? { state: 'full' as const };
  const state = config.state;
  const monthlyLimit = config.monthlyLimit;
  const creditCost = config.creditFeature ? getCreditCostForPlan(config.creditFeature, plan) ?? undefined : undefined;
  const monetizationModel: MonetizationModel =
    config.monetizationModel ??
    (config.creditFeature
      ? 'credit_metered'
      : state === 'quota_limited'
        ? 'quota_limited'
        : state === 'locked' || state === 'hidden' || state === 'preview_only'
          ? 'plan_gated'
          : 'free');

  let reason: RestrictionReason | undefined;
  if (state === 'preview_only') reason = 'preview_only';
  if (state === 'locked' || state === 'hidden') reason = 'plan_locked';

  return {
    plan,
    state,
    reason,
    upgradeTarget: config.requiredPlan,
    creditFeature: config.creditFeature,
    creditCost,
    monetizationModel,
    monthlyLimit,
    dashboardMode: config.dashboardMode,
    uiMode:
      state === 'preview_only'
        ? 'preview'
        : state === 'locked' || state === 'hidden'
          ? 'locked'
          : 'full',
    isVisible: config.visibility !== 'hidden',
    freeModelsOnly: Boolean(config.freeModelsOnly),
  };
}

export function getMonthlyQuotaLimit(feature: QuotaFeatureKey, plan: Plan): number {
  switch (feature) {
    case 'discovery_calls':
      return MONTHLY_FREE_QUOTAS.discovery_calls[plan];
    case 'cofounder_posts':
      return MONTHLY_FREE_QUOTAS.cofounder_posts[plan];
    case 'vc_search_profile':
      return MONTHLY_FREE_QUOTAS.vc_profiles[plan];
    case 'accelerator_profile':
      return MONTHLY_FREE_QUOTAS.accelerator_profiles[plan];
    case 'directories':
      return MONTHLY_FREE_QUOTAS.directory_visits[plan];
    default:
      return 0;
  }
}

export function isUnlimitedQuotaLimit(limit: number): boolean {
  return !Number.isFinite(limit) || limit === Infinity;
}

export function getQuotaStatus(feature: QuotaFeatureKey, plan: Plan, used: number = 0): QuotaStatus {
  const entitlement = resolveEntitlement(feature, plan);
  const limit = getMonthlyQuotaLimit(feature, plan);
  const hasUnlimited = isUnlimitedQuotaLimit(limit);
  const remaining = hasUnlimited ? Infinity : Math.max(0, limit - used);
  const isLocked = entitlement.state === 'locked' || entitlement.state === 'hidden';
  const canUse = entitlement.state === 'full' || (entitlement.state === 'quota_limited' && remaining > 0);

  return {
    feature,
    plan,
    state: entitlement.state,
    used,
    limit,
    remaining,
    hasUnlimited,
    canUse,
    isLocked,
    upgradeTarget: entitlement.upgradeTarget,
  };
}
