import {
  MONTHLY_FREE_QUOTAS,
  PLAN_MONTHLY_CREDITS,
  type Plan,
} from './planPermissions.ts';

export interface PlanPackagePresentation {
  /** The founder stage the plan fits, shown as "Best for …". */
  bestFor: string;
  /** What the plan lets a founder get done, in a few words. Never a promised result. */
  outcome: string;
  /** One sentence on how the plan gets there. */
  outcomeDetail: string;
  usageLabel: string;
  perksTitle: string;
  /** At most three short unlocks, each backed by an entitlement or quota. */
  perks: readonly string[];
  recommended?: boolean;
}

const quota = (value: number, noun: string) =>
  Number.isFinite(value) ? `${value} ${noun}` : `Unlimited ${noun}`;

/**
 * Pricing-page merchandising copy. Prices and numeric limits remain owned by
 * pricing.ts and planPermissions.ts; this catalog only explains why a founder
 * would choose each plan.
 *
 * Outcome first (2026-10-17): a visitor asks "why should I pay for this?", so
 * each card leads with what the plan lets them get done and keeps the unlocks
 * to three short lines. Every unlock maps to FEATURE_ENTITLEMENTS or
 * MONTHLY_FREE_QUOTAS:
 * - Starter: dashboard_mode PROVE, vc/accelerator profiles, custom_domain
 *   (an MVP on the founder's own domain, without CT branding).
 * - Rising: MVP Builder without freeModelsOnly, first_customer_proof full,
 *   profiles and directory visits.
 * - Pro: angels_community, unlimited profiles and directory visits.
 */
export const PLAN_PACKAGE_PRESENTATION: Record<Plan, PlanPackagePresentation> = {
  rookie: {
    bestFor: 'Testing an idea',
    outcome: 'Know who your customer is.',
    outcomeDetail: 'Define your ideal customer and put a first demand test in front of people.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.rookie} credits / month`,
    perksTitle: 'Includes:',
    perks: [
      'ICP Builder, free on every plan',
      'Demand pages, PMF Lab and MVP Builder on credits',
      'Mentor marketplace and co-founder posts',
    ],
  },
  starter: {
    bestFor: 'Validating demand',
    outcome: 'Prove people want it.',
    outcomeDetail: 'Collect evidence from real customers before you build.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.starter} credits / month`,
    perksTitle: 'Everything in Rookie, plus:',
    perks: [
      'A validation workspace for interviews and evidence',
      `${quota(MONTHLY_FREE_QUOTAS.vc_profiles.starter, 'investor')} and ${quota(MONTHLY_FREE_QUOTAS.accelerator_profiles.starter, 'accelerator')} profiles a month`,
      'Your MVP on your own domain, unbranded',
    ],
    recommended: true,
  },
  rising: {
    bestFor: 'Building and first sales',
    outcome: 'Build it and reach your first buyers.',
    outcomeDetail: 'Ship your MVP with advanced models, then run a real sales cycle.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.rising} credits / month`,
    perksTitle: 'Everything in Starter, plus:',
    perks: [
      'Advanced AI models in MVP Builder',
      'First Customer Proof: 10 prospects, 10 messages, a decision',
      `${quota(MONTHLY_FREE_QUOTAS.vc_profiles.rising, 'investor')} and ${quota(MONTHLY_FREE_QUOTAS.accelerator_profiles.rising, 'accelerator')} profiles, ${quota(MONTHLY_FREE_QUOTAS.directory_visits.rising, 'directory visits')}`,
    ],
  },
  pro: {
    bestFor: 'Fundraising and scale',
    outcome: 'Build at full pace and research freely.',
    outcomeDetail: 'The most credits, and no limits on investor or program research.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.pro} credits / month`,
    perksTitle: 'Everything in Rising, plus:',
    perks: [
      'Find Your Angel',
      'Unlimited investor, accelerator and directory research',
    ],
  },
};
