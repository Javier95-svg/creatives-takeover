/**
 * AI Co-Founder Types & Interfaces
 * Phase 1: Enhanced Business Context & Progress Tracking
 *
 * These types support the upgraded BizMap AI chatbot system that functions
 * as an AI co-founder for business planning.
 */

// =====================================================
// FOUNDER PROFILE TYPES
// =====================================================

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type DecisionMakingStyle = 'data-driven' | 'intuitive' | 'consensus-seeking' | 'mixed';
export type DetailLevel = 'high-level' | 'balanced' | 'detailed';
export type PreferredPace = 'fast' | 'moderate' | 'slow';
export type PreferredTone = 'formal' | 'professional-friendly' | 'casual' | 'technical';
export type EntrepreneurialExperience = 'first-time' | 'experienced' | 'serial-entrepreneur';

export interface AvailableResources {
  time: number; // hours per week
  budget: number; // in dollars
  network: string[]; // network connections/resources
}

export interface KeyConstraints {
  time: string | null;
  budget: string | null;
  team: string | null;
  [key: string]: string | null;
}

export interface PreviousVenture {
  name: string;
  industry: string;
  outcome: 'success' | 'failure' | 'acquired' | 'ongoing';
  keyLearnings: string[];
  duration?: string;
}

export interface FounderProfile {
  id: string;
  user_id: string;

  // Core Profile
  skill_gaps: string[];
  available_resources: AvailableResources;
  risk_tolerance: RiskTolerance;
  decision_making_style: DecisionMakingStyle;
  learning_preferences: string[];

  // Communication Preferences
  preferred_detail_level: DetailLevel;
  preferred_pace: PreferredPace;
  preferred_tone: PreferredTone;

  // Experience & Background
  entrepreneurial_experience: EntrepreneurialExperience;
  domain_expertise: string[];
  previous_ventures: PreviousVenture[];

  // Goals & Constraints
  primary_goals: string[];
  key_constraints: KeyConstraints;
  success_definition: string | null;

  // Metadata
  profile_completeness: number; // 0-100
  last_updated: string;
  created_at: string;
}

// =====================================================
// PROGRESS TRACKING TYPES
// =====================================================

export type MilestoneType =
  | 'business_concept'
  | 'target_customer'
  | 'validation_plan'
  | 'mvp_design'
  | 'launch_strategy'
  | 'pricing_model'
  | 'success_goals'
  | 'custom';

export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'skipped';

export interface RelatedComponent {
  component_id: string;
  component_type: string;
  relationship: 'depends_on' | 'supports' | 'validates';
}

export interface ValidationResult {
  validated: boolean;
  validation_type: string;
  result: any;
  timestamp: string;
}

export interface ProgressMilestone {
  id: string;
  user_id: string;
  conversation_id: string | null;

  // Milestone Details
  milestone_type: MilestoneType;
  milestone_name: string;
  milestone_description: string | null;

  // Progress Tracking
  status: MilestoneStatus;
  completion_percentage: number; // 0-100
  quality_score: number | null; // 0-100

  // Timeline
  target_day: number | null; // Day in 30-day plan
  started_at: string | null;
  completed_at: string | null;

  // Related Data
  related_components: RelatedComponent[];
  validation_results: Record<string, ValidationResult>;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =====================================================
// BLOCKER TYPES
// =====================================================

export type BlockerType =
  | 'knowledge_gap'
  | 'resource_constraint'
  | 'decision_paralysis'
  | 'technical_challenge'
  | 'market_uncertainty'
  | 'skill_gap'
  | 'other';

export type BlockerSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BlockerStatus = 'open' | 'in_progress' | 'resolved' | 'escalated';

export interface SuggestedAction {
  action: string;
  effort: string; // "5 mins", "1 hour", etc.
  impact: 'low' | 'medium' | 'high';
  resources?: string[];
}

export interface ProgressBlocker {
  id: string;
  user_id: string;
  milestone_id: string | null;
  conversation_id: string | null;

