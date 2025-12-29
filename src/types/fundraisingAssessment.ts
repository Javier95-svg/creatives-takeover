/**
 * Type definitions for the comprehensive fundraising readiness assessment
 * Supports 10-question system with stage-specific guidance
 */

export type FounderStage = 'ideation' | 'validation' | 'building' | 'launching' | 'scaling';
export type FounderExperience = 'first-time' | 'second-time' | 'experienced';
export type QuestionId =
  | 'founder_market_fit'
  | 'mvp'
  | 'traction'
  | 'feedback'
  | 'competitive_positioning'
  | 'gtm_strategy'
  | 'unit_economics'
  | 'team'
  | 'runway'
  | 'legal_readiness'
  | 'investor_network';

export type QuestionVisibility = 'required' | 'optional' | 'hidden';

/**
 * Assessment context collected before questions
 */
export interface AssessmentContext {
  founder_stage: FounderStage;
  founder_experience: FounderExperience;
  industry?: string;
  business_model?: string;
  primary_location?: string;
  funding_amount_needed?: number;
  pitch_summary?: string;
}

/**
 * Question definition with stage-specific visibility
 */
export interface AssessmentQuestion {
  id: QuestionId;
  title: string;
  description: string;
  helpText: string;
  icon: React.ReactNode;
  order: number;
  // Stage-specific visibility rules
  visibility: {
    [K in FounderStage]: QuestionVisibility;
  };
}

/**
 * All assessment scores (11 total)
 */
export interface AssessmentScores {
  // Original 4 scores
  mvp: number;
  feedback: number;
  team: number;
  runway: number;
  // New 7 scores (nullable for backwards compatibility)
  founder_market_fit?: number | null;
  traction?: number | null;
  competitive_positioning?: number | null;
  gtm_strategy?: number | null;
  unit_economics?: number | null;
  legal_readiness?: number | null;
  investor_network?: number | null;
}

/**
 * Stage-specific readiness threshold configuration
 */
export interface ReadinessThreshold {
  min_average: number;
  critical_minimums: {
    [key: string]: number;
  };
  message: string;
}

export const READINESS_THRESHOLDS: Record<FounderStage, ReadinessThreshold> = {
  ideation: {
    min_average: 5.0,
    critical_minimums: { mvp: 3, runway: 4 },
    message: 'Early validation complete, ready for pre-seed conversations'
  },
  validation: {
    min_average: 6.0,
    critical_minimums: { mvp: 5, traction: 3, runway: 5 },
    message: 'Strong early signals, ready for pre-seed/seed'
  },
  building: {
    min_average: 6.5,
    critical_minimums: { mvp: 6, traction: 4, runway: 6 },
    message: 'Product-market fit emerging, ready for seed'
  },
  launching: {
    min_average: 7.0,
    critical_minimums: { mvp: 7, traction: 6, runway: 6 },
    message: 'Growth ready, strong seed/Series A candidate'
  },
  scaling: {
    min_average: 7.5,
    critical_minimums: { mvp: 8, traction: 7, runway: 7 },
    message: 'Scaling proven model, Series A+ ready'
  }
};

/**
 * Enhanced AI analysis response with stage-specific insights
 */
export interface AIAnalysis {
  verdict: 'Ready' | 'Not Ready' | 'Almost Ready';
  confidence: number; // 0-100
  strengths: string[]; // 2-4 stage-specific strengths
  critical_gaps: string[]; // 2-4 stage-specific gaps
  prioritized_actions: PrioritizedAction[];
  stage_benchmark_comparison?: StageBenchmarkComparison;
  timeline_to_readiness?: string;
  next_milestone?: string;
  risk_assessment?: string;
  summary: string;
  // Additional fields returned from edge function
  average_score?: number;
  meets_investor_threshold?: boolean;
  threshold_message?: string;
  scores?: AssessmentScores;
  context?: AssessmentContext;
}

/**
 * Prioritized action item with stage-specific rationale
 */
export interface PrioritizedAction {
  action: string;
  priority: 'High' | 'Medium' | 'Low';
  estimated_time?: string;
  rationale?: string; // Why this matters for this stage
}

/**
 * Stage-specific benchmark comparison
 */
export interface StageBenchmarkComparison {
  above_benchmark: string[]; // Areas exceeding stage expectations
  below_benchmark: string[]; // Areas below stage expectations
  on_track_for_stage: boolean; // Overall on-track assessment
}

/**
 * Assessment submission payload to edge function
 */
export interface AssessmentSubmission {
  // Original 4 scores (required)
  mvp_score: number;
  feedback_score: number;
  team_score: number;
  runway_score: number;
  // New 7 scores (optional)
  founder_market_fit_score?: number | null;
  traction_score?: number | null;
  competitive_positioning_score?: number | null;
  gtm_strategy_score?: number | null;
  unit_economics_score?: number | null;
  legal_readiness_score?: number | null;
  investor_network_score?: number | null;
  // Context fields
  founder_stage?: FounderStage;
  founder_experience?: FounderExperience;
  industry?: string;
  business_model?: string;
  primary_location?: string;
  funding_amount_needed?: number;
  pitch_summary?: string;
}

/**
 * Helper: Get visible questions for a given stage
 */
export function getVisibleQuestions(
  allQuestions: AssessmentQuestion[],
  stage: FounderStage
): AssessmentQuestion[] {
  return allQuestions.filter(q => q.visibility[stage] !== 'hidden');
}

/**
 * Helper: Get required questions for a given stage
 */
export function getRequiredQuestions(
  allQuestions: AssessmentQuestion[],
  stage: FounderStage
): AssessmentQuestion[] {
  return allQuestions.filter(q => q.visibility[stage] === 'required');
}

/**
 * Helper: Check if question is optional for a given stage
 */
export function isQuestionOptional(
  question: AssessmentQuestion,
  stage: FounderStage
): boolean {
  return question.visibility[stage] === 'optional';
}

/**
 * Helper: Calculate if meets investor threshold
 */
export function meetsInvestorThreshold(
  scores: AssessmentScores,
  stage: FounderStage
): boolean {
  const threshold = READINESS_THRESHOLDS[stage];

  // Calculate average (excluding null/undefined scores)
  const allScores = Object.values(scores).filter(
    score => score !== null && score !== undefined
  ) as number[];

  if (allScores.length === 0) return false;

  const average = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

  // Check average threshold
  if (average < threshold.min_average) return false;

  // Check critical minimums
  const criticalScores: Record<string, number> = {
    mvp: scores.mvp,
    traction: scores.traction ?? 0,
    runway: scores.runway
  };

  const meetsCritical = Object.entries(threshold.critical_minimums).every(
    ([key, minValue]) => criticalScores[key] >= minValue
  );

  return meetsCritical;
}
