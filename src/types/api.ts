/**
 * Centralized API response types for type safety
 */

export interface BusinessSuccessScore {
  overall_score: number;
  market_clarity_score: number;
  problem_validation_score: number;
  solution_strength_score: number;
  market_strategy_score: number;
  financial_planning_score: number;
  execution_feasibility_score: number;
  risk_assessment: 'low' | 'medium' | 'high';
  success_likelihood: 'high' | 'good' | 'moderate' | 'challenging';
  key_strengths: string[];
  improvement_areas: string[];
  action_recommendations: string[];
  scoring_breakdown: Record<string, number>;
}

export interface ChatbotReportData {
  sessionId: string;
  businessContext: BusinessContext;
  successScore: BusinessSuccessScore;
  messages: ChatMessage[];
  generatedAt: string;
}

export interface BusinessContext {
  industry?: string;
  businessType?: 'startup' | 'existing' | 'franchise' | 'acquisition';
  stage?: 'idea' | 'planning' | 'launch' | 'growth' | 'expansion';
  location?: string;
  budget?: string;
  timeline?: string;
  experience?: 'first-time' | 'experienced' | 'serial-entrepreneur';
  goals?: string[];
  painPoints?: string[];
  completedSections?: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  quickActions?: QuickAction[];
  messageType?: 'text' | 'business_plan' | 'financial' | 'market_analysis' | 'recommendation';
  businessContext?: string;
  confidence?: number;
  sources?: string[];
  attachments?: Attachment[];
}

export interface QuickAction {
  text: string;
  id?: string;
  action?: string;
  href?: string;
}

export interface Attachment {
  type: 'pdf' | 'xlsx' | 'docx' | 'image';
  name: string;
  url: string;
}

export interface EdgeFunctionResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
}

export interface MarketIntelligence {
  id: string;
  data_type: string;
  industry: string;
  title: string;
  summary: string;
  relevance_score: number;
  freshness_score: number;
  opportunity_score: number;
  source_name: string;
  created_at: string;
  insights: string[];
  market_impact: string;
}

export interface DailyChallenge {
  id: string;
  challenge_type: string;
  challenge_title: string;
  challenge_description: string;
  reward_points: number;
  participants_count: number;
  completion_count: number;
}

export interface ReputationUpdate {
  success: boolean;
  new_points: number;
  points_awarded: number;
  level: number;
  level_name: string;
  level_up: boolean;
  next_threshold: number;
}

export interface CreditTransaction {
  user_id: string;
  amount: number;
  tx_type: 'grant' | 'deduct' | 'purchase' | 'refund';
  feature: string;
  reason?: string;
  created_at: string;
}

export interface StreamingChatResponse {
  message: string;
  quickActions?: QuickAction[];
  businessContext?: BusinessContext;
  confidence?: number;
  sources?: string[];
}
