/**
 * Credit cost constants for edge functions
 * IMPORTANT: These must match CREDIT_COSTS in src/config/constants.ts
 * Keep both files in sync manually until a better solution is implemented
 */

export const CREDIT_COSTS = {
  // BizMap AI Features
  LAUNCH_REPORT: 6,
  ASSET_GENERATION: 6,
  PREMIUM_FEATURE: 3,
  
  // AI Chat Features
  AI_CHAT_MESSAGE: 1,
  
  // Research & Analysis
  MARKET_RESEARCH: 6,
  MARKET_VALIDATION: 12,
  FINANCIAL_ANALYSIS: 10,
  FUNDRAISING_READINESS_ANALYSIS: 10,
  BUSINESS_INSIGHTS: 6,
  PMF_ANALYSIS: 10,
  ICP_ANALYSIS: 10,

  // Investor Matching & Outreach
  INVESTOR_MATCHING: 12,
  PITCH_DECK_GENERATION: 12,
  COLD_EMAIL_GENERATION: 4,
  ONEPAGER_GENERATION: 5,
  
  // Sprint & Task Features
  SPRINT_TASK_GENERATION: 2,
  ROADMAP_GENERATION: 6,
  
  // Tech Stack Generator
  TECH_STACK_GENERATION: 4,
  
  // Other Premium Features
  PDF_EXPORT: 2,
  ADVANCED_ANALYTICS: 6,

  // Insighta + BizMap Add-ons
  PITCH_DECK_ANALYZER: 10,
  EMAIL_TEMPLATE_GENERATION: 4,
  PROMPT_GENERATION: 2,

  // Community Features
  DISCOVERY_CALL: 10,

  // Waitlist Builder
  WAITLIST_GENERATION: 3,

  // AI App Builder (Lovable-style conversational app generator)
  APP_BUILDER_GENERATE: 8,  // Initial app generation from prompt
  APP_BUILDER_REFINE: 3,    // Each iterative refinement

  // GTM Strategist
  GTM_ANALYSIS: 10,

  // PMF Lab — Evidence Scorer
  PMF_SCORING: 8,
} as const;

// Type for credit cost feature names
export type CreditFeature = keyof typeof CREDIT_COSTS;

/**
 * Get credit cost for a specific feature
 * @param feature - The feature name (key from CREDIT_COSTS)
 * @returns The credit cost, or null if feature doesn't consume credits
 */
export function getCreditCost(feature: CreditFeature | string): number | null {
  if (feature in CREDIT_COSTS) {
    return CREDIT_COSTS[feature as CreditFeature];
  }
  return null;
}

