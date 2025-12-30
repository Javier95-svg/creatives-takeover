/**
 * Answer Quality Service
 * Provides non-blocking quality feedback for wizard answers in BizMap AI
 *
 * Scoring Algorithm (0-100):
 * - Word Count (20 pts): Length and detail
 * - Specificity (30 pts): Avoids generic phrases
 * - Context Relevance (20 pts): Industry-specific terms
 * - Completeness (30 pts): Multiple aspects covered
 */

export interface AnswerQuality {
  score: number; // 0-100
  level: 'excellent' | 'good' | 'needs-improvement';
  feedback: string[];
  suggestions: string[];
  analysis: {
    wordCount: number;
    specificityScore: number;
    relevanceScore: number;
    completenessScore: number;
  };
}

export interface WizardStepContext {
  stepKey: string;
  stepTitle: string;
  questionType: 'concept' | 'customer' | 'validation' | 'mvp' | 'launch' | 'pricing' | 'goals';
  industry?: string;
}

// Generic phrases that indicate lack of specificity
const GENERIC_PHRASES = [
  'I want to',
  'I plan to',
  'I will',
  'some people',
  'everyone',
  'anyone',
  'all users',
  'the market',
  'customers',
  'users',
  'people who need',
  'solve problems',
  'make money',
  'be successful',
  'grow fast',
  'innovative solution',
  'cutting edge',
  'game changer',
  'revolutionary',
  'unique approach',
];

// Industry-specific terms that boost relevance
const INDUSTRY_TERMS: Record<string, string[]> = {
  tech: ['API', 'SaaS', 'platform', 'integration', 'automation', 'analytics', 'dashboard', 'workflow'],
  ecommerce: ['checkout', 'inventory', 'shipping', 'cart', 'conversion', 'product', 'catalog'],
  service: ['booking', 'appointment', 'scheduling', 'consultation', 'client', 'service'],
  food: ['restaurant', 'menu', 'delivery', 'kitchen', 'catering', 'food service', 'dining'],
  healthcare: ['patient', 'clinical', 'medical', 'diagnosis', 'treatment', 'healthcare', 'wellness'],
  education: ['student', 'course', 'learning', 'curriculum', 'teaching', 'education', 'training'],
  finance: ['payment', 'transaction', 'invoice', 'accounting', 'billing', 'financial', 'revenue'],
};

/**
 * Calculate answer quality score
 */
export function calculateAnswerQuality(
  answer: string,
  context: WizardStepContext
): AnswerQuality {
  const analysis = {
    wordCount: 0,
    specificityScore: 0,
    relevanceScore: 0,
    completenessScore: 0,
  };

  // 1. Word Count Score (20 points max)
  const words = answer.trim().split(/\s+/);
  analysis.wordCount = words.length;

  if (analysis.wordCount < 10) {
    analysis.wordCount = 0;
  } else if (analysis.wordCount < 20) {
    analysis.wordCount = 10;
  } else if (analysis.wordCount < 50) {
    analysis.wordCount = 15;
  } else {
    analysis.wordCount = 20;
  }

  // 2. Specificity Score (30 points max)
  const lowerAnswer = answer.toLowerCase();
  const genericPhraseCount = GENERIC_PHRASES.filter(phrase =>
    lowerAnswer.includes(phrase.toLowerCase())
  ).length;

  if (genericPhraseCount === 0) {
    analysis.specificityScore = 30;
  } else if (genericPhraseCount <= 2) {
    analysis.specificityScore = 15;
  } else {
    analysis.specificityScore = 5;
  }

  // 3. Context Relevance Score (20 points max)
  let relevanceScore = 10; // Base score

  // Check for industry-specific terms
  if (context.industry) {
    const industryKey = detectIndustryKey(context.industry);
    const relevantTerms = INDUSTRY_TERMS[industryKey] || [];
    const hasRelevantTerms = relevantTerms.some(term =>
      lowerAnswer.includes(term.toLowerCase())
    );
    if (hasRelevantTerms) {
      relevanceScore += 10;
    }
  }

  // Check if answer addresses the question type
  const addressesQuestion = checkIfAddressesQuestion(answer, context.questionType);
  if (addressesQuestion) {
    relevanceScore = 20; // Full points
  }

  analysis.relevanceScore = relevanceScore;

  // 4. Completeness Score (30 points max)
  // Check for multiple aspects (numbers, specific details, examples)
  const hasNumbers = /\d+/.test(answer);
  const hasExamples = /for example|such as|like|including/i.test(answer);
  const hasSentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

  let completenessScore = 0;
  if (hasSentences >= 3) completenessScore += 10;
  if (hasNumbers) completenessScore += 10;
  if (hasExamples) completenessScore += 10;

  analysis.completenessScore = completenessScore;

  // Calculate total score
  const totalScore = Math.min(
    100,
    analysis.wordCount + analysis.specificityScore + analysis.relevanceScore + analysis.completenessScore
  );

  // Determine level
  let level: AnswerQuality['level'];
  if (totalScore >= 80) {
    level = 'excellent';
  } else if (totalScore >= 60) {
    level = 'good';
  } else {
    level = 'needs-improvement';
  }

  // Generate feedback and suggestions
  const feedback = generateFeedback(totalScore, analysis, context);
  const suggestions = generateSuggestions(analysis, context);

  return {
    score: totalScore,
    level,
    feedback,
    suggestions,
    analysis,
  };
}

