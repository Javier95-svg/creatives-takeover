import { CREDIT_COSTS } from './constants.ts';

export const GTM_STRATEGIST_PRICING = {
  feature: 'GTM_ANALYSIS' as const,
  creditsPerResearchGeneration: CREDIT_COSTS.GTM_ANALYSIS,
  availableOn: 'all_plans' as const,
  manualEditsIncluded: true,
  weeklyReviewsIncluded: true,
};

export const GTM_STRATEGIST_ACCESS_LABEL = 'Available on every plan; researched generations use account credits.';

export function gtmGenerationLabel(verb = 'Research & regenerate') {
  return `${verb} — ${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits`;
}
