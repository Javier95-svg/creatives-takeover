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
  LogicalFallacy,
  UserProfile
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

  // Adaptive question complexity system
  const adaptQuestionComplexity = (
    baseQuestion: string, 
    userProfile: UserProfile, 
    reasoningType: ReasoningType
  ): SocraticQuestion => {
    const { expertiseLevel, learningPreferences } = userProfile;
    
    // Determine complexity level based on expertise
    const complexityLevel = expertiseLevel === 'beginner' ? 'basic' :
                           expertiseLevel === 'intermediate' ? 'intermediate' :
                           expertiseLevel === 'advanced' ? 'advanced' : 'expert';
    
    // Adapt language and technical depth
    let adaptedQuestion = baseQuestion;
    let examples: string[] = [];
    let technicalTerms: string[] = [];
    
    switch (complexityLevel) {
      case 'basic':
        adaptedQuestion = simplifyLanguage(baseQuestion);
        examples = generateBasicExamples(reasoningType);
        technicalTerms = [];
        break;
      case 'intermediate':
        adaptedQuestion = addContext(baseQuestion, reasoningType);
        examples = generateIntermediateExamples(reasoningType);
        technicalTerms = extractBasicTechnicalTerms(baseQuestion);
        break;
      case 'advanced':
        adaptedQuestion = addTechnicalDepth(baseQuestion, reasoningType);
        examples = generateAdvancedExamples(reasoningType);
        technicalTerms = extractAdvancedTechnicalTerms(baseQuestion);
        break;
      case 'expert':
        adaptedQuestion = addExpertLevelDepth(baseQuestion, reasoningType);
        examples = generateExpertExamples(reasoningType);
        technicalTerms = extractExpertTechnicalTerms(baseQuestion);
        break;
    }
    
    return {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'clarification', // Will be overridden by caller
      question: adaptedQuestion,
      reasoningType,
      priority: 'medium',
      complexity: complexityLevel,
      targetAudience: expertiseLevel,
      examples: learningPreferences.examplesNeeded ? examples : undefined,
      technicalTerms: technicalTerms.length > 0 ? technicalTerms : undefined
    };
  };

  // Language simplification for beginners
  const simplifyLanguage = (question: string): string => {
    return question
      .replace(/validate|validation/g, 'check')
      .replace(/assumption|assumptions/g, 'beliefs or ideas')
      .replace(/hypothesis|hypotheses/g, 'ideas to test')
      .replace(/methodology/g, 'way of doing things')
      .replace(/quantitative/g, 'numbers and data')
      .replace(/qualitative/g, 'descriptions and stories')
      .replace(/correlation/g, 'connection')
      .replace(/causation/g, 'cause and effect')
      .replace(/market penetration/g, 'getting customers')
      .replace(/competitive advantage/g, 'what makes you better')
      .replace(/value proposition/g, 'what you offer customers');
  };

  // Add context for intermediate users
  const addContext = (question: string, reasoningType: ReasoningType): string => {
    const contextHints = {
      problem_solution_fit: 'Consider both the problem and your proposed solution',
      market_validation: 'Think about your target customers and market demand',
      financial_modeling: 'Consider your revenue sources and cost structure',
      competitive_analysis: 'Compare your approach to existing alternatives',
      growth_strategy: 'Think about how you'll scale your business',
      risk_assessment: 'Consider potential challenges and how to address them'
    };
    
    return `${contextHints[reasoningType]}. ${question}`;
  };

  // Add technical depth for advanced users
  const addTechnicalDepth = (question: string, reasoningType: ReasoningType): string => {
    const technicalHints = {
      problem_solution_fit: 'Analyze the problem-solution fit using validation frameworks',
      market_validation: 'Apply market research methodologies and customer development',
      financial_modeling: 'Consider unit economics, customer lifetime value, and acquisition costs',
      competitive_analysis: 'Use competitive positioning frameworks and differentiation strategies',
      growth_strategy: 'Apply growth hacking principles and scalable acquisition channels',
      risk_assessment: 'Conduct systematic risk analysis and mitigation planning'
    };
    
    return `${technicalHints[reasoningType]}. ${question}`;
  };

  // Add expert-level depth
  const addExpertLevelDepth = (question: string, reasoningType: ReasoningType): string => {
    const expertHints = {
      problem_solution_fit: 'Apply lean startup methodology and customer discovery frameworks',
      market_validation: 'Conduct rigorous market analysis using TAM/SAM/SOM and customer interviews',
      financial_modeling: 'Build comprehensive financial models with sensitivity analysis and scenario planning',
      competitive_analysis: 'Perform thorough competitive intelligence and strategic positioning analysis',
      growth_strategy: 'Develop sophisticated growth models with cohort analysis and viral mechanics',
      risk_assessment: 'Implement enterprise-level risk management and contingency planning'
    };
    
    return `${expertHints[reasoningType]}. ${question}`;
  };

  // Generate examples based on complexity level
  const generateBasicExamples = (reasoningType: ReasoningType): string[] => {
    const basicExamples = {
      problem_solution_fit: [
        'For example, if people struggle to find parking, your app could help them find available spots',
        'Like how Uber solved the problem of calling a taxi by making it easier to get a ride'
      ],
      market_validation: [
        'For instance, survey 20 potential customers to see if they would buy your product',
        'Like how Dropbox validated demand by showing a simple video before building the product'
      ],
      financial_modeling: [
        'For example, if you charge $10/month and have 100 customers, that\'s $1,000 monthly revenue',
        'Like calculating how much it costs to make your product vs. what customers pay'
      ]
    };
    return basicExamples[reasoningType] || [];
  };

  const generateIntermediateExamples = (reasoningType: ReasoningType): string[] => {
    const intermediateExamples = {
      problem_solution_fit: [
        'Consider conducting customer interviews to validate the problem-solution fit',
        'Use frameworks like the Value Proposition Canvas to align problems with solutions'
      ],
      market_validation: [
        'Implement customer discovery interviews and build landing pages to test demand',
        'Analyze market size using TAM (Total Addressable Market) calculations'
      ],
      financial_modeling: [
        'Calculate unit economics including customer acquisition cost (CAC) and lifetime value (LTV)',
        'Build financial projections with different growth scenarios and break-even analysis'
      ]
    };
    return intermediateExamples[reasoningType] || [];
  };

  const generateAdvancedExamples = (reasoningType: ReasoningType): string[] => {
    const advancedExamples = {
      problem_solution_fit: [
        'Apply lean startup methodology with MVP testing and pivot decisions',
        'Use customer development frameworks like Steve Blank\'s approach'
      ],
      market_validation: [
        'Conduct systematic market research with TAM/SAM/SOM analysis and customer segmentation',
        'Implement A/B testing and cohort analysis for demand validation'
      ],
      financial_modeling: [
        'Build comprehensive financial models with sensitivity analysis and Monte Carlo simulations',
        'Implement advanced metrics like cohort analysis, churn prediction, and unit economics optimization'
      ]
    };
    return advancedExamples[reasoningType] || [];
  };

  const generateExpertExamples = (reasoningType: ReasoningType): string[] => {
    const expertExamples = {
      problem_solution_fit: [
        'Implement sophisticated customer discovery using design thinking and lean startup principles',
        'Apply advanced validation techniques like conjoint analysis and choice modeling'
      ],
      market_validation: [
        'Conduct comprehensive market intelligence with competitive analysis and trend forecasting',
        'Implement advanced market research methodologies including ethnographic studies and behavioral analysis'
      ],
      financial_modeling: [
        'Develop enterprise-level financial models with advanced scenario planning and risk modeling',
        'Implement sophisticated financial analytics with machine learning for predictive modeling'
      ]
    };
    return expertExamples[reasoningType] || [];
  };

  // Extract technical terms based on complexity
  const extractBasicTechnicalTerms = (question: string): string[] => {
    const basicTerms = question.match(/\b(market|customer|revenue|cost|competitor|growth|risk)\b/gi) || [];
    return [...new Set(basicTerms.map(term => term.toLowerCase()))];
  };

  const extractAdvancedTechnicalTerms = (question: string): string[] => {
    const advancedTerms = question.match(/\b(validation|methodology|hypothesis|quantitative|qualitative|penetration|advantage|proposition)\b/gi) || [];
    return [...new Set(advancedTerms.map(term => term.toLowerCase()))];
  };

  const extractExpertTechnicalTerms = (question: string): string[] => {
    const expertTerms = question.match(/\b(TAM|SAM|SOM|CAC|LTV|MVP|lean\s+startup|customer\s+development|cohort\s+analysis|unit\s+economics)\b/gi) || [];
    return [...new Set(expertTerms.map(term => term.toLowerCase()))];
  };

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

  // Generate Socratic questions based on reasoning analysis with adaptive complexity
  const generateSocraticQuestions = (
    analysis: ReasoningAnalysis,
    context: QuestionContext,
    userProfile?: UserProfile
  ): QuestionGenerationResult => {
    const questions: SocraticQuestion[] = [];
    const { reasoningType, logicGaps, assumptions, logicalFallacies } = analysis;

    // Generate questions based on logic gaps with adaptive complexity
    logicGaps.forEach((gap, index) => {
      if (index < 3) { // Limit to top 3 gaps
        const questionType = getQuestionTypeForGap(gap.type);
        const template = getQuestionTemplate(reasoningType, questionType);
        
        if (template) {
          let question: SocraticQuestion;
          
          if (userProfile) {
            // Use adaptive complexity
            question = adaptQuestionComplexity(template, userProfile, reasoningType);
            question.type = questionType;
            question.id = `gap_${gap.id}_${Date.now()}`;
            question.followUp = gap.suggestions[0];
            question.priority = gap.impact === 'high' ? 'high' : 'medium';
          } else {
            // Fallback to basic question
            question = {
              id: `gap_${gap.id}_${Date.now()}`,
              type: questionType,
              question: template,
              followUp: gap.suggestions[0],
              reasoningType,
              priority: gap.impact === 'high' ? 'high' : 'medium',
              complexity: 'intermediate',
              targetAudience: 'intermediate'
            };
          }
          
          questions.push(question);
        }
      }
    });

    // Generate questions for assumptions without evidence with adaptive complexity
    const unsupportedAssumptions = assumptions.filter(a => a.evidence.length === 0);
    unsupportedAssumptions.slice(0, 2).forEach((assumption, index) => {
      const template = getQuestionTemplate(reasoningType, 'assumption_testing');
      if (template) {
        let question: SocraticQuestion;
        
        if (userProfile) {
          // Use adaptive complexity
          question = adaptQuestionComplexity(template, userProfile, reasoningType);
          question.type = 'assumption_testing';
          question.id = `assumption_${assumption.id}_${Date.now()}`;
          question.followUp = `Specifically, how do you validate the assumption that "${assumption.text}"?`;
          question.priority = 'medium';
        } else {
          // Fallback to basic question
          question = {
            id: `assumption_${assumption.id}_${Date.now()}`,
            type: 'assumption_testing',
            question: template,
            followUp: `Specifically, how do you validate the assumption that "${assumption.text}"?`,
            reasoningType,
            priority: 'medium',
            complexity: 'intermediate',
            targetAudience: 'intermediate'
          };
        }
        
        questions.push(question);
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
    const gapToQuestionType: Record<LogicGap['type'], SocraticQuestion['type']> = {
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
