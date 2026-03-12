/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers
 */

// Credit costs for various features - SINGLE SOURCE OF TRUTH
// All credit costs must be defined here and referenced from this file
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

  // Waitlist Maker
  WAITLIST_GENERATION: 3,

  // Other Premium Features
  PDF_EXPORT: 2,
  ADVANCED_ANALYTICS: 6,

  // New Features (Phase 3)
  PITCH_DECK_ANALYZER: 10,
  EMAIL_TEMPLATE_GENERATION: 4,
  PROMPT_GENERATION: 2,

  // Community Features
  DISCOVERY_CALL: 10,

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

/**
 * Get all credit costs as a readable object
 * @returns Object with feature names and their costs
 */
export function getAllCreditCosts(): Record<string, number> {
  return { ...CREDIT_COSTS };
}

// AI Model Configuration
export const AI_CONFIG = {
  DEFAULT_MAX_TOKENS: 150,
  EXTENDED_MAX_TOKENS: 500,
  TEMPERATURE: 0.8,
  TOP_P: 0.9,
  FREQUENCY_PENALTY: 0.3,
  PRESENCE_PENALTY: 0.3,
} as const;

// Memory Configuration
export const MEMORY_CONFIG = {
  TOP_K: 5,
  SUMMARIZATION_DAYS: 7,
  MAX_SHORT_TERM_MEMORIES: 50,
  MAX_LONG_TERM_MEMORIES: 100,
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  MIN_DELAY_MS: 150,
  MAX_DELAY_MS: 1200,
  TIMEOUT_MS: 30000,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL_SECONDS: 3600, // 1 hour
  LONG_TTL_SECONDS: 86400, // 24 hours
  SHORT_TTL_SECONDS: 300, // 5 minutes
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv'],
} as const;

// Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  MIN_BIO_LENGTH: 0,
  MAX_BIO_LENGTH: 500,
} as const;

// Analytics
export const ANALYTICS = {
  SESSION_TIMEOUT_MS: 1800000, // 30 minutes
  EVENT_BATCH_SIZE: 10,
  FLUSH_INTERVAL_MS: 5000,
} as const;

// Feature Flags (for gradual rollout)
export const FEATURES = {
  ENABLE_AI_COFOUNDER: true,
  ENABLE_VOICE_INPUT: true,
  ENABLE_COLLABORATION: true,
  ENABLE_ADVANCED_ANALYTICS: true,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  CHATBOT: '/chatbot-ai-engine',
  CREDIT_SERVICE: '/credit-service',
  MARKET_DATA: '/market-data-aggregator',
  RECOMMENDATIONS: '/generate-recommendations',
} as const;

// Time Constants
export const TIME = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60000,
  ONE_HOUR: 3600000,
  ONE_DAY: 86400000,
  ONE_WEEK: 604800000,
} as const;

// Status Types
export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  CREATOR: 'creator',
  PROFESSIONAL: 'professional',
} as const;

// Monthly credit allocation per tier
export const TIER_MONTHLY_CREDITS = {
  free: 25,
  creator: 100,
  professional: 300,
} as const;

// One-time credit add-on packs (available to all tiers)
export const CREDIT_PACK_OPTIONS = [
  { id: 'pack_20', credits: 20, price: 8.00, label: 'Starter Pack' },
  { id: 'pack_40', credits: 40, price: 16.00, label: 'Boost Pack' },
  { id: 'pack_60', credits: 60, price: 24.00, label: 'Power Pack' },
] as const;

// Stripe Payment Links for credit packs (one-time purchases)
export const CREDIT_PACK_PAYMENT_LINKS: Record<string, string> = {
  pack_20: 'https://buy.stripe.com/dRm5kE4Gl9Kv8746zF0VO0h',
  pack_40: 'https://buy.stripe.com/aFa4gAegV8Grafc3nt0VO0i',
  pack_60: 'https://buy.stripe.com/8x29AUc8N1dZevsgaf0VO0j',
};

// VC View Limits per tier (monthly)
export const VC_VIEW_LIMITS = {
  free: 5,
  creator: 25,
  professional: -1, // unlimited
} as const;

// Feature usage limits per tier (soft limits for Creator, unlimited for Professional)
export const TIER_USAGE_LIMITS = {
  free: {
    bizmap_conversations: 10,
    tech_stack_generations: 1,
    pmf_analyses: 0, // Preview only
    icp_analyses: 0, // Preview only
    insighta_tests: 1,
    investor_matches: 0, // View only
    market_intelligence_queries: 0,
    basic_reports: 0,
    team_members: 0,
    vc_profile_views: 5, // New limit
  },
  creator: {
    bizmap_conversations: -1, // Unlimited (credit-gated)
    tech_stack_generations: -1, // Unlimited (credit-gated)
    pmf_analyses: -1, // Unlimited (credit-gated)
    icp_analyses: -1, // Unlimited (credit-gated)
    insighta_tests: -1, // Unlimited (credit-gated)
    investor_matches: 0, // Not available on Creator tier (Professional only)
    market_intelligence_queries: 10,
    basic_reports: 5,
    team_members: 3,
    vc_profile_views: 25, // New limit
  },
  professional: {
    bizmap_conversations: -1, // Unlimited (credit-gated)
    tech_stack_generations: -1, // Unlimited (credit-gated)
    pmf_analyses: -1, // Unlimited (credit-gated)
    icp_analyses: -1, // Unlimited (credit-gated)
    insighta_tests: -1, // Unlimited (credit-gated)
    investor_matches: -1, // Unlimited (credit-gated)
    market_intelligence_queries: -1, // Unlimited
    basic_reports: -1, // Unlimited
    team_members: -1, // Unlimited
    vc_profile_views: -1, // Unlimited
  },
} as const;

// Subscription Tier Details (with new pricing)
export const TIER_DETAILS = {
  free: {
    name: 'Free',
    subtitle: 'Validate',
    price: 0,
    credits: 25,
    vcViewLimit: 5,
    description: 'Start your journey - validate your idea',
  },
  creator: {
    name: 'Creator',
    subtitle: 'Build',
    price: 32.99,
    credits: 100,
    vcViewLimit: 25,
    description: 'Build your startup with AI-powered tools',
  },
  professional: {
    name: 'Professional',
    subtitle: 'Scale',
    price: 74.99,
    credits: 300,
    vcViewLimit: -1, // unlimited
    description: 'Scale with unlimited access and premium features',
  },
} as const;
