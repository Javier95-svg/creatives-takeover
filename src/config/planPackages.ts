import {
  MONTHLY_FREE_QUOTAS,
  PLAN_MONTHLY_CREDITS,
  type Plan,
} from './planPermissions';

export interface PlanPackagePresentation {
  valueStatement: string;
  differentiators: readonly [string, string, string];
  recommended?: boolean;
}

const quotaLabel = (value: number, noun: string) =>
  Number.isFinite(value) ? `${value} ${noun}` : `Unlimited ${noun}`;

/**
 * Pricing-page merchandising copy. Prices and numeric limits remain owned by
 * pricing.ts and planPermissions.ts; this catalog only explains why a founder
 * would choose each verified package.
 */
export const PLAN_PACKAGE_PRESENTATION: Record<Plan, PlanPackagePresentation> = {
  rookie: {
    valueStatement: 'Start building and testing for free.',
    differentiators: [
      `${PLAN_MONTHLY_CREDITS.rookie} monthly credits`,
      'Standard AI models for MVP Builder and Prompt Library',
      `${quotaLabel(MONTHLY_FREE_QUOTAS.directory_visits.rookie, 'directory visits')} plus investor and accelerator browsing`,
    ],
  },
  starter: {
    valueStatement: 'Validate faster with more runway and deeper research.',
    differentiators: [
      `${PLAN_MONTHLY_CREDITS.starter} monthly credits`,
      'PROVE workspace and full Email Templates access',
      `${quotaLabel(MONTHLY_FREE_QUOTAS.vc_profiles.starter, 'VC profiles')}, ${quotaLabel(MONTHLY_FREE_QUOTAS.accelerator_profiles.starter, 'accelerator profiles')}, and ${quotaLabel(MONTHLY_FREE_QUOTAS.directory_visits.starter, 'directory visits')}`,
    ],
    recommended: true,
  },
  rising: {
    valueStatement: 'Turn evidence into products and customer acquisition.',
    differentiators: [
      `${PLAN_MONTHLY_CREDITS.rising} monthly credits with advanced MVP models`,
      'Complete First Customer Proof workflow',
      `Full Prompt Library and exports plus ${quotaLabel(MONTHLY_FREE_QUOTAS.vc_profiles.rising, 'VC profiles')}`,
    ],
  },
  pro: {
    valueStatement: 'Maximum execution runway with unlimited research.',
    differentiators: [
      `${PLAN_MONTHLY_CREDITS.pro} monthly credits`,
      'Find Your Angel access',
      'Unlimited VC profiles, accelerator profiles, and directory visits',
    ],
  },
};

export const SHARED_PLAN_FOUNDATION = [
  'Core founder tools from ICP and PMF through MVP, stack, GTM, and pitch review',
  'Credit-metered AI actions with optional top-ups',
  'Mentor marketplace access; mentor services are priced and paid separately',
  'Insighta Test, Newspaper, investor browsing, and free co-founder posting',
] as const;

