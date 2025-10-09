// Socratic Logic Engine Types and Interfaces

export interface BusinessEntity {
  type: 'problem' | 'solution' | 'market' | 'customer' | 'competitor' | 'revenue' | 'cost' | 'assumption' | 'evidence';
  text: string;
  confidence: number;
  context: string;
  position: { start: number; end: number };
}

export interface Assumption {
  id: string;
  text: string;
  type: 'market' | 'customer' | 'financial' | 'competitive' | 'technical' | 'regulatory';
  confidence: number;
  evidence: Evidence[];
  risks: string[];
  validationMethods: string[];
}

export interface Evidence {
  type: 'data' | 'research' | 'testimony' | 'observation' | 'analysis';
  strength: 'weak' | 'moderate' | 'strong';
  source: string;
  description: string;
  reliability: number;
}

export interface LogicGap {
  id: string;
  type: 'missing_evidence' | 'unclear_assumption' | 'logical_fallacy' | 'insufficient_validation' | 'contradiction';
  description: string;
  impact: 'low' | 'medium' | 'high';
  suggestions: string[];
}

export interface SocraticQuestion {
  id: string;
  type: 'clarification' | 'assumption_testing' | 'evidence_evaluation' | 'perspective_exploration' | 'implication_analysis';
  question: string;
  followUp?: string;
  reasoningType: ReasoningType;
  priority: 'low' | 'medium' | 'high';
  complexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  targetAudience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  examples?: string[];
  technicalTerms?: string[];
}

export type ReasoningType = 
  | 'problem_solution_fit'
  | 'market_validation'
  | 'financial_modeling'
  | 'competitive_analysis'
  | 'growth_strategy'
  | 'risk_assessment'
  | 'decision_making';

export interface ReasoningAnalysis {
  reasoningType: ReasoningType;
  entities: BusinessEntity[];
  assumptions: Assumption[];
  logicGaps: LogicGap[];
  confidence: number;
  logicalFallacies: LogicalFallacy[];
  evidenceStrength: EvidenceStrength;
}

export interface LogicalFallacy {
  type: 'confirmation_bias' | 'correlation_causation' | 'sunk_cost' | 'appeal_authority' | 'false_dichotomy' | 'hasty_generalization' | 'straw_man' | 'ad_hominem' | 'appeal_to_emotion' | 'slippery_slope' | 'post_hoc' | 'red_herring' | 'bandwagon';
  description: string;
  impact: 'low' | 'medium' | 'high';
  correction: string;
}

export interface EvidenceStrength {
  overall: number;
  byType: {
    data: number;
    research: number;
    testimony: number;
    observation: number;
    analysis: number;
  };
  gaps: string[];
}

export interface LogicEvaluation {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface BusinessStatement {
  id: string;
  text: string;
  type: 'claim' | 'assumption' | 'evidence' | 'conclusion';
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

export interface ReasoningPath {
  id: string;
  steps: ReasoningStep[];
  currentStep: number;
  completed: boolean;
  insights: string[];
}

export interface ReasoningStep {
  id: string;
  type: 'question' | 'analysis' | 'validation' | 'synthesis';
  content: string;
  completed: boolean;
  insights: string[];
  nextSteps: string[];
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  recommendations: string[];
  evidenceRequired: string[];
}

export interface BusinessLogic {
  statements: BusinessStatement[];
  reasoning: string;
  evidence: Evidence[];
  assumptions: Assumption[];
  conclusions: string[];
}

export interface UserProfile {
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  reasoningStyle: 'analytical' | 'intuitive' | 'systematic' | 'creative';
  industryExperience: Record<string, number>; // industry -> years of experience
  learningPreferences: {
    questionStyle: 'gentle' | 'challenging' | 'socratic';
    detailLevel: 'summary' | 'detailed' | 'comprehensive';
    examplesNeeded: boolean;
    technicalDepth: 'basic' | 'intermediate' | 'advanced';
  };
  conversationHistory: {
    totalSessions: number;
    averageSessionLength: number;
    preferredReasoningTypes: ReasoningType[];
    improvementAreas: string[];
    strengths: string[];
  };
}

export interface SocraticContext {
  businessContext: {
    industry?: string;
    stage?: string;
    problem?: string;
    solution?: string;
    market?: string;
  };
  reasoningHistory: ReasoningAnalysis[];
  currentFocus: ReasoningType;
  userConfidence: number;
  sessionGoals: string[];
  userProfile: UserProfile;
}

export interface SocraticEngineConfig {
  enableFallacyDetection: boolean;
  enableAssumptionSurfacing: boolean;
  enableEvidenceEvaluation: boolean;
  maxQuestionsPerSession: number;
  reasoningDepth: 'shallow' | 'medium' | 'deep';
  questionStyle: 'gentle' | 'challenging' | 'socratic';
}

// NLP Pipeline Types
export interface BusinessNLPResult {
  entities: BusinessEntity[];
  assumptions: Assumption[];
  logicalGaps: LogicGap[];
  reasoningType: ReasoningType;
  confidence: number;
  sentiment: {
    confidence: number;
    uncertainty: number;
    defensiveness: number;
  };
}

export interface ReasoningPattern {
  id: string;
  name: string;
  description: string;
  questions: SocraticQuestion[];
  validationCriteria: string[];
  commonGaps: LogicGap[];
}

// Question Generation Types
export interface QuestionContext {
  currentReasoning: ReasoningAnalysis;
  businessContext: SocraticContext['businessContext'];
  userResponse: string;
  previousQuestions: SocraticQuestion[];
  sessionProgress: number;
}

export interface QuestionGenerationResult {
  questions: SocraticQuestion[];
  reasoning: string;
  nextFocus: ReasoningType;
  priority: 'low' | 'medium' | 'high';
}
