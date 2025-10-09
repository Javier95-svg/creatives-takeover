import { 
  BusinessEntity, 
  Assumption, 
  LogicGap, 
  BusinessNLPResult, 
  ReasoningType,
  LogicalFallacy,
  EvidenceStrength
} from '@/types/socratic';

export interface BusinessNLPConfig {
  enableEntityExtraction: boolean;
  enableAssumptionDetection: boolean;
  enableLogicGapAnalysis: boolean;
  enableFallacyDetection: boolean;
  confidenceThreshold: number;
}

export const useSocraticNLP = (config: BusinessNLPConfig = {
  enableEntityExtraction: true,
  enableAssumptionDetection: true,
  enableLogicGapAnalysis: true,
  enableFallacyDetection: true,
  confidenceThreshold: 0.6
}) => {
  
  // Business entity patterns for extraction
  const entityPatterns = {
    problem: [
      /\b(problem|issue|challenge|pain point|struggle|frustration|difficulty)\b/gi,
      /\b(can't|unable to|difficult to|struggling with|facing)\b/gi,
      /\b(need|want|desire|wish)\b.*\b(but|however|unfortunately)\b/gi
    ],
    solution: [
      /\b(solution|solve|fix|address|resolve|help|provide|offer)\b/gi,
      /\b(our product|our service|our platform|we|our company)\b/gi,
      /\b(build|create|develop|design|launch)\b/gi
    ],
    market: [
      /\b(market|industry|sector|space|field)\b/gi,
      /\b(target market|customer base|audience|demographics)\b/gi,
      /\b(\$[\d,]+|\d+%\s+of|\d+\s+million|\d+\s+billion)\b/gi
    ],
    customer: [
      /\b(customers|users|clients|buyers|consumers|people)\b/gi,
      /\b(target|ideal|potential|prospective)\s+(customer|client|user)\b/gi,
      /\b(demographics|segments|personas|buyer profiles)\b/gi
    ],
    competitor: [
      /\b(competitor|competition|rival|alternative|substitute)\b/gi,
      /\b(like|similar to|comparable to|versus|vs)\b/gi,
      /\b(market leader|established player|incumbent)\b/gi
    ],
    revenue: [
      /\b(revenue|income|sales|earnings|profit|revenue stream)\b/gi,
      /\b(pricing|price|cost|fee|subscription|one-time)\b/gi,
      /\b(\$[\d,]+\s+(per|per month|per year|annually|monthly))\b/gi
    ],
    cost: [
      /\b(cost|expense|spending|investment|budget)\b/gi,
      /\b(operating cost|fixed cost|variable cost|startup cost)\b/gi,
      /\b(expensive|cheap|affordable|cost-effective)\b/gi
    ],
    assumption: [
      /\b(assume|assumption|believe|think|expect|anticipate)\b/gi,
      /\b(probably|likely|unlikely|certainly|definitely)\b/gi,
      /\b(based on|given that|assuming|if)\b/gi
    ],
    evidence: [
      /\b(data shows|research indicates|studies show|evidence suggests)\b/gi,
      /\b(according to|based on research|survey results|market data)\b/gi,
      /\b(proven|validated|tested|confirmed|demonstrated)\b/gi
    ]
  };

  // Assumption detection patterns
  const assumptionPatterns = {
    market: [
      /\b(market will|customers will|demand will|growth will)\b/gi,
      /\b(people want|users need|customers prefer)\b/gi,
      /\b(trending|growing|increasing|expanding)\b/gi
    ],
    customer: [
      /\b(customers are|customers will|customers prefer)\b/gi,
      /\b(users want|buyers need|consumers like)\b/gi,
      /\b(target audience|ideal customer|primary user)\b/gi
    ],
    financial: [
      /\b(revenue will|profit will|growth will|costs will)\b/gi,
      /\b(pricing will|market size|unit economics)\b/gi,
      /\b(break-even|ROI|return on investment)\b/gi
    ],
    competitive: [
      /\b(competitors are|market is|industry is)\b/gi,
      /\b(barriers to entry|competitive advantage|moat)\b/gi,
      /\b(market share|positioning|differentiation)\b/gi
    ],
    technical: [
      /\b(technology will|platform will|system will)\b/gi,
      /\b(scalable|efficient|reliable|secure)\b/gi,
      /\b(development time|technical feasibility)\b/gi
    ],
    regulatory: [
      /\b(regulations|compliance|legal|permits|licenses)\b/gi,
      /\b(government|policy|law|requirements)\b/gi,
      /\b(approved|certified|licensed|compliant)\b/gi
    ]
  };

  // Logical fallacy detection patterns
  const fallacyPatterns = {
    confirmation_bias: [
      /\b(proves|confirms|validates)\b.*\b(what I thought|my idea|my belief)\b/gi,
      /\b(see|look at|obviously)\b.*\b(supports|shows|demonstrates)\b/gi
    ],
    correlation_causation: [
      /\b(because|since|due to)\b.*\b(correlates|happened together|coincided)\b/gi,
      /\b(correlation|relationship)\b.*\b(causes|leads to|results in)\b/gi
    ],
    sunk_cost: [
      /\b(already invested|spent so much|too much time|can't quit now)\b/gi,
      /\b(we have to|must continue|no turning back)\b/gi
    ],
    appeal_authority: [
      /\b(expert says|industry leader|successful entrepreneur)\b.*\b(so|therefore|thus)\b/gi,
      /\b(according to|based on)\b.*\b(authority|expert|guru)\b/gi
    ],
    false_dichotomy: [
      /\b(either|or|must choose between|only two options)\b/gi,
      /\b(all or nothing|win or lose|succeed or fail)\b/gi
    ],
    hasty_generalization: [
      /\b(all|every|none|never|always)\b.*\b(based on|from|using)\b.*\b(few|some|one)\b/gi,
      /\b(general trend|typical|usually)\b.*\b(single example|one case)\b/gi
    ]
  };

  // Extract business entities from text
  const extractEntities = (text: string): BusinessEntity[] => {
    const entities: BusinessEntity[] = [];
    
    Object.entries(entityPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              type: type as BusinessEntity['type'],
              text: match[0],
              confidence: 0.8,
              context: text.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50),
              position: { start: match.index, end: match.index + match[0].length }
            });
          }
        }
      });
    });

    return entities;
  };

  // Detect assumptions in text
  const detectAssumptions = (text: string): Assumption[] => {
    const assumptions: Assumption[] = [];
    
    Object.entries(assumptionPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            assumptions.push({
              id: `assumption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: match[0],
              type: type as Assumption['type'],
              confidence: 0.7,
              evidence: [],
              risks: [],
              validationMethods: []
            });
          }
        }
      });
    });

    return assumptions;
  };

  // Detect logical gaps
  const detectLogicGaps = (text: string, assumptions: Assumption[]): LogicGap[] => {
    const gaps: LogicGap[] = [];
    
    // Check for missing evidence
    if (assumptions.length > 0 && !text.match(/\b(data|research|study|evidence|proof|validation)\b/gi)) {
      gaps.push({
        id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'missing_evidence',
        description: 'Statements made without supporting evidence or data',
        impact: 'high',
        suggestions: ['Provide supporting data', 'Conduct market research', 'Validate assumptions with customers']
      });
    }

    // Check for unclear assumptions
    const unclearAssumptions = assumptions.filter(a => a.confidence < 0.5);
    if (unclearAssumptions.length > 0) {
      gaps.push({
        id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'unclear_assumption',
        description: 'Some assumptions are unclear or weakly supported',
        impact: 'medium',
        suggestions: ['Clarify assumptions', 'Provide more context', 'Explain reasoning']
      });
    }

    // Check for contradictions
    const entities = extractEntities(text);
    const problems = entities.filter(e => e.type === 'problem');
    const solutions = entities.filter(e => e.type === 'solution');
    
    if (problems.length > 0 && solutions.length === 0) {
      gaps.push({
        id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'insufficient_validation',
        description: 'Problem identified but no clear solution proposed',
        impact: 'high',
        suggestions: ['Define your solution', 'Explain how you solve the problem', 'Describe your value proposition']
      });
    }

    return gaps;
  };

  // Detect logical fallacies
  const detectFallacies = (text: string): LogicalFallacy[] => {
    const fallacies: LogicalFallacy[] = [];
    
    Object.entries(fallacyPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match.index !== undefined) {
            fallacies.push({
              type: type as LogicalFallacy['type'],
              description: `Potential ${type.replace('_', ' ')} detected: "${match[0]}"`,
              impact: 'medium',
              correction: getFallacyCorrection(type as LogicalFallacy['type'])
            });
          }
        }
      });
    });

    return fallacies;
  };

  // Get correction suggestions for fallacies
  const getFallacyCorrection = (fallacyType: LogicalFallacy['type']): string => {
    const corrections = {
      confirmation_bias: 'Consider evidence that might contradict your assumptions',
      correlation_causation: 'Distinguish between correlation and causation',
      sunk_cost: 'Focus on future value rather than past investment',
      appeal_authority: 'Evaluate the argument on its merits, not just the source',
      false_dichotomy: 'Consider alternative options beyond the two presented',
      hasty_generalization: 'Base conclusions on sufficient evidence'
    };
    return corrections[fallacyType] || 'Review the logical reasoning';
  };

  // Determine reasoning type from text
  const determineReasoningType = (text: string): ReasoningType => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('problem') && lowerText.includes('solution')) {
      return 'problem_solution_fit';
    }
    if (lowerText.includes('market') || lowerText.includes('customer') || lowerText.includes('demand')) {
      return 'market_validation';
    }
    if (lowerText.includes('revenue') || lowerText.includes('cost') || lowerText.includes('financial')) {
      return 'financial_modeling';
    }
    if (lowerText.includes('competitor') || lowerText.includes('competition')) {
      return 'competitive_analysis';
    }
    if (lowerText.includes('growth') || lowerText.includes('scale') || lowerText.includes('expansion')) {
      return 'growth_strategy';
    }
    if (lowerText.includes('risk') || lowerText.includes('challenge') || lowerText.includes('threat')) {
      return 'risk_assessment';
    }
    
    return 'decision_making';
  };

  // Calculate evidence strength
  const calculateEvidenceStrength = (text: string): EvidenceStrength => {
    const evidenceTypes = {
      data: (text.match(/\b(data|statistics|numbers|metrics|analytics)\b/gi) || []).length,
      research: (text.match(/\b(research|study|survey|analysis)\b/gi) || []).length,
      testimony: (text.match(/\b(testimonial|feedback|review|customer say)\b/gi) || []).length,
      observation: (text.match(/\b(observed|noticed|seen|experienced)\b/gi) || []).length,
      analysis: (text.match(/\b(analysis|evaluation|assessment|comparison)\b/gi) || []).length
    };

    const totalEvidence = Object.values(evidenceTypes).reduce((sum, count) => sum + count, 0);
    const overall = totalEvidence > 0 ? Math.min(totalEvidence / 5, 1) : 0;

    return {
      overall,
      byType: {
        data: Math.min(evidenceTypes.data / 3, 1),
        research: Math.min(evidenceTypes.research / 2, 1),
        testimony: Math.min(evidenceTypes.testimony / 2, 1),
        observation: Math.min(evidenceTypes.observation / 2, 1),
        analysis: Math.min(evidenceTypes.analysis / 2, 1)
      },
      gaps: Object.entries(evidenceTypes)
        .filter(([_, count]) => count === 0)
        .map(([type, _]) => `Missing ${type} evidence`)
    };
  };

  // Main analysis function
  const analyzeBusinessReasoning = (text: string): BusinessNLPResult => {
    const entities = config.enableEntityExtraction ? extractEntities(text) : [];
    const assumptions = config.enableAssumptionDetection ? detectAssumptions(text) : [];
    const logicalGaps = config.enableLogicGapAnalysis ? detectLogicGaps(text, assumptions) : [];
    const fallacies = config.enableFallacyDetection ? detectFallacies(text) : [];
    const reasoningType = determineReasoningType(text);
    const evidenceStrength = calculateEvidenceStrength(text);
    
    // Calculate overall confidence
    const confidence = Math.min(
      (entities.length * 0.2 + assumptions.length * 0.3 + evidenceStrength.overall * 0.5),
      1
    );

    // Analyze sentiment and confidence indicators
    const sentiment = {
      confidence: (text.match(/\b(confident|certain|sure|definitely|absolutely)\b/gi) || []).length / 10,
      uncertainty: (text.match(/\b(uncertain|unsure|maybe|perhaps|might|could)\b/gi) || []).length / 10,
      defensiveness: (text.match(/\b(but|however|although|despite|regardless)\b/gi) || []).length / 5
    };

    return {
      entities,
      assumptions,
      logicalGaps,
      reasoningType,
      confidence,
      sentiment
    };
  };

  return {
    analyzeBusinessReasoning,
    extractEntities,
    detectAssumptions,
    detectLogicGaps,
    detectFallacies,
    determineReasoningType,
    calculateEvidenceStrength
  };
};
