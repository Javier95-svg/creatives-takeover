import { 
  ReasoningPattern, 
  SocraticQuestion, 
  LogicGap, 
  ValidationResult,
  BusinessLogic,
  Assumption,
  Evidence
} from '@/types/socratic';

// Problem-Solution Fit Pattern
export const problemSolutionFitPattern: ReasoningPattern = {
  id: 'problem_solution_fit',
  name: 'Problem-Solution Fit Validation',
  description: 'Systematic validation of whether your solution actually solves the identified problem',
  questions: [
    {
      id: 'psf_1',
      type: 'clarification',
      question: 'What specific problem are you trying to solve?',
      followUp: 'Can you describe this problem in detail?',
      reasoningType: 'problem_solution_fit',
      priority: 'high'
    },
    {
      id: 'psf_2',
      type: 'assumption_testing',
      question: 'How do you know this is a real problem that people experience?',
      followUp: 'What evidence shows people are actively seeking a solution?',
      reasoningType: 'problem_solution_fit',
      priority: 'high'
    },
    {
      id: 'psf_3',
      type: 'evidence_evaluation',
      question: 'How does your solution specifically address this problem?',
      followUp: 'What makes your approach better than existing alternatives?',
      reasoningType: 'problem_solution_fit',
      priority: 'high'
    },
    {
      id: 'psf_4',
      type: 'perspective_exploration',
      question: 'How do potential customers currently solve this problem?',
      followUp: 'What would make them switch to your solution?',
      reasoningType: 'problem_solution_fit',
      priority: 'medium'
    },
    {
      id: 'psf_5',
      type: 'implication_analysis',
      question: 'What happens if your solution doesn\'t work as expected?',
      followUp: 'How would you know if the solution is actually working?',
      reasoningType: 'problem_solution_fit',
      priority: 'medium'
    }
  ],
  validationCriteria: [
    'Problem is clearly defined and specific',
    'Evidence exists that people experience this problem',
    'Solution directly addresses the identified problem',
    'Solution is differentiated from existing alternatives',
    'Mechanism exists to validate solution effectiveness'
  ],
  commonGaps: [
    {
      id: 'psf_gap_1',
      type: 'missing_evidence',
      description: 'No evidence that the problem actually exists',
      impact: 'high',
      suggestions: ['Conduct customer interviews', 'Survey potential users', 'Analyze existing solutions']
    },
    {
      id: 'psf_gap_2',
      type: 'unclear_assumption',
      description: 'Solution doesn\'t clearly address the problem',
      impact: 'high',
      suggestions: ['Map solution features to problem symptoms', 'Create problem-solution matrix', 'Test solution with real users']
    },
    {
      id: 'psf_gap_3',
      type: 'insufficient_validation',
      description: 'No way to measure if solution actually works',
      impact: 'medium',
      suggestions: ['Define success metrics', 'Create validation framework', 'Plan user testing approach']
    }
  ]
};

// Market Validation Pattern
export const marketValidationPattern: ReasoningPattern = {
  id: 'market_validation',
  name: 'Market Validation Analysis',
  description: 'Comprehensive validation of market size, demand, and customer behavior',
  questions: [
    {
      id: 'mv_1',
      type: 'clarification',
      question: 'How big is the market for this solution?',
      followUp: 'What\'s your total addressable market (TAM)?',
      reasoningType: 'market_validation',
      priority: 'high'
    },
    {
      id: 'mv_2',
      type: 'assumption_testing',
      question: 'What evidence shows customers will actually buy this?',
      followUp: 'Have you validated demand through pre-sales or surveys?',
      reasoningType: 'market_validation',
      priority: 'high'
    },
    {
      id: 'mv_3',
      type: 'evidence_evaluation',
      question: 'How do you know customers will pay your price?',
      followUp: 'What research supports your pricing assumptions?',
      reasoningType: 'market_validation',
      priority: 'high'
    },
    {
      id: 'mv_4',
      type: 'perspective_exploration',
      question: 'How do customers currently solve this problem?',
      followUp: 'What would motivate them to switch to your solution?',
      reasoningType: 'market_validation',
      priority: 'medium'
    },
    {
      id: 'mv_5',
      type: 'implication_analysis',
      question: 'What if the market is smaller than expected?',
      followUp: 'How would you pivot if market demand is insufficient?',
      reasoningType: 'market_validation',
      priority: 'medium'
    }
  ],
  validationCriteria: [
    'Market size is quantified and realistic',
    'Customer demand is validated through research',
    'Pricing is supported by customer willingness to pay',
    'Customer acquisition channels are identified',
    'Market timing and trends are favorable'
  ],
  commonGaps: [
    {
      id: 'mv_gap_1',
      type: 'missing_evidence',
      description: 'No validation of actual customer demand',
      impact: 'high',
      suggestions: ['Conduct customer interviews', 'Run market surveys', 'Test with landing pages']
    },
    {
      id: 'mv_gap_2',
      type: 'unclear_assumption',
      description: 'Market size estimates are not well-founded',
      impact: 'high',
      suggestions: ['Research industry reports', 'Analyze competitor data', 'Use bottom-up market sizing']
    },
    {
      id: 'mv_gap_3',
      type: 'insufficient_validation',
      description: 'Pricing assumptions are not validated',
      impact: 'medium',
      suggestions: ['Conduct pricing research', 'Test different price points', 'Analyze competitor pricing']
    }
  ]
};

