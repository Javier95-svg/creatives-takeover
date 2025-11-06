/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers
 */

// Credit costs for various features
export const CREDIT_COSTS = {
  LAUNCH_REPORT: 5,
  ASSET_GENERATION: 5,
  PREMIUM_FEATURE: 3,
  AI_CHAT_MESSAGE: 1,
  MARKET_RESEARCH: 10,
  FINANCIAL_ANALYSIS: 8,
} as const;

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