  // Blocker Details
  blocker_type: BlockerType;
  blocker_title: string;
  blocker_description: string;
  severity: BlockerSeverity;

  // Resolution Tracking
  status: BlockerStatus;
  suggested_actions: SuggestedAction[];
  resolution_notes: string | null;

  // Timeline
  identified_at: string;
  resolved_at: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =====================================================
// MARKET INTELLIGENCE TYPES
// =====================================================

export type CompetitionIntensity = 'low' | 'medium' | 'high' | 'very-high';

export interface MarketSizeEstimate {
  value: number;
  unit: string; // "USD", "users", etc.
  year: number;
  source: string;
}

export interface MarketTrend {
  trend: string;
  direction: 'growing' | 'declining' | 'stable';
  impact: 'high' | 'medium' | 'low';
  source: string;
}

export interface RegulatoryEnvironment {
  regulations: string[];
  compliance_requirements: string[];
  changes_expected: boolean;
  impact_level: 'high' | 'medium' | 'low';
}

export interface OpportunityFactor {
  factor: string;
  impact: 'positive' | 'negative';
  magnitude: number; // 1-10
  explanation: string;
}

export interface BenchmarkMetrics {
  revenue_growth?: number;
  team_size?: number;
  funding_raised?: number;
  time_to_market?: number;
  customer_acquisition_cost?: number;
  lifetime_value?: number;
  [key: string]: number | undefined;
}

export interface SuccessPattern {
  pattern: string;
  frequency: string;
  examples: string[];
}

export interface DataSource {
  name: string;
  url?: string;
  accessed_at: string;
  credibility: 'high' | 'medium' | 'low';
}

export interface MarketIntelligence {
  id: string;

  // Identification
  industry: string;
  market_segment: string | null;
  geography: string;

  // Intelligence Data
  growth_rate: number | null;
  market_size_estimate: MarketSizeEstimate;
  competition_intensity: CompetitionIntensity | null;
  entry_barriers: string[];
  key_trends: MarketTrend[];
  regulatory_environment: RegulatoryEnvironment;

  // Opportunity Analysis
  opportunity_score: number | null; // 0-100
  opportunity_factors: OpportunityFactor[];
  threat_factors: OpportunityFactor[];

  // Benchmarking Data
  typical_metrics: BenchmarkMetrics;
  success_patterns: SuccessPattern[];
  failure_patterns: SuccessPattern[];

  // Data Quality
  data_sources: DataSource[];
  confidence_score: number; // 0-1
  last_validated: string;

  // Cache Control
  expires_at: string;
  created_at: string;
}

// =====================================================
// ENHANCED BUSINESS CONTEXT
// =====================================================

export interface ProgressMetrics {
  currentDay: number; // Current day in 30-day plan
  completedMilestones: string[]; // milestone IDs
  activeBlockers: number;
  velocity: number; // milestones per week
  qualityScore: number; // 0-100 average quality of completed milestones
  onTrack: boolean; // Whether progress is on track
}

export interface DecisionRecord {
  decision: string;
  alternatives: string[];
  rationale: string;
  chosen_alternative: string;
  decision_date: string;
  outcome?: string;
  outcome_date?: string;
}

export interface ConversationMemory {
  importantTopics: string[];
  userPreferences: Record<string, any>;
  previousSolutions: Array<{ problem: string; solution: string }>;
  emotionalContext: {
    lastDetectedMood?: string;
    lastDetectedTone?: string;
    engagementLevel?: 'high' | 'medium' | 'low';
  };
  relationshipPhase: 'building-trust' | 'active-collaboration' | 'execution-partner';
}

export interface EnhancedBusinessContext {
  // Original business context fields
  industry?: string;
  businessType?: 'startup' | 'existing' | 'franchise' | 'acquisition';
  stage?: 'idea' | 'planning' | 'launch' | 'growth' | 'expansion';
  location?: string;
  budget?: string;
  timeline?: string;
  experience?: EntrepreneurialExperience;
  goals?: string[];
  painPoints?: string[];
  completedSections?: string[];