// Financial Modeling Pattern
export const financialModelingPattern: ReasoningPattern = {
  id: 'financial_modeling',
  name: 'Financial Model Validation',
  description: 'Systematic validation of financial assumptions and projections',
  questions: [
    {
      id: 'fm_1',
      type: 'clarification',
      question: 'How do you calculate your revenue projections?',
      followUp: 'What assumptions underlie your revenue model?',
      reasoningType: 'financial_modeling',
      priority: 'high'
    },
    {
      id: 'fm_2',
      type: 'assumption_testing',
      question: 'What evidence supports your pricing assumptions?',
      followUp: 'How do you know customers will pay these prices?',
      reasoningType: 'financial_modeling',
      priority: 'high'
    },
    {
      id: 'fm_3',
      type: 'evidence_evaluation',
      question: 'How do you validate your cost estimates?',
      followUp: 'What research supports your cost assumptions?',
      reasoningType: 'financial_modeling',
      priority: 'medium'
    },
    {
      id: 'fm_4',
      type: 'perspective_exploration',
      question: 'How do investors evaluate similar financial models?',
      followUp: 'What benchmarks do you use for comparison?',
      reasoningType: 'financial_modeling',
      priority: 'medium'
    },
    {
      id: 'fm_5',
      type: 'implication_analysis',
      question: 'What happens if your financial projections are wrong?',
      followUp: 'How sensitive is your model to key assumptions?',
      reasoningType: 'financial_modeling',
      priority: 'medium'
    }
  ],
  validationCriteria: [
    'Revenue model is logical and well-supported',
    'Pricing assumptions are validated',
    'Cost estimates are realistic and detailed',
    'Unit economics are positive',
    'Sensitivity analysis has been conducted'
  ],
  commonGaps: [
    {
      id: 'fm_gap_1',
      type: 'missing_evidence',
      description: 'Revenue projections lack supporting evidence',
      impact: 'high',
      suggestions: ['Research customer willingness to pay', 'Analyze competitor pricing', 'Test pricing with customers']
    },
    {
      id: 'fm_gap_2',
      type: 'unclear_assumption',
      description: 'Cost assumptions are not well-documented',
      impact: 'medium',
      suggestions: ['Research actual costs', 'Get quotes from vendors', 'Analyze similar businesses']
    },
    {
      id: 'fm_gap_3',
      type: 'insufficient_validation',
      description: 'No sensitivity analysis or scenario planning',
      impact: 'medium',
      suggestions: ['Create best/worst/most likely scenarios', 'Test key assumptions', 'Build flexible model']
    }
  ]
};

