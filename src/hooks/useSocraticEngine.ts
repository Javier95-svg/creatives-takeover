import { 
  SocraticQuestion, 
  ReasoningAnalysis, 
  ReasoningType, 
  LogicGap, 
  Assumption,
  BusinessStatement,
  LogicEvaluation,
  QuestionContext,
  QuestionGenerationResult,
  SocraticContext,
  SocraticEngineConfig,
  LogicalFallacy
} from '@/types/socratic';
import { useSocraticNLP } from './useSocraticNLP';

export const useSocraticEngine = (config: SocraticEngineConfig = {
  enableFallacyDetection: true,
  enableAssumptionSurfacing: true,
  enableEvidenceEvaluation: true,
  maxQuestionsPerSession: 10,
  reasoningDepth: 'medium',
  questionStyle: 'gentle'
}) => {
  
  const nlp = useSocraticNLP({
    enableEntityExtraction: true,
    enableAssumptionDetection: true,
    enableLogicGapAnalysis: true,
    enableFallacyDetection: true,
    confidenceThreshold: 0.6
  });

  // Socratic question templates by type and reasoning
  const questionTemplates = {
    clarification: {
      problem_solution_fit: [
        "What specific problem are you trying to solve?",
        "Who exactly experiences this problem?",
        "How do you know this is a real problem?",
        "What makes this problem worth solving?"
      ],
      market_validation: [
        "What evidence shows people actually want this solution?",
        "How big is the market for this problem?",
        "Who are your ideal customers and how do you reach them?",
        "What research supports your market assumptions?"
      ],
      financial_modeling: [
        "How do you calculate your revenue projections?",
        "What are your key assumptions about pricing?",
        "How do you know customers will pay this price?",
        "What evidence supports your cost estimates?"
      ],
      competitive_analysis: [
        "Who are your main competitors and how are you different?",
        "What makes your solution better than existing alternatives?",
        "How defensible is your competitive advantage?",
        "What barriers prevent competitors from copying you?"
      ],
      growth_strategy: [
        "How do you plan to acquire your first customers?",
        "What's your strategy for scaling beyond the initial market?",
        "How will you maintain growth as you expand?",
        "What resources do you need to achieve your growth goals?"
      ],
      risk_assessment: [
        "What could go wrong with your business model?",
        "What are your biggest assumptions that could be wrong?",
        "How would you handle unexpected challenges?",
        "What contingency plans do you have?"
      ],
      decision_making: [
        "What information do you need to make this decision?",
        "What are the key criteria for evaluating your options?",
        "How will you know if this decision is working?",
        "What alternatives have you considered?"
      ]
    },
    assumption_testing: {
      problem_solution_fit: [
        "What assumptions are you making about the problem?",
        "How do you know your solution actually solves the problem?",
        "What if the problem is different than you think?",
        "How do you validate that people have this problem?"
      ],
      market_validation: [
        "What assumptions are you making about customer behavior?",
        "How do you know customers will actually buy this?",
        "What if your target market is different than you think?",
        "How do you test your market assumptions?"
      ],
      financial_modeling: [
        "What assumptions underlie your financial projections?",
        "How do you know customers will pay the prices you've set?",
        "What if your costs are higher than expected?",
        "How do you validate your revenue assumptions?"
      ],
      competitive_analysis: [
        "What assumptions are you making about competitors?",
        "How do you know you're actually different from alternatives?",
        "What if competitors react differently than expected?",
        "How do you test your competitive assumptions?"
      ],
      growth_strategy: [
        "What assumptions are you making about growth?",
        "How do you know your growth strategy will work?",
        "What if the market changes as you scale?",
        "How do you validate your growth assumptions?"
      ],
      risk_assessment: [
        "What assumptions are you making about risks?",
        "How do you know you've identified all the risks?",
        "What if the risks are greater than you think?",
        "How do you test your risk assumptions?"
      ],
      decision_making: [
        "What assumptions underlie your decision-making process?",
        "How do you know your criteria are the right ones?",
        "What if your information is incomplete or wrong?",
        "How do you validate your decision assumptions?"
      ]
    },
    evidence_evaluation: {
      problem_solution_fit: [
        "What data supports that this is a real problem?",
        "How do you measure whether your solution works?",
        "What evidence shows people want this solution?",
        "How do you validate problem-solution fit?"
      ],
      market_validation: [
        "What market research supports your assumptions?",
        "How do you measure market demand?",
        "What data shows customers will buy this?",
        "How do you validate market size estimates?"
      ],
      financial_modeling: [
        "What data supports your revenue projections?",
        "How do you validate your pricing assumptions?",
        "What evidence supports your cost estimates?",
        "How do you test your financial model?"
      ],
      competitive_analysis: [
        "What research supports your competitive analysis?",
        "How do you measure your competitive advantage?",
        "What data shows you're differentiated?",
        "How do you validate competitive assumptions?"
      ],
      growth_strategy: [
        "What data supports your growth projections?",
        "How do you measure acquisition channel effectiveness?",
        "What evidence supports your scaling assumptions?",
        "How do you validate your growth strategy?"
      ],
      risk_assessment: [
        "What data supports your risk assessment?",
        "How do you measure and monitor risks?",
        "What evidence shows your risk mitigation works?",
        "How do you validate your risk assumptions?"
      ],
      decision_making: [
        "What data supports your decision criteria?",
        "How do you measure decision effectiveness?",
        "What evidence shows your decision process works?",
        "How do you validate your decision-making approach?"
      ]
    },
    perspective_exploration: {
      problem_solution_fit: [
        "How might customers view this problem differently?",
        "What would competitors say about your solution?",
        "How do investors evaluate problem-solution fit?",
        "What would experts in this field think?"
      ],
      market_validation: [
        "How do customers currently solve this problem?",
        "What do industry experts say about this market?",
        "How do investors view this market opportunity?",
        "What would successful entrepreneurs in this space think?"
      ],
      financial_modeling: [
        "How do investors evaluate your financial projections?",
        "What would financial advisors say about your model?",
        "How do customers view your pricing?",
        "What would accountants think about your assumptions?"
      ],
      competitive_analysis: [
        "How do competitors view your solution?",
        "What would customers say about your differentiation?",
        "How do investors evaluate competitive advantage?",
        "What would industry analysts think?"
      ],
      growth_strategy: [
        "How do customers view your growth plans?",
        "What would growth experts say about your strategy?",
        "How do investors evaluate scaling potential?",
        "What would successful scale-up entrepreneurs think?"
      ],
      risk_assessment: [
        "How do different stakeholders view these risks?",
        "What would risk management experts say?",
        "How do investors evaluate business risks?",
        "What would advisors think about your risk mitigation?"
      ],
      decision_making: [
        "How do different stakeholders view this decision?",
        "What would decision-making experts say?",
        "How do advisors evaluate your decision process?",
        "What would successful leaders think?"
      ]
    },
    implication_analysis: {
      problem_solution_fit: [
        "What happens if your solution doesn't work as expected?",
        "What are the implications of being wrong about the problem?",
        "What if customers don't adopt your solution?",
        "What are the consequences of poor problem-solution fit?"
      ],
      market_validation: [
        "What happens if the market is smaller than expected?",
        "What are the implications of being wrong about customer demand?",
        "What if customer acquisition costs are higher than projected?",
        "What are the consequences of market misjudgment?"
      ],
      financial_modeling: [
        "What happens if revenue is lower than projected?",
        "What are the implications of higher costs than expected?",
        "What if pricing doesn't work as planned?",
        "What are the consequences of financial model errors?"
      ],
      competitive_analysis: [
        "What happens if competitors respond aggressively?",
        "What are the implications of being wrong about differentiation?",
        "What if new competitors enter the market?",
        "What are the consequences of competitive misjudgment?"
      ],
      growth_strategy: [
        "What happens if growth is slower than expected?",
        "What are the implications of scaling challenges?",
        "What if customer acquisition becomes more expensive?",
        "What are the consequences of growth strategy failures?"
      ],
      risk_assessment: [
        "What happens if your biggest risks materialize?",
        "What are the implications of risk mitigation failures?",
        "What if new risks emerge that you haven't considered?",
        "What are the consequences of poor risk management?"
      ],
      decision_making: [
        "What happens if this decision doesn't work as expected?",
        "What are the implications of making the wrong choice?",
        "What if you don't have enough information to decide?",
        "What are the consequences of poor decision-making?"
      ]
    }
  };

  // Generate Socratic questions based on reasoning analysis
  const generateSocraticQuestions = (
    analysis: ReasoningAnalysis,
    context: QuestionContext
  ): QuestionGenerationResult => {
    const questions: SocraticQuestion[] = [];
    const { reasoningType, logicGaps, assumptions, logicalFallacies } = analysis;

    // Generate questions based on logic gaps
    logicGaps.forEach((gap, index) => {
      if (index < 3) { // Limit to top 3 gaps
        const questionType = getQuestionTypeForGap(gap.type);
        const template = getQuestionTemplate(reasoningType, questionType);
        
        if (template) {
          questions.push({
            id: `gap_${gap.id}_${Date.now()}`,
            type: questionType,
            question: template,
            followUp: gap.suggestions[0],
            reasoningType,
            priority: gap.impact === 'high' ? 'high' : 'medium'
          });
        }
      }
    });

    // Generate questions for assumptions without evidence
    const unsupportedAssumptions = assumptions.filter(a => a.evidence.length === 0);
    unsupportedAssumptions.slice(0, 2).forEach((assumption, index) => {
      const template = getQuestionTemplate(reasoningType, 'assumption_testing');
      if (template) {
        questions.push({
          id: `assumption_${assumption.id}_${Date.now()}`,
          type: 'assumption_testing',
          question: template,
          followUp: `Specifically, how do you validate the assumption that "${assumption.text}"?`,
          reasoningType,
          priority: 'medium'
        });
      }
    });

    // Generate questions for logical fallacies
    logicalFallacies.slice(0, 2).forEach((fallacy, index) => {
      questions.push({
        id: `fallacy_${fallacy.type}_${Date.now()}`,
        type: 'evidence_evaluation',
        question: `Let's examine this reasoning: ${fallacy.description}`,
        followUp: `How might we ${fallacy.correction.toLowerCase()}?`,
        reasoningType,
        priority: fallacy.impact === 'high' ? 'high' : 'medium'
      });
    });

    // Add general clarification questions if we need more
    if (questions.length < 3) {
      const clarificationTemplate = getQuestionTemplate(reasoningType, 'clarification');
      if (clarificationTemplate) {
        questions.push({
          id: `clarification_${Date.now()}`,
          type: 'clarification',
          question: clarificationTemplate,
          reasoningType,
          priority: 'medium'
        });
      }
    }

    // Sort by priority and limit to max questions
    const sortedQuestions = questions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, config.maxQuestionsPerSession);

    return {
      questions: sortedQuestions,
      reasoning: `Based on your reasoning about ${reasoningType.replace('_', ' ')}, I've identified ${logicGaps.length} areas that could benefit from deeper exploration.`,
      nextFocus: determineNextFocus(reasoningType, analysis),
      priority: sortedQuestions.some(q => q.priority === 'high') ? 'high' : 'medium'
    };
  };

  // Helper function to get question type for gap
  const getQuestionTypeForGap = (gapType: LogicGap['type']): SocraticQuestion['type'] => {
    const gapToQuestionType = {
      'missing_evidence': 'evidence_evaluation',
      'unclear_assumption': 'assumption_testing',
      'logical_fallacy': 'evidence_evaluation',
      'insufficient_validation': 'clarification',
      'contradiction': 'perspective_exploration'
    };
    return gapToQuestionType[gapType] || 'clarification';
  };

  // Helper function to get question template
  const getQuestionTemplate = (
    reasoningType: ReasoningType,
    questionType: SocraticQuestion['type']
  ): string => {
    const templates = questionTemplates[questionType];
    if (!templates || !templates[reasoningType]) return null;
    
    const availableTemplates = templates[reasoningType];
    return availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
  };

  // Determine next focus area
  const determineNextFocus = (
    currentReasoning: ReasoningType,
    analysis: ReasoningAnalysis
  ): ReasoningType => {
    // If current reasoning is weak, suggest related areas to explore
    if (analysis.confidence < 0.5) {
      switch (currentReasoning) {
        case 'problem_solution_fit':
          return 'market_validation';
        case 'market_validation':
          return 'financial_modeling';
        case 'financial_modeling':
          return 'competitive_analysis';
        case 'competitive_analysis':
          return 'growth_strategy';
        case 'growth_strategy':
          return 'risk_assessment';
        default:
          return 'decision_making';
      }
    }
    return currentReasoning;
  };

  // Evaluate business logic
  const evaluateLogic = (statements: BusinessStatement[]): LogicEvaluation => {
    let totalScore = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const nextSteps: string[] = [];

    statements.forEach(statement => {
      totalScore += statement.confidence;
      
      if (statement.confidence > 0.8) {
        strengths.push(`Strong confidence in: ${statement.text.substring(0, 50)}...`);
      } else if (statement.confidence < 0.5) {
        weaknesses.push(`Low confidence in: ${statement.text.substring(0, 50)}...`);
        recommendations.push(`Strengthen evidence for: ${statement.text.substring(0, 30)}...`);
      }
    });

    const averageScore = totalScore / statements.length;

    if (averageScore > 0.8) {
      nextSteps.push('Consider testing edge cases and alternative scenarios');
    } else if (averageScore > 0.6) {
      nextSteps.push('Gather additional evidence for lower-confidence statements');
    } else {
      nextSteps.push('Conduct more research and validation before proceeding');
    }

    return {
      score: averageScore,
      strengths,
      weaknesses,
      recommendations,
      nextSteps
    };
  };

  // Main analysis function
  const analyzeReasoning = (userInput: string): ReasoningAnalysis => {
    const nlpResult = nlp.analyzeBusinessReasoning(userInput);
    
    return {
      reasoningType: nlpResult.reasoningType,
      entities: nlpResult.entities,
      assumptions: nlpResult.assumptions,
      logicGaps: nlpResult.logicalGaps,
      confidence: nlpResult.confidence,
      logicalFallacies: [], // Will be populated by NLP
      evidenceStrength: {
        overall: nlpResult.confidence,
        byType: {
          data: 0,
          research: 0,
          testimony: 0,
          observation: 0,
          analysis: 0
        },
        gaps: []
      }
    };
  };

  // Guide reasoning through structured questioning
  const guideReasoning = (
    context: SocraticContext,
    userResponse: string
  ): QuestionGenerationResult => {
    const analysis = analyzeReasoning(userResponse);
    const questionContext: QuestionContext = {
      currentReasoning: analysis,
      businessContext: context.businessContext,
      userResponse,
      previousQuestions: [],
      sessionProgress: context.reasoningHistory.length
    };

    return generateSocraticQuestions(analysis, questionContext);
  };

  return {
    analyzeReasoning,
    generateSocraticQuestions,
    evaluateLogic,
    guideReasoning
  };
};
