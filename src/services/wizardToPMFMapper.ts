/**
 * Wizard to PMF Mapper Service
 * Maps data from BizMap wizard to PMF Lab form fields
 */

export interface WizardAnswers {
  overview?: string; // Step 1: Business concept
  market?: string; // Step 2: Target customer
  problem?: string; // Step 3: Validation plan
  solution?: string; // Step 4: MVP design
  channels?: string; // Step 5: Launch strategy
  pricing?: string; // Step 6: Pricing model
  goals?: string; // Step 7: Success metrics
}

export interface PMFFormData {
  problemStatement: string;
  solutionDescription: string;
  targetMarket: string;
  businessModel: string;
  industry: string;
  keyAssumptions: string[];
  competitiveLandscape: string;
  tractionValidation: string;
}

export interface MappingResult {
  data: Partial<PMFFormData>;
  mappings: Record<string, string>; // field -> source
  confidence: Record<string, number>; // field -> confidence score (0-1)
}

/**
 * Extract problem statement from business concept
 */
function extractProblem(overview?: string): string {
  if (!overview) return '';

  // Look for problem indicators
  const problemPatterns = [
    /(?:problem|pain point|struggle|frustration|challenge|issue|difficulty)[:\s]+([^.!?]+)/i,
    /([^.!?]+)(?:is a problem|causes issues|creates friction)/i,
  ];

  for (const pattern of problemPatterns) {
    const match = overview.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no specific problem found, take first 2-3 sentences
  const sentences = overview.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.slice(0, 2).join('. ') + (sentences.length > 1 ? '.' : '');
}

/**
 * Infer business model from pricing description
 */
function inferBusinessModel(pricing?: string): string {
  if (!pricing) return '';

  const lowerPricing = pricing.toLowerCase();

  if (lowerPricing.includes('subscription') || lowerPricing.includes('/month') || lowerPricing.includes('monthly')) {
    return 'SaaS (Subscription)';
  }
  if (lowerPricing.includes('marketplace') || lowerPricing.includes('commission') || lowerPricing.includes('percentage')) {
    return lowerPricing.includes('marketplace') ? 'Marketplace' : 'Commission/Transaction Fee';
  }
  if (lowerPricing.includes('ecommerce') || lowerPricing.includes('product') || lowerPricing.includes('sell')) {
    return 'E-commerce';
  }
  if (lowerPricing.includes('freemium') || lowerPricing.includes('free tier') || lowerPricing.includes('free version')) {
    return 'Freemium';
  }
  if (lowerPricing.includes('one-time') || lowerPricing.includes('one time') || lowerPricing.includes('single payment')) {
    return 'One-time Purchase';
  }
  if (lowerPricing.includes('advertising') || lowerPricing.includes('ads') || lowerPricing.includes('sponsored')) {
    return 'Advertising';
  }
  if (lowerPricing.includes('license') || lowerPricing.includes('licensing')) {
    return 'Licensing';
  }

  return 'Other';
}

/**
 * Extract industry from business context
 */
function detectIndustry(overview?: string, market?: string): string {
  const combined = `${overview || ''} ${market || ''}`.toLowerCase();

  if (combined.includes('tech') || combined.includes('saas') || combined.includes('software') || combined.includes('app')) {
    return 'Technology/SaaS';
  }
  if (combined.includes('ecommerce') || combined.includes('retail') || combined.includes('store') || combined.includes('shop')) {
    return 'E-commerce/Retail';
  }
  if (combined.includes('health') || combined.includes('medical') || combined.includes('clinic') || combined.includes('hospital')) {
    return 'Healthcare';
  }
  if (combined.includes('education') || combined.includes('learning') || combined.includes('course') || combined.includes('teaching')) {
    return 'Education';
  }
  if (combined.includes('finance') || combined.includes('fintech') || combined.includes('banking') || combined.includes('payment')) {
    return 'Finance/Fintech';
  }
  if (combined.includes('real estate') || combined.includes('property') || combined.includes('housing')) {
    return 'Real Estate';
  }
  if (combined.includes('food') || combined.includes('restaurant') || combined.includes('beverage') || combined.includes('catering')) {
    return 'Food & Beverage';
  }
  if (combined.includes('fitness') || combined.includes('wellness') || combined.includes('gym') || combined.includes('yoga')) {
    return 'Fitness/Wellness';
  }
  if (combined.includes('entertainment') || combined.includes('media') || combined.includes('content') || combined.includes('video')) {
    return 'Entertainment/Media';
  }
  if (combined.includes('professional services') || combined.includes('consulting') || combined.includes('agency')) {
    return 'Professional Services';
  }

  return 'Other';
}

/**
 * Extract validation/traction information
 */
function extractTraction(problem?: string, goals?: string): string {
  if (!problem && !goals) return '';

  const parts: string[] = [];

  // Look for validation mentions in problem field
  if (problem) {
    const validationPatterns = [
      /(\d+)\s*(?:interviews?|surveys?|conversations?)/i,
      /tested with (\d+)\s*(?:users?|customers?|people)/i,
      /(\d+)\s*(?:signups?|emails?|waitlist)/i,
    ];

    for (const pattern of validationPatterns) {
      const match = problem.match(pattern);
      if (match) {
        parts.push(match[0]);
      }
    }
  }

  // Look for traction in goals
  if (goals) {
    const tractionPatterns = [
      /(\d+)\s*(?:paying\s*)?(?:users?|customers?|subscribers?)/i,
      /\$[\d,]+\s*(?:in\s*)?(?:revenue|MRR|ARR)/i,
    ];

    for (const pattern of tractionPatterns) {
      const match = goals.match(pattern);
      if (match) {
        parts.push(match[0]);
      }
    }
  }

  return parts.join('. ');
}

/**
 * Calculate confidence score for a mapping
 */
function calculateConfidence(source: string | undefined, field: string): number {
  if (!source || source.length < 10) return 0.2;
  if (source.length < 30) return 0.5;

  // Higher confidence for direct mappings
  if (field === 'solutionDescription' || field === 'targetMarket') {
    return 0.9;
  }

  // Medium confidence for inferred fields
  if (field === 'problemStatement' || field === 'businessModel' || field === 'industry') {
    return 0.7;
  }

  // Lower confidence for extracted fields
  return 0.6;
}

/**
 * Main mapping function
 */
export function mapWizardToPMF(wizardAnswers: WizardAnswers): MappingResult {
  const problemStatement = extractProblem(wizardAnswers.overview);
  const solutionDescription = wizardAnswers.solution || '';
  const targetMarket = wizardAnswers.market || '';
  const businessModel = inferBusinessModel(wizardAnswers.pricing);
  const industry = detectIndustry(wizardAnswers.overview, wizardAnswers.market);
  const tractionValidation = extractTraction(wizardAnswers.problem, wizardAnswers.goals);

  const data: Partial<PMFFormData> = {};
  const mappings: Record<string, string> = {};
  const confidence: Record<string, number> = {};

  // Only include fields with sufficient confidence
  if (problemStatement && problemStatement.length > 20) {
    data.problemStatement = problemStatement;
    mappings.problemStatement = 'Business Concept (Step 1)';
    confidence.problemStatement = calculateConfidence(wizardAnswers.overview, 'problemStatement');
  }

  if (solutionDescription && solutionDescription.length > 20) {
    data.solutionDescription = solutionDescription;
    mappings.solutionDescription = 'MVP Design (Step 4)';
    confidence.solutionDescription = calculateConfidence(wizardAnswers.solution, 'solutionDescription');
  }

  if (targetMarket && targetMarket.length > 15) {
    data.targetMarket = targetMarket;
    mappings.targetMarket = 'Target Customer (Step 2)';
    confidence.targetMarket = calculateConfidence(wizardAnswers.market, 'targetMarket');
  }

  if (businessModel && businessModel !== 'Other') {
    data.businessModel = businessModel;
    mappings.businessModel = 'Pricing Model (Step 6)';
    confidence.businessModel = calculateConfidence(wizardAnswers.pricing, 'businessModel');
  }

  if (industry && industry !== 'Other') {
    data.industry = industry;
    mappings.industry = 'Auto-detected from Business Concept';
    confidence.industry = calculateConfidence(wizardAnswers.overview, 'industry');
  }

  if (tractionValidation) {
    data.tractionValidation = tractionValidation;
    mappings.tractionValidation = 'Validation Plan & Goals (Steps 3 & 7)';
    confidence.tractionValidation = calculateConfidence(tractionValidation, 'tractionValidation');
  }

  return {
    data,
    mappings,
    confidence,
  };
}

/**
 * Check if wizard has sufficient data for PMF mapping
 */
export function hasWizardData(wizardAnswers: WizardAnswers): boolean {
  return !!(
    wizardAnswers.overview ||
    wizardAnswers.market ||
    wizardAnswers.solution
  );
}

/**
 * Get fields that were auto-populated
 */
export function getAutoPopulatedFields(mappingResult: MappingResult): string[] {
  return Object.keys(mappingResult.data);
}

/**
 * Get mapping summary for display
 */
export function getMappingSummary(mappingResult: MappingResult): string {
  const count = Object.keys(mappingResult.data).length;
  if (count === 0) return 'No fields were auto-populated';
  if (count === 1) return '1 field was auto-populated from your business plan';
  return `${count} fields were auto-populated from your business plan`;
}
