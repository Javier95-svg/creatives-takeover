// Rule-based question generator for each component
// NOT LLM - deterministic question generation

import type {
  ComponentType,
  BizMapComponent
} from './types.ts';

export function getQuestionForComponent(
  componentType: ComponentType,
  collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  switch (componentType) {
    case 'problem':
      return getProblemQuestion(collectedComponents);
    case 'target_user':
      return getTargetUserQuestion(collectedComponents);
    case 'value_prop':
      return getValuePropQuestion(collectedComponents);
    case 'revenue':
      return getRevenueQuestion(collectedComponents);
    case 'distribution':
      return getDistributionQuestion(collectedComponents);
    case 'costs':
      return getCostsQuestion(collectedComponents);
    case 'risks':
      return getRisksQuestion(collectedComponents);
    case 'assumptions':
      return getAssumptionsQuestion(collectedComponents);
    default:
      return 'Tell me about your business idea.';
  }
}

function getProblemQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  return `What specific problem are you solving? 

Please describe:
- What problem do people face?
- How severe is this problem? (high/medium/low)
- How often does this problem occur? (daily/weekly/monthly/occasional)
- Who is affected by this problem?
- How painful is this problem on a scale of 1-10?

Be specific - avoid generic statements like "people need better solutions".`;
}

function getTargetUserQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  const problem = collectedComponents?.problem;
  const problemContext = problem 
    ? ` Based on the problem you described (${(problem as any).problem_statement?.substring(0, 50)}...),`
    : '';

  return `${problemContext} Who is your target user?

Please describe:
- Demographics: Age range, location, income level (if relevant), job title (if B2B)
- Psychographics: What do they value? What motivates them? What are their pain points?
- Digital behavior: Where do they spend time online? How comfortable are they with technology?
- Give them a descriptive name (e.g., "Tech-savvy urban professionals aged 25-40")

Be as specific as possible - avoid vague descriptions like "everyone".`;
}

function getValuePropQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  const problem = collectedComponents?.problem;
  const targetUser = collectedComponents?.target_user;
  
  const contextParts: string[] = [];
  if (problem) {
    contextParts.push(`the problem (${(problem as any).problem_statement?.substring(0, 50)}...)`);
  }
  if (targetUser) {
    contextParts.push(`target users (${(targetUser as any).user_segment_name})`);
  }
  const context = contextParts.length > 0 ? ` Given ${contextParts.join(' and ')},` : '';

  return `${context} What's your unique value proposition?

Please describe:
- What unique value do you provide? (one clear sentence, max 200 chars)
- What are the key benefits users get? (list 3-5 benefits)
- How is this different from existing solutions? (be specific, max 200 chars)
- What outcome do users achieve? (max 150 chars)
- Optional: Any proof points or evidence?

Focus on what makes your solution unique and valuable.`;
}

function getRevenueQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  const valueProp = collectedComponents?.value_prop;
  const valueContext = valueProp 
    ? ` Given your value proposition (${(valueProp as any).unique_value?.substring(0, 50)}...),`
    : '';

  return `${valueContext} How will you make money?

Please describe:
- Revenue model type: subscription, one-time, marketplace, ads, freemium, tiered, or usage-based
- Price point: What will you charge? (specific number)
- Currency: USD, EUR, etc.
- Payment frequency: one-time, monthly, annual, or usage-based
- Optional: Pricing tiers or structure
- Optional: Revenue projections for months 3, 6, and 12

Be specific with numbers. If unsure, provide your best estimate.`;
}

function getDistributionQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  const targetUser = collectedComponents?.target_user;
  const userContext = targetUser 
    ? ` Given your target users (${(targetUser as any).user_segment_name})`
    : '';

  return `${userContext}, how will customers discover and purchase your product?

Please describe:
- Distribution channels: How will customers find you? (e.g., digital, retail, direct sales, online marketplace)
- Primary channel: Which is your main channel?
- Strategy for each channel: Why this channel? Which users does it reach?
- Optional: Estimated customer acquisition cost (CAC)

Ensure channels align with where your target users spend time.`;
}

function getCostsQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  const revenue = collectedComponents?.revenue;
  const revenueContext = revenue 
    ? ` Given your revenue model (${(revenue as any).model_type}, ${(revenue as any).price_point} ${(revenue as any).currency}),`
    : '';

  return `${revenueContext} What are your costs?

Please describe:
- Fixed costs: Ongoing costs that don't vary (e.g., infrastructure: $100/month, team: $5000/month)
- Variable costs: Costs per customer or transaction (e.g., per_customer: $10, processing_fee: 3%)
- Optional: Initial investment or startup costs
- Optional: Total monthly recurring costs
- High-level cost breakdown description (max 200 chars)

Be realistic about costs. Include all major cost categories.`;
}

function getRisksQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  const componentsSummary = Object.keys(collectedComponents || {}).join(', ');
  const context = componentsSummary 
    ? ` Based on your business plan (${componentsSummary}),`
    : '';

  return `${context} What are the key risks?

Please describe risks including:
- Risk type: market, execution, financial, competitive, regulatory, timing, or team
- Description: What is the risk? (max 150 chars)
- Severity: critical, high, medium, or low
- Probability: high, medium, or low
- Optional: Mitigation strategy (max 200 chars)
- Overall risk level: critical, high, medium, or low

Be honest and thorough - identify at least 3-5 risks. Maximum 10 risks.`;
}

function getAssumptionsQuestion(collectedComponents?: Partial<Record<ComponentType, BizMapComponent>>): string {
  const componentsSummary = Object.keys(collectedComponents || {}).join(', ');
  const context = componentsSummary 
    ? ` Based on your business plan (${componentsSummary}),`
    : '';

  return `${context} What are your key assumptions?

List assumptions that must be true for your business to succeed:
- Assumption type: market, product, customer, financial, timing, or competition
- Statement: What do you assume? (max 200 chars)
- Validation method: How will you test this? (max 150 chars, be specific)
- Confidence: high, medium, or low
- Critical: Is this critical to success? (true/false)

Identify 3-15 assumptions. At least one should be marked as critical. Be specific about how you'll validate each.`;
}

export function getValidationHint(componentType: ComponentType): string {
  switch (componentType) {
    case 'problem':
      return 'Tip: Be specific about the problem. Avoid generic statements.';
    case 'target_user':
      return 'Tip: Be specific about demographics and psychographics. Avoid "everyone".';
    case 'value_prop':
      return 'Tip: Explain HOW you\'re different, not just that you\'re "better".';
    case 'revenue':
      return 'Tip: Provide specific numbers. Price point must be greater than 0.';
    case 'distribution':
      return 'Tip: Ensure channels align with where your target users spend time.';
    case 'costs':
      return 'Tip: Include all major cost categories. Be realistic.';
    case 'risks':
      return 'Tip: Be honest about risks. Include at least 3-5 risks.';
    case 'assumptions':
      return 'Tip: Be specific about validation methods. Mark critical assumptions.';
    default:
      return '';
  }
}

// Generate user-friendly response message explaining what happened
export function generateResponseMessage(
  componentType: ComponentType,
  validationResult: { valid: boolean; errors: any[]; warnings: any[] },
  crossValidationResult: { valid: boolean; errors: any[]; warnings: any[] },
  nextComponent: ComponentType | null,
  completionPercentage: number
): string {
  const componentNames: Record<ComponentType, string> = {
    'problem': 'problem',
    'target_user': 'target user',
    'value_prop': 'value proposition',
    'revenue': 'revenue model',
    'distribution': 'distribution strategy',
    'costs': 'cost structure',
    'risks': 'risks',
    'assumptions': 'assumptions'
  };

  const componentName = componentNames[componentType] || componentType;
  const allErrors = [...validationResult.errors, ...crossValidationResult.errors];
  const allWarnings = [...validationResult.warnings, ...crossValidationResult.warnings];

  // If validation failed, explain what needs to be fixed
  if (allErrors.length > 0) {
    const errorMessages = allErrors.slice(0, 3).map(e => e.message || e).join(', ');
    const moreErrors = allErrors.length > 3 ? ` (and ${allErrors.length - 3} more issue${allErrors.length - 3 > 1 ? 's' : ''})` : '';
    return `I captured your ${componentName}, but I noticed some issues: ${errorMessages}${moreErrors}. Could you please clarify or provide more details?`;
  }

  // If there are warnings but no errors, acknowledge and move forward
  if (allWarnings.length > 0 && validationResult.valid && crossValidationResult.valid) {
    return `Great! I've captured your ${componentName}. I noticed a few things to keep in mind: ${allWarnings[0].message || ''}. Let's continue!`;
  }

  // Success case - component validated successfully
  if (nextComponent) {
    const nextComponentName = componentNames[nextComponent] || nextComponent;
    return `Excellent! I've successfully captured your ${componentName}. You're ${completionPercentage}% complete. Now let's move on to the ${nextComponentName}.`;
  } else {
    return `Perfect! I've captured your ${componentName}. Your business map is now complete! 🎉 You've successfully defined all 8 key components of your business plan.`;
  }
}