/**
 * Generate feedback based on score and analysis
 */
function generateFeedback(
  score: number,
  analysis: AnswerQuality['analysis'],
  context: WizardStepContext
): string[] {
  const feedback: string[] = [];

  if (score >= 80) {
    feedback.push('Excellent answer! You provided specific, detailed information.');
  } else if (score >= 60) {
    feedback.push('Good answer! You included helpful details.');
  } else {
    feedback.push('Your answer could be more detailed for better planning.');
  }

  // Specific feedback based on analysis
  if (analysis.wordCount < 15) {
    feedback.push('Consider adding more detail to help us understand better.');
  }

  if (analysis.specificityScore < 20) {
    feedback.push('Try to be more specific - avoid general terms like "everyone" or "all users".');
  }

  if (analysis.relevanceScore < 15) {
    feedback.push('Include more details relevant to your industry or business type.');
  }

  if (analysis.completenessScore < 20) {
    feedback.push('Cover multiple aspects - add examples, numbers, or specific details.');
  }

  return feedback;
}

/**
 * Generate suggestions for improvement
 */
function generateSuggestions(
  analysis: AnswerQuality['analysis'],
  context: WizardStepContext
): string[] {
  const suggestions: string[] = [];

  // Step-specific suggestions
  switch (context.questionType) {
    case 'concept':
      if (analysis.specificityScore < 20) {
        suggestions.push('Name the specific problem you\'re solving');
        suggestions.push('Identify your exact target customer (not "everyone")');
      }
      if (analysis.completenessScore < 20) {
        suggestions.push('Include why this problem matters');
        suggestions.push('Mention how you discovered this problem');
      }
      break;

    case 'customer':
      if (analysis.specificityScore < 20) {
        suggestions.push('Describe demographics (age, location, job title)');
        suggestions.push('Name specific places where they gather');
      }
      if (analysis.completenessScore < 20) {
        suggestions.push('Include their current pain points');
        suggestions.push('Mention how they currently solve this problem');
      }
      break;

    case 'validation':
      if (analysis.specificityScore < 20) {
        suggestions.push('Name specific validation methods (surveys, interviews, landing page)');
        suggestions.push('Include target numbers (e.g., "10 customer interviews")');
      }
      if (analysis.completenessScore < 20) {
        suggestions.push('Add what you\'ll measure');
        suggestions.push('Include your success criteria');
      }
      break;

    case 'mvp':
      if (analysis.specificityScore < 20) {
        suggestions.push('List 3-5 specific core features');
        suggestions.push('Describe what users can actually do');
      }
      if (analysis.completenessScore < 20) {
        suggestions.push('Mention what you\'re NOT including (nice-to-haves)');
        suggestions.push('Include estimated timeline or complexity');
      }
      break;

    case 'launch':
      if (analysis.specificityScore < 20) {
        suggestions.push('Name specific channels (e.g., "LinkedIn", "Product Hunt")');
        suggestions.push('Include specific tactics or strategies');
      }
      if (analysis.completenessScore < 20) {
        suggestions.push('Mention your target audience on each channel');
        suggestions.push('Include rough timeline for each tactic');
      }
      break;

    case 'pricing':
      if (analysis.specificityScore < 20) {
        suggestions.push('Include specific pricing tiers or amounts');
        suggestions.push('Name your revenue model (subscription, one-time, freemium)');
      }
      if (analysis.completenessScore < 20) {
        suggestions.push('Explain why this pricing makes sense');
        suggestions.push('Mention comparable competitors\' pricing');
      }
      break;

    case 'goals':
      if (analysis.specificityScore < 20) {
        suggestions.push('Set specific, measurable targets (numbers, percentages)');
        suggestions.push('Include timeline (day 30, week 4, etc.)');
      }
      if (analysis.completenessScore < 20) {
        suggestions.push('Define both quantitative and qualitative metrics');
        suggestions.push('Mention what would make you consider this successful');
      }
      break;
  }

  // General suggestions if no specific ones generated
  if (suggestions.length === 0) {
    suggestions.push('Add more specific details and examples');
    suggestions.push('Include numbers, names, or concrete facts');
  }

  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

/**
 * Check if answer addresses the question type
 */
function checkIfAddressesQuestion(answer: string, questionType: WizardStepContext['questionType']): boolean {
  const lowerAnswer = answer.toLowerCase();

  const keywordsByType: Record<string, string[]> = {
    concept: ['problem', 'solve', 'help', 'target', 'customer', 'pain'],
    customer: ['customer', 'user', 'people', 'audience', 'demographic', 'persona'],
    validation: ['test', 'validate', 'experiment', 'proof', 'feedback', 'survey', 'interview'],
    mvp: ['feature', 'build', 'product', 'minimum', 'core', 'functionality'],
    launch: ['channel', 'marketing', 'reach', 'acquire', 'launch', 'strategy', 'tactic'],
    pricing: ['price', 'cost', 'revenue', 'subscription', 'payment', 'model', 'tier'],
    goals: ['goal', 'metric', 'measure', 'success', 'target', 'objective', 'kpi'],
  };

  const keywords = keywordsByType[questionType] || [];
  return keywords.some(keyword => lowerAnswer.includes(keyword));
}

/**
 * Detect industry key from industry string
 */
function detectIndustryKey(industry: string): string {
  const lowerIndustry = industry.toLowerCase();

  if (lowerIndustry.includes('tech') || lowerIndustry.includes('saas') || lowerIndustry.includes('software')) {
    return 'tech';
  } else if (lowerIndustry.includes('commerce') || lowerIndustry.includes('retail') || lowerIndustry.includes('shop')) {
    return 'ecommerce';
  } else if (lowerIndustry.includes('service') || lowerIndustry.includes('professional')) {
    return 'service';
  } else if (lowerIndustry.includes('food') || lowerIndustry.includes('restaurant') || lowerIndustry.includes('beverage')) {
    return 'food';
  } else if (lowerIndustry.includes('health') || lowerIndustry.includes('medical') || lowerIndustry.includes('clinical')) {
    return 'healthcare';
  } else if (lowerIndustry.includes('education') || lowerIndustry.includes('learning') || lowerIndustry.includes('training')) {
    return 'education';
  } else if (lowerIndustry.includes('finance') || lowerIndustry.includes('fintech') || lowerIndustry.includes('payment')) {
    return 'finance';
  }

  return 'general';
}

/**
 * Get quality level color for UI
 */
export function getQualityLevelColor(level: AnswerQuality['level']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'excellent':
      return {
        bg: 'bg-green-50 dark:bg-green-900/10',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
      };
    case 'good':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/10',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
      };
    case 'needs-improvement':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
      };
  }
}

/**
 * Get score badge color based on score value
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-orange-500';
}
