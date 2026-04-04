/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers
 */

// Credit costs for various features - SINGLE SOURCE OF TRUTH
// All credit costs must be defined here and referenced from this file
export const CREDIT_COSTS = {
  // BizMap AI Features
  LAUNCH_REPORT: 5,
  ASSET_GENERATION: 5,
  PREMIUM_FEATURE: 3,
  WAITLIST_GENERATION: 3,
  PMF_SCORING: 8,
  GTM_ANALYSIS: 5,
  APP_BUILDER_GENERATE: 5,
  APP_BUILDER_REFINE: 3,

  // AI Chat Features
  AI_CHAT_MESSAGE: 1,

  // Research & Analysis
  MARKET_RESEARCH: 5,
  MARKET_VALIDATION: 10,
  FINANCIAL_ANALYSIS: 8,
  FUNDRAISING_READINESS_ANALYSIS: 8,
  BUSINESS_INSIGHTS: 5,
  PMF_ANALYSIS: 8,
  ICP_ANALYSIS: 0,

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

  // New Features (Phase 3)
  PITCH_DECK_ANALYZER: 8,
  EMAIL_TEMPLATE_GENERATION: 3,
  PROMPT_GENERATION: 2,

  // Community Features
  DISCOVERY_CALL: 10,
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
  ROOKIE: 'rookie',
  STARTER: 'starter',
  RISING: 'rising',
  PRO: 'pro',
} as const;

// Monthly credit allocation per tier
export const TIER_MONTHLY_CREDITS = {
  rookie: 25,
  starter: 50,
  rising: 100,
  pro: 300,
} as const;

// VC View Limits per tier (monthly)
export const VC_VIEW_LIMITS = {
  rookie: 0,
  starter: 2,
  rising: 5,
  pro: -1,
} as const;

// Feature usage limits per tier
export const TIER_USAGE_LIMITS = {
  rookie: {
    bizmap_conversations: 10,
    tech_stack_generations: 0,
    pmf_analyses: 0,
    icp_analyses: -1,          // Free for all users
    insighta_tests: -1,        // Free for all users
    investor_matches: 0,       // Not available
    market_intelligence_queries: 0,
    basic_reports: 0,
    team_members: 0,
    vc_profile_views: 0,       // List-only, no profile views
    accelerator_profile_views: 0,
    discovery_calls_free: 1,
    cofounder_posts_free: 1,
  },
  starter: {
    bizmap_conversations: -1,
    tech_stack_generations: 0,
    pmf_analyses: -1,
    icp_analyses: -1,
    insighta_tests: -1,
    investor_matches: 0,
    market_intelligence_queries: 0,
    basic_reports: 0,
    team_members: 0,
    vc_profile_views: 2,
    accelerator_profile_views: 2,
    discovery_calls_free: 2,
    cofounder_posts_free: 2,
  },
  rising: {
    bizmap_conversations: -1,
    tech_stack_generations: -1,
    pmf_analyses: -1,
    icp_analyses: -1,
    insighta_tests: -1,
    investor_matches: 0,       // Not available on Rising (Pro only)
    market_intelligence_queries: 10,
    basic_reports: 5,
    team_members: 3,
    vc_profile_views: 5,
    accelerator_profile_views: 5,
    discovery_calls_free: 3,
    cofounder_posts_free: -1,
  },
  pro: {
    bizmap_conversations: -1,
    tech_stack_generations: -1,
    pmf_analyses: -1,
    icp_analyses: -1,
    insighta_tests: -1,
    investor_matches: -1,
    market_intelligence_queries: -1,
    basic_reports: -1,
    team_members: -1,
    vc_profile_views: -1,      // Unlimited
    accelerator_profile_views: -1,
    discovery_calls_free: -1,
    cofounder_posts_free: -1,
  },
} as const;

// Subscription Tier Details
export const TIER_DETAILS = {
  rookie: {
    name: 'Rookie',
    subtitle: 'Start',
    price: 0,
    credits: 25,
    vcViewLimit: 0,
    description: 'Explore the platform with free ICP Builder access and list-only investor browsing',
  },
  starter: {
    name: 'Starter',
    subtitle: 'Momentum',
    price: 9,
    credits: 50,
    vcViewLimit: 2,
    description: 'Unlock PMF Lab, Email Templates, and limited investor profile views',
  },
  rising: {
    name: 'Rising',
    subtitle: 'Build',
    price: 29,
    credits: 100,
    vcViewLimit: 5,
    description: 'Full BizMap AI access with 5 VC and 5 accelerator profile views per month',
  },
  pro: {
    name: 'Pro',
    subtitle: 'Scale',
    price: 65,
    credits: 300,
    vcViewLimit: -1, // unlimited
    description: 'Fundraising and scaling tier with unlimited investor views and priority support',
  },
} as const;
