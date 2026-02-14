/**
 * Credit cost constants for edge functions
 * IMPORTANT: These must match CREDIT_COSTS in src/config/constants.ts
 * Keep both files in sync manually until a better solution is implemented
 */

export const CREDIT_COSTS = {
  // BizMap AI Features
  LAUNCH_REPORT: 5,
  ASSET_GENERATION: 5,
  PREMIUM_FEATURE: 3,
  
  // AI Chat Features
  AI_CHAT_MESSAGE: 1,
  
  // Research & Analysis
  MARKET_RESEARCH: 5,
  MARKET_VALIDATION: 10,
  FINANCIAL_ANALYSIS: 8,
  FUNDRAISING_READINESS_ANALYSIS: 8,
  BUSINESS_INSIGHTS: 5,
  PMF_ANALYSIS: 8,
  ICP_ANALYSIS: 8,

  // Investor Matching & Outreach
  INVESTOR_MATCHING: 5,
  PITCH_DECK_GENERATION: 8,
  COLD_EMAIL_GENERATION: 3,
  ONEPAGER_GENERATION: 3,
  
  // Sprint & Task Features
  SPRINT_TASK_GENERATION: 2,
  ROADMAP_GENERATION: 5,
  
  // Tech Stack Generator
  TECH_STACK_GENERATION: 3,
  
  // Other Premium Features
  PDF_EXPORT: 3,
  ADVANCED_ANALYTICS: 5,

  // Insighta + BizMap Add-ons
  PITCH_DECK_ANALYZER: 8,
  EMAIL_TEMPLATE_GENERATION: 3,
  PROMPT_GENERATION: 2,

  // Community Features
  DISCOVERY_CALL: 5,
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

