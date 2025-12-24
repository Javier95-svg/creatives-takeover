/**
 * Credit cost constants for edge functions
 * IMPORTANT: These must match CREDIT_COSTS in src/config/constants.ts
 * Keep both files in sync manually until a better solution is implemented
 */

export const CREDIT_COSTS = {
  // BizMap AI Features
  LAUNCH_REPORT: 5,
  ASSET_GENERATION: 5,
  PREMIUM_FEATURE: 2, // Prompt Library export (reduced from 3)
  
  // AI Chat Features
  AI_CHAT_MESSAGE: 1,
  
  // Research & Analysis
  MARKET_RESEARCH: 6, // Reduced from 10 (more accessible)
  MARKET_VALIDATION: 6, // Reduced from 10 (more accessible)
  FINANCIAL_ANALYSIS: 7, // Reduced from 8
  FUNDRAISING_READINESS_ANALYSIS: 9, // Increased from 8 (higher perceived value)
  BUSINESS_INSIGHTS: 5,
  PMF_ANALYSIS: 8,
  
  // Investor Matching & Outreach
  INVESTOR_MATCHING: 10, // Increased from 5 (2x value perception for fundraising)
  PITCH_DECK_GENERATION: 12, // Increased from 8 (critical fundraising tool)
  COLD_EMAIL_GENERATION: 3,
  ONEPAGER_GENERATION: 3,
  
  // Sprint & Task Features
  SPRINT_TASK_GENERATION: 2,
  ROADMAP_GENERATION: 4, // Reduced from 5 (medium value planning tool)
  
  // Tech Stack Generator
  TECH_STACK_GENERATION: 3,
  
  // Other Premium Features
  PDF_EXPORT: 3,
  ADVANCED_ANALYTICS: 10, // Increased from 5 (higher value for data-driven decisions)
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

