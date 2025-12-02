// Founder OS Type Definitions

// ============================================
// MARKET VALIDATION TYPES
// ============================================

export interface CustomerNeedsData {
  primary_needs: string[];
  key_requirements: string[];
  pain_points: Array<{
    point: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  buying_factors: Array<{
    factor: string;
    importance: number; // 0-100
  }>;
  customer_segments: Array<{
    segment: string;
    needs: string[];
    size?: string; // e.g., 'small', 'medium', 'large'
  }>;
}

export interface MarketValidationScore {
  id: string;
  user_id: string;
  session_id?: string;
  business_idea: string;
  industry?: string;
  target_market?: string;
  
  // Validation Metrics (0-100 scale)
  market_size_score: number;
  competition_score: number;
  demand_score: number;
  overall_validation_score: number;
  
  // Market Data
  estimated_market_size_usd?: number;
  competitor_count?: number;
  top_competitors: CompetitorData[];
  demand_trends: DemandTrendData;
  search_volume_data: SearchVolumeData;
  
  // Gap Analysis
  competitor_gaps: CompetitorGap[];
  differentiation_opportunities: string[];
  
  // Customer Analysis
  customer_needs_data?: CustomerNeedsData;
  
  // Reddit Insights
  reddit_discussions?: RedditDiscussion[];
  
  // Metadata
  validation_date: string;
  data_sources: DataSource[];
  confidence_level: 'low' | 'medium' | 'high';
  
  created_at: string;
  updated_at: string;
}

export interface CompetitorData {
  name: string;
  website?: string;
  market_share?: number;
  strengths: string[];
  weaknesses: string[];
  pricing_model?: string;
  features: string[];
}

export interface CompetitorGap {
  category: string;
  gap_description: string;
  opportunity_score: number; // 0-100
  difficulty: 'low' | 'medium' | 'high';
}

export interface DemandTrendData {
  trend_direction: 'increasing' | 'stable' | 'decreasing';
  growth_rate_percent?: number;
  seasonality?: 'high' | 'medium' | 'low' | 'none';
  market_maturity: 'emerging' | 'growing' | 'mature' | 'declining';
  data_points: {
    date: string;
    value: number;
  }[];
}

export interface SearchVolumeData {
  primary_keyword: string;
  monthly_searches?: number;
  search_trend: 'rising' | 'stable' | 'falling';
  related_keywords: {
    keyword: string;
    volume: number;
  }[];
  competition_level: 'low' | 'medium' | 'high';
}

export interface DataSource {
  name: string;
  type: 'api' | 'scraping' | 'manual' | 'ai_inference';
  url?: string;
  reliability_score: number; // 0-100
}

export interface RedditDiscussion {
  title: string;
  content: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  url: string;
  created_utc: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevance_score: number; // 0-100
  author?: string;
  post_id?: string;
}

// ============================================
// LAUNCH ROADMAP TYPES
// ============================================

export interface LaunchRoadmap {
  id: string;
  user_id: string;
  session_id?: string;
  business_idea: string;
  
  // Roadmap Config
  start_date: string;
  target_launch_date: string;
  current_week: number; // 1-4
  current_day: number; // 1-30
  
  // Status
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  
  // Milestones
  week1_validated: boolean;
  week2_mvp_built: boolean;
  week3_launched: boolean;
  week4_first_customer: boolean;
  first_customer_date?: string;
  
  // Progress Tracking
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
  
  created_at: string;
  updated_at: string;
}

export interface RoadmapTask {
  id: string;
  roadmap_id: string;
  user_id: string;
  
  // Task Details
  title: string;
  description?: string;
  week_number: number; // 1-4
  day_number: number; // 1-30
  
  // Status
  status: 'todo' | 'in_progress' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Tracking
  due_date: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  
  // Blockers
  is_blocked: boolean;
  blocker_reason?: string;
  
  // AI Insights
  ai_generated: boolean;
  ai_reasoning?: string;
  
  created_at: string;
  updated_at: string;
}

export type WeekMilestone = 'validate' | 'build' | 'launch' | 'first_customer';

export interface WeeklyGoals {
  week: number;
  milestone: WeekMilestone;
  description: string;
  key_tasks: string[];
  success_criteria: string[];
}

// ============================================
// COMMUNITY FEEDBACK TYPES
// ============================================

export interface BizMapCommunityFeedback {
  id: string;
  session_id: string;
  community_post_id?: string;
  user_id: string;
  
  // Feedback Request
  feedback_requested_on: FeedbackCategory[];
  
