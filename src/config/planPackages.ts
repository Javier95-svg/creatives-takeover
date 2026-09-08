import {
  MONTHLY_FREE_QUOTAS,
  PLAN_MONTHLY_CREDITS,
  type Plan,
} from './planPermissions.ts';

export interface PlanPackagePresentation {
  valueStatement: string;
  usageLabel: string;
  perksTitle: string;
  perks: readonly [string, string, string, string];
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
    valueStatement: 'Start your journey.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.rookie} credits / month`,
    perksTitle: 'Start with the founder essentials:',
    perks: [
      `Turn an early idea into a clearer customer, problem, and first test with ${PLAN_MONTHLY_CREDITS.rookie} monthly credits.`,
      'Create a simple demand test and start collecting evidence before paying for a larger plan.',
      'Full access to our mentor database (free discovery call bookings) + marketplace.',
      'Full access to Content section, with weekly podcast episodes and curated industry articles that keep you informed on the market trends.',
    ],
  },
  starter: {
    valueStatement: 'Test your assumptions.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.starter} credits / month`,
    perksTitle: 'Everything in Rookie, plus:',
    perks: [
      `Get ${PLAN_MONTHLY_CREDITS.starter} monthly credits and a dedicated validation workspace to keep your assumptions, customer evidence, and next actions in one place.`,
      'Run a more deliberate customer-validation loop, so each conversation can move you closer to a real commitment.',
      `Access to ${quotaLabel(MONTHLY_FREE_QUOTAS.vc_profiles.starter, 'VC Search profiles')} and ${quotaLabel(MONTHLY_FREE_QUOTAS.accelerator_profiles.starter, 'Accelerator Hunt profiles')} each month to begin your fundraising research.`,
      'Publish an interactive demand-capture page, so your next decision rests on real signups instead of opinions.',
    ],
    recommended: true,
  },
  rising: {
    valueStatement: 'Turn evidence into growth.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.rising} credits / month`,
    perksTitle: 'Everything in Starter, plus:',
    perks: [
      `Get ${PLAN_MONTHLY_CREDITS.rising} monthly credits and advanced product-building capacity to turn validated learning into something customers can actually use.`,
      'Unlock the full First Customer Proof workflow to run a measurable acquisition cycle and decide what to improve next.',
      `Open ${quotaLabel(MONTHLY_FREE_QUOTAS.vc_profiles.rising, 'investor profiles')} each month to build a stronger, better-researched fundraising shortlist.`,
      `Review ${quotaLabel(MONTHLY_FREE_QUOTAS.accelerator_profiles.rising, 'accelerator profiles')} and use ${quotaLabel(MONTHLY_FREE_QUOTAS.directory_visits.rising, 'directory visits')} each month to expand the opportunities behind your growth plan.`,
    ],
  },
  pro: {
    valueStatement: 'Execute without limits.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.pro} credits / month`,
    perksTitle: 'Everything in Rising, plus:',
    perks: [
      `Get ${PLAN_MONTHLY_CREDITS.pro} monthly credits and the platform's broadest build capacity to keep validating, shipping, and improving without a tight monthly runway.`,
      'Unlock Find Your Angel to focus your fundraising research on investors who better match your company.',
      `Research ${quotaLabel(MONTHLY_FREE_QUOTAS.vc_profiles.pro, 'investor profiles')}, so promising opportunities never get cut off by a monthly viewing limit.`,
      `Research ${quotaLabel(MONTHLY_FREE_QUOTAS.accelerator_profiles.pro, 'accelerator profiles')} and ${quotaLabel(MONTHLY_FREE_QUOTAS.directory_visits.pro, 'directory profiles')} to pursue the strongest programs, people, and opportunities as your strategy evolves.`,
    ],
  },
};