  // New enhanced context (stored in JSONB columns)
  founderProfile?: Partial<FounderProfile>;
  marketDynamics?: Partial<MarketIntelligence>;
  progressMetrics?: ProgressMetrics;
  decisionHistory?: DecisionRecord[];
  conversationMemory?: ConversationMemory;
}

// =====================================================
// CHATBOT CONVERSATION TYPES
// =====================================================

export type ChatMode = 'wizard' | 'freeform' | 'tour-guide' | 'bizmap-structured' | 'gtm';

export interface ChatbotConversation {
  id: string;
  user_id: string | null;
  session_id: string;
  business_context: EnhancedBusinessContext;
  conversation_stage: string;
  chat_mode: ChatMode;

  // Enhanced context fields (JSONB)
  founder_profile: Partial<FounderProfile>;
  market_dynamics: Partial<MarketIntelligence>;
  progress_metrics: ProgressMetrics;
  decision_history: DecisionRecord[];
  conversation_memory: ConversationMemory;

  created_at: string;
  updated_at: string;
}

export interface ChatbotMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    confidence?: number;
    sources?: string[];
    timestamp?: string;
    tokens_used?: number;
    [key: string]: any;
  };
  created_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateFounderProfileRequest {
  risk_tolerance?: RiskTolerance;
  decision_making_style?: DecisionMakingStyle;
  entrepreneurial_experience?: EntrepreneurialExperience;
  skill_gaps?: string[];
  learning_preferences?: string[];
  primary_goals?: string[];
  available_resources?: Partial<AvailableResources>;
}

export interface UpdateFounderProfileRequest extends Partial<CreateFounderProfileRequest> {
  preferred_detail_level?: DetailLevel;
  preferred_pace?: PreferredPace;
  preferred_tone?: PreferredTone;
  domain_expertise?: string[];
  key_constraints?: Partial<KeyConstraints>;
  success_definition?: string;
}

export interface CreateMilestoneRequest {
  milestone_type: MilestoneType;
  milestone_name: string;
  milestone_description?: string;
  target_day?: number;
  conversation_id?: string;
}

export interface UpdateMilestoneRequest {
  status?: MilestoneStatus;
  completion_percentage?: number;
  quality_score?: number;
  validation_results?: Record<string, ValidationResult>;
}

export interface CreateBlockerRequest {
  blocker_type: BlockerType;
  blocker_title: string;
  blocker_description: string;
  severity: BlockerSeverity;
  milestone_id?: string;
  conversation_id?: string;
  suggested_actions?: SuggestedAction[];
}

export interface ResolveBlockerRequest {
  status: 'resolved';
  resolution_notes: string;
}

// =====================================================
// CONTEXT AGGREGATION TYPES
// =====================================================

export interface AggregatedUserContext {
  // User identity
  userId: string;

  // Complete founder profile
  founderProfile: FounderProfile | null;

  // Current progress state
  currentMilestones: ProgressMilestone[];
  completedMilestones: ProgressMilestone[];
  activeBlockers: ProgressBlocker[];

  // Progress metrics
  progressMetrics: ProgressMetrics;

  // Market intelligence
  marketIntelligence: MarketIntelligence | null;

  // Decision history
  decisionHistory: DecisionRecord[];

  // Conversation memory
  conversationMemory: ConversationMemory;

  // Calculated insights
  insights: {
    isOnTrack: boolean;
    criticalBlockers: ProgressBlocker[];
    nextSuggestedMilestone: MilestoneType | null;
    profileCompleteness: number;
    needsAttention: string[]; // List of areas needing attention
  };
}

// =====================================================
// SERVICE RESPONSE TYPES
// =====================================================

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
