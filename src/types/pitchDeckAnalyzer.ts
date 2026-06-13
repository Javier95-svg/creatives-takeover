// Pitch Deck Analyzer Types

export type AnalysisVerdict = 'Excellent' | 'Strong' | 'Good' | 'Needs Work';

export interface PitchDeckAnalysis {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  storagePath: string;

  // Overall score
  overallScore: number; // 0-100
  verdict: AnalysisVerdict;

  // Sub-scores (each 0-100)
  subScores: {
    storyClarity: number;
    marketOpportunity: number;
    tractionProof: number;
    businessModel: number;
    teamCredibility: number;
    fundraisingReadiness: number;
  };

  // Detailed feedback
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  keyInsights?: Record<string, any>;

  // User feedback
  userRating?: number; // 1-5 stars
  userFeedback?: string;
  feedbackSubmittedAt?: string;

  // Metadata
  analysisVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisMetric {
  key: string;
  name: string;
  score: number;
  weight: number; // For calculating overall score (0-1)
  description: string;
  color: string; // Tailwind color class
  icon?: string; // Lucide icon name
}

export const METRIC_DEFINITIONS: AnalysisMetric[] = [
  {
    key: 'storyClarity',
    name: 'Story & Clarity',
    score: 0,
    weight: 0.15,
    description: 'How fast and clearly investors understand your idea',
    color: 'text-info',
    icon: 'BookOpen'
  },
  {
    key: 'marketOpportunity',
    name: 'Market & Opportunity',
    score: 0,
    weight: 0.20,
    description: 'Market size, customer definition, and differentiation',
    color: 'text-success',
    icon: 'TrendingUp'
  },
  {
    key: 'tractionProof',
    name: 'Traction & Proof',
    score: 0,
    weight: 0.30, // Most important
    description: 'Growth metrics, revenue, and customer proof',
    color: 'text-purple-500',
    icon: 'BarChart3'
  },
  {
    key: 'businessModel',
    name: 'Business Model',
    score: 0,
    weight: 0.15,
    description: 'Pricing clarity, unit economics, and scalability',
    color: 'text-warning',
    icon: 'DollarSign'
  },
  {
    key: 'teamCredibility',
    name: 'Team & Credibility',
    score: 0,
    weight: 0.10,
    description: 'Founder-market fit and execution track record',
    color: 'text-pink-500',
    icon: 'Users'
  },
  {
    key: 'fundraisingReadiness',
    name: 'Fundraising Readiness',
    score: 0,
    weight: 0.10,
    description: 'Round appropriateness and investor fit',
    color: 'text-warning',
    icon: 'Target'
  }
];

// Helper function to calculate overall score from sub-scores
export const calculateOverallScore = (subScores: PitchDeckAnalysis['subScores']): number => {
  return Math.round(
    subScores.storyClarity * 0.15 +
    subScores.marketOpportunity * 0.20 +
    subScores.tractionProof * 0.30 +
    subScores.businessModel * 0.15 +
    subScores.teamCredibility * 0.10 +
    subScores.fundraisingReadiness * 0.10
  );
};

// Helper function to determine verdict from score
export const getVerdictFromScore = (score: number): AnalysisVerdict => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Good';
  return 'Needs Work';
};

// Helper function to get verdict color
export const getVerdictColor = (verdict: AnalysisVerdict): string => {
  switch (verdict) {
    case 'Excellent':
      return 'text-success bg-success-subtle border-success';
    case 'Strong':
      return 'text-info bg-info-subtle border-info';
    case 'Good':
      return 'text-warning bg-warning-subtle border-warning';
    case 'Needs Work':
      return 'text-destructive bg-destructive-subtle border-destructive';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
};