// Competitive Analysis Pattern
export const competitiveAnalysisPattern: ReasoningPattern = {
  id: 'competitive_analysis',
  name: 'Competitive Analysis Framework',
  description: 'Systematic analysis of competitive landscape and positioning',
  questions: [
    {
      id: 'ca_1',
      type: 'clarification',
      question: 'Who are your main competitors and how are you different?',
      followUp: 'What unique value do you provide that they don\'t?',
      reasoningType: 'competitive_analysis',
      priority: 'high'
    },
    {
      id: 'ca_2',
      type: 'assumption_testing',
      question: 'How defensible is your competitive advantage?',
      followUp: 'What prevents competitors from copying your approach?',
      reasoningType: 'competitive_analysis',
      priority: 'high'
    },
    {
      id: 'ca_3',
      type: 'evidence_evaluation',
      question: 'What evidence shows customers prefer your solution?',
      followUp: 'How do you measure competitive advantage?',
      reasoningType: 'competitive_analysis',
      priority: 'medium'
    },
    {
      id: 'ca_4',
      type: 'perspective_exploration',
      question: 'How do competitors view your solution?',
      followUp: 'What would they say about your positioning?',
      reasoningType: 'competitive_analysis',
      priority: 'medium'
    },
    {
      id: 'ca_5',
      type: 'implication_analysis',
      question: 'What happens if competitors respond aggressively?',
      followUp: 'How would you defend against competitive threats?',
      reasoningType: 'competitive_analysis',
      priority: 'medium'
    }
  ],
  validationCriteria: [
    'Competitors are clearly identified and analyzed',
    'Differentiation is clear and defensible',
    'Competitive advantage is sustainable',
    'Customer preference is validated',
    'Response to competitive threats is planned'
  ],
  commonGaps: [
    {
      id: 'ca_gap_1',
      type: 'missing_evidence',
      description: 'No evidence of competitive advantage',
      impact: 'high',
      suggestions: ['Research competitor strengths/weaknesses', 'Test differentiation with customers', 'Analyze competitive positioning']
    },
    {
      id: 'ca_gap_2',
      type: 'unclear_assumption',
      description: 'Differentiation is not clearly articulated',
      impact: 'high',
      suggestions: ['Create competitive comparison matrix', 'Define unique value proposition', 'Test messaging with customers']
    },
    {
      id: 'ca_gap_3',
      type: 'insufficient_validation',
      description: 'No plan for competitive response',
      impact: 'medium',
      suggestions: ['Develop competitive strategy', 'Plan defensive moves', 'Build barriers to entry']
    }
  ]
};

// Growth Strategy Pattern
export const growthStrategyPattern: ReasoningPattern = {
  id: 'growth_strategy',
  name: 'Growth Strategy Validation',
  description: 'Systematic validation of growth assumptions and scaling plans',
  questions: [
    {
      id: 'gs_1',
      type: 'clarification',
      question: 'How do you plan to acquire your first customers?',
      followUp: 'What\'s your customer acquisition strategy?',
      reasoningType: 'growth_strategy',
      priority: 'high'
    },
    {
      id: 'gs_2',
      type: 'assumption_testing',
      question: 'What evidence supports your growth projections?',
      followUp: 'How do you validate your scaling assumptions?',
      reasoningType: 'growth_strategy',
      priority: 'high'
    },
    {
      id: 'gs_3',
      type: 'evidence_evaluation',
      question: 'How will you maintain growth as you scale?',
      followUp: 'What systems and processes will you need?',
      reasoningType: 'growth_strategy',
      priority: 'medium'
    },
    {
      id: 'gs_4',
      type: 'perspective_exploration',
      question: 'How do successful companies in your space achieve growth?',
      followUp: 'What can you learn from their approaches?',
      reasoningType: 'growth_strategy',
      priority: 'medium'
    },
    {
      id: 'gs_5',
      type: 'implication_analysis',
      question: 'What happens if growth is slower than expected?',
      followUp: 'How would you adapt your strategy?',
      reasoningType: 'growth_strategy',
      priority: 'medium'
    }
  ],
  validationCriteria: [
    'Customer acquisition strategy is defined and tested',
    'Growth projections are realistic and supported',
    'Scaling requirements are identified',
    'Resource needs for growth are planned',
    'Growth metrics and milestones are defined'
  ],
  commonGaps: [
    {
      id: 'gs_gap_1',
      type: 'missing_evidence',
      description: 'No validation of customer acquisition approach',
      impact: 'high',
      suggestions: ['Test acquisition channels', 'Measure acquisition costs', 'Validate conversion rates']
    },
    {
      id: 'gs_gap_2',
      type: 'unclear_assumption',
      description: 'Growth assumptions are not well-supported',
      impact: 'high',
      suggestions: ['Research industry growth rates', 'Analyze similar companies', 'Test growth hypotheses']
    },
    {
      id: 'gs_gap_3',
      type: 'insufficient_validation',
      description: 'No plan for scaling operations',
      impact: 'medium',
      suggestions: ['Define scaling requirements', 'Plan resource needs', 'Build scalable systems']
    }
  ]
};

