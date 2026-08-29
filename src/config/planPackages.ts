import {
  MONTHLY_FREE_QUOTAS,
  PLAN_MONTHLY_CREDITS,
  type Plan,
} from './planPermissions';

export interface PlanPackagePresentation {
  valueStatement: string;
  usageLabel: string;
  workspaceLabel: string;
  perksTitle: string;
  perks: readonly [string, string, string];
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
    valueStatement: 'Build. Test. Learn.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.rookie} credits / month`,
    workspaceLabel: 'Core dashboard',
    perksTitle: 'Start with the founder essentials:',
    perks: [
      'Build with ICP Builder, PMF Lab, MVP Builder, and the rest of the core toolset.',
      'Use standard AI models and top up your credit balance whenever you need more runs.',
      `Browse investors, accelerators, and mentors, with ${quotaLabel(MONTHLY_FREE_QUOTAS.directory_visits.rookie, 'directory visits')} each month.`,
    ],
  },
  starter: {
    valueStatement: 'Validate with momentum.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.starter} credits / month`,
    workspaceLabel: 'PROVE dashboard',
    perksTitle: 'Everything in Rookie, plus:',
    perks: [
      'Run validation from the PROVE dashboard with more monthly AI capacity.',
      'Use the full Email Templates library for customer and investor outreach.',
      `Open ${quotaLabel(MONTHLY_FREE_QUOTAS.vc_profiles.starter, 'VC profiles')}, ${quotaLabel(MONTHLY_FREE_QUOTAS.accelerator_profiles.starter, 'accelerator profiles')}, and ${quotaLabel(MONTHLY_FREE_QUOTAS.directory_visits.starter, 'directory visits')} each month.`,
    ],
    recommended: true,
  },
  rising: {
    valueStatement: 'Turn evidence into growth.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.rising} credits / month`,
    workspaceLabel: 'SELL + GROW dashboard',
    perksTitle: 'Everything in Starter, plus:',
    perks: [
      'Build with advanced MVP models and turn customer evidence into a working product.',
      'Run the complete First Customer Proof workflow and export from the full Prompt Library.',
      `Research ${quotaLabel(MONTHLY_FREE_QUOTAS.vc_profiles.rising, 'VC profiles')}, ${quotaLabel(MONTHLY_FREE_QUOTAS.accelerator_profiles.rising, 'accelerator profiles')}, and use ${quotaLabel(MONTHLY_FREE_QUOTAS.directory_visits.rising, 'directory visits')} each month.`,
    ],
  },
  pro: {
    valueStatement: 'Execute without limits.',
    usageLabel: `${PLAN_MONTHLY_CREDITS.pro} credits / month`,
    workspaceLabel: 'Full execution dashboard',
    perksTitle: 'Everything in Rising, plus:',
    perks: [
      "Run more AI actions with the platform's largest monthly credit balance.",
      'Find matched investors with Find Your Angel.',
      'Open unlimited VC profiles, accelerator profiles, and directory listings.',
    ],
  },
};