  // Aggregated Feedback
  total_upvotes: number;
  total_downvotes: number;
  total_comments: number;
  community_score: number; // 0-100
  
  // AI Analysis
  sentiment_analysis: SentimentAnalysis;
  key_suggestions: string[];
  common_concerns: string[];
  validation_adjustments: ValidationAdjustments;
  
  // Impact on Roadmap
  roadmap_updates_triggered: boolean;
  validation_score_delta?: number; // Change in validation score
  
  created_at: string;
  updated_at: string;
}

export type FeedbackCategory = 
  | 'market_validation'
  | 'pricing'
  | 'features'
  | 'target_market'
  | 'business_model'
  | 'go_to_market'
  | 'competitive_position';

export interface SentimentAnalysis {
  overall_sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  key_themes: {
    theme: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    mention_count: number;
  }[];
}

export interface ValidationAdjustments {
  market_size_adjustment: number; // -10 to +10
  competition_adjustment: number;
  demand_adjustment: number;
  reasoning: string;
}

// ============================================
// COHORT TYPES
// ============================================

export interface LaunchCohort {
  id: string;
  
  // Cohort Info
  cohort_name: string;
  cohort_type: 'validate' | 'build' | 'launch' | 'scale';
  cohort_number?: number;
  
  // Schedule
  start_date: string;
  end_date: string;
  weekly_checkin_day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  demo_day_date?: string;
  
  // Status
  status: 'upcoming' | 'active' | 'completed';
  member_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface CohortMember {
  id: string;
  cohort_id: string;
  user_id: string;
  roadmap_id?: string;
  
  // Member Status
  joined_at: string;
  status: 'active' | 'paused' | 'completed' | 'dropped';
  
  // Engagement
  weekly_checkins_completed: number;
  total_checkins_expected: number;
  attendance_rate: number;
  
  // Progress
  current_milestone: 'validate' | 'build' | 'launch' | 'scale';
  milestones_completed: number;
}

export interface CohortCheckIn {
  id: string;
  cohort_id: string;
  user_id: string;
  
  // Check-in Details
  week_number: number; // 1-4
  checkin_date: string;
  
  // Progress Report
  wins: string[];
  blockers: string[];
  next_week_goals: string[];
  help_needed?: string;
  
  // Engagement
  shared_publicly: boolean;
  community_post_id?: string;
  
  created_at: string;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface FounderAnalytics {
  id: string;
  user_id: string;
  roadmap_id?: string;
  
  // Time Period
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  
  // Progress Metrics
  tasks_completed: number;
  milestones_reached: number;
  velocity_score?: number; // tasks per day
  
  // Engagement Metrics
  community_feedback_received: number;
  validation_score_change?: number;
  cohort_participation_rate?: number;
  
  // Revenue Metrics
  revenue_usd: number;
  customer_count: number;
  mrr_usd: number;
  
  // AI Insights
  success_indicators: AIInsight[];
  risk_factors: AIInsight[];
  recommendations: string[];
  
  created_at: string;
}

export interface AIInsight {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action_items?: string[];
}

// ============================================
// UI STATE TYPES
// ============================================

export interface ValidationDashboardState {
  validationScore: MarketValidationScore | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated?: string;
}

export interface RoadmapDashboardState {
  roadmap: LaunchRoadmap | null;
  tasks: RoadmapTask[];
  currentWeekTasks: RoadmapTask[];
  todaysTasks: RoadmapTask[];
  isLoading: boolean;
  error: string | null;
}

export interface CohortDashboardState {
  currentCohort: LaunchCohort | null;
  membership: CohortMember | null;
  upcomingCheckIns: CohortCheckIn[];
  cohortMembers: CohortMember[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface MarketValidationRequest {
  business_idea: string;
  industry: string;
  target_market: string;
  competitor_names?: string[];
}

export interface MarketValidationResponse {
  success: boolean;
  validation_score: MarketValidationScore;
  error?: string;
}

export interface RoadmapGenerationRequest {
  session_id: string;
  business_idea: string;
  industry: string;
  start_date: string;
  user_experience_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface RoadmapGenerationResponse {
  success: boolean;
  roadmap: LaunchRoadmap;
  tasks: RoadmapTask[];
  error?: string;
}

export interface FeedbackAnalysisRequest {
  session_id: string;
  community_post_id: string;
}

export interface FeedbackAnalysisResponse {
  success: boolean;
  feedback: BizMapCommunityFeedback;
  updated_validation_score?: number;
  error?: string;
}