// Risk Assessment Pattern
export const riskAssessmentPattern: ReasoningPattern = {
  id: 'risk_assessment',
  name: 'Risk Assessment Framework',
  description: 'Systematic identification and evaluation of business risks',
  questions: [
    {
      id: 'ra_1',
      type: 'clarification',
      question: 'What are the biggest risks to your business?',
      followUp: 'Which risks keep you awake at night?',
      reasoningType: 'risk_assessment',
      priority: 'high'
    },
    {
      id: 'ra_2',
      type: 'assumption_testing',
      question: 'What assumptions could be wrong and cause problems?',
      followUp: 'How do you test your key assumptions?',
      reasoningType: 'risk_assessment',
      priority: 'high'
    },
    {
      id: 'ra_3',
      type: 'evidence_evaluation',
      question: 'How do you monitor and measure these risks?',
      followUp: 'What early warning signs would you look for?',
      reasoningType: 'risk_assessment',
      priority: 'medium'
    },
    {
      id: 'ra_4',
      type: 'perspective_exploration',
      question: 'How do investors view risks in your industry?',
      followUp: 'What risks do they typically focus on?',
      reasoningType: 'risk_assessment',
      priority: 'medium'
    },
    {
      id: 'ra_5',
      type: 'implication_analysis',
      question: 'What happens if your biggest risks materialize?',
      followUp: 'How would you mitigate or respond to these risks?',
      reasoningType: 'risk_assessment',
      priority: 'medium'
    }
  ],
  validationCriteria: [
    'Key risks are identified and prioritized',
    'Risk mitigation strategies are developed',
    'Early warning systems are in place',
    'Contingency plans are prepared',
    'Risk monitoring is systematic'
  ],
  commonGaps: [
    {
      id: 'ra_gap_1',
      type: 'missing_evidence',
      description: 'No systematic risk identification process',
      impact: 'high',
      suggestions: ['Conduct risk assessment workshop', 'Research industry risks', 'Analyze failure patterns']
    },
    {
      id: 'ra_gap_2',
      type: 'unclear_assumption',
      description: 'Risk mitigation strategies are not defined',
      impact: 'medium',
      suggestions: ['Develop risk mitigation plans', 'Create contingency strategies', 'Build risk monitoring systems']
    },
    {
      id: 'ra_gap_3',
      type: 'insufficient_validation',
      description: 'No plan for risk monitoring and response',
      impact: 'medium',
      suggestions: ['Define risk metrics', 'Create monitoring systems', 'Plan response procedures']
    }
  ]
};

// Export all patterns
export const socraticLogicPatterns: ReasoningPattern[] = [
  problemSolutionFitPattern,
  marketValidationPattern,
  financialModelingPattern,
  competitiveAnalysisPattern,
  growthStrategyPattern,
  riskAssessmentPattern
];

// Helper function to get pattern by reasoning type
export const getPatternByReasoningType = (reasoningType: string): ReasoningPattern | null => {
  return socraticLogicPatterns.find(pattern => pattern.id === reasoningType) || null;
};

// Helper function to validate business logic against pattern
export const validateBusinessLogic = (
  businessLogic: BusinessLogic,
  pattern: ReasoningPattern
): ValidationResult => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const evidenceRequired: string[] = [];

  // Check against validation criteria
  pattern.validationCriteria.forEach(criteria => {
    // This is a simplified validation - in practice, you'd have more sophisticated logic
    if (!businessLogic.statements.some(stmt => stmt.text.toLowerCase().includes(criteria.toLowerCase().split(' ')[0]))) {
      issues.push(`Missing: ${criteria}`);
      recommendations.push(`Address: ${criteria}`);
    }
  });

  // Check for common gaps
  pattern.commonGaps.forEach(gap => {
    if (gap.impact === 'high') {
      evidenceRequired.push(...gap.suggestions);
    }
  });

  const isValid = issues.length === 0;
  const confidence = isValid ? 1.0 : Math.max(0, 1 - (issues.length / pattern.validationCriteria.length));

  return {
    isValid,
    confidence,
    issues,
    recommendations,
    evidenceRequired
  };
};
