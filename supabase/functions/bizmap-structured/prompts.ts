// Prompt templates for component extraction
// Uses advanced AI models with strict JSON schema enforcement
// NO hallucination - returns errors if insufficient data

import type {
  ComponentType,
  ProblemComponent,
  TargetUserComponent,
  ValuePropComponent,
  RevenueComponent,
  DistributionComponent,
  CostsComponent,
  RisksComponent,
  AssumptionsComponent,
  BizMapComponent
} from './types.ts';

export function buildProblemExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the PROBLEM component from the user's business idea.

USER INPUT:
${userInput}

${context?.target_user ? `EXISTING CONTEXT - Target User: ${JSON.stringify(context.target_user)}\n` : ''}

TASK: Extract structured problem information. Return ONLY valid JSON matching this exact schema:
{
  "problem_statement": "string (max 200 chars, required) - Clear, specific problem statement",
  "severity": "high" | "medium" | "low" (required) - How severe is this problem?",
  "frequency": "daily" | "weekly" | "monthly" | "occasional" (required) - How often does this problem occur?",
  "affected_users": "string (max 150 chars) - Who experiences this problem?",
  "current_solutions": ["string"] (max 10 items) - Array of existing solutions people use today",
  "pain_intensity": number (1-10, required) - On a scale of 1-10, how painful is this problem?
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. If information is missing, return null/empty but DO NOT make up or guess values
3. problem_statement must be specific, not generic (e.g., NOT "people need better solutions")
4. If you cannot extract required fields, still return the JSON but indicate what's missing in the structure
5. Do NOT hallucinate statistics, company names, or specific data points
6. pain_intensity must be a number between 1 and 10

VALIDATION CHECKS:
- problem_statement length: 10-200 characters
- severity must be one of: high, medium, low
- frequency must be one of: daily, weekly, monthly, occasional
- pain_intensity must be integer between 1-10
- current_solutions array max length: 10

Return the JSON object now:`;
}

export function buildTargetUserExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the TARGET USER component from the user's business idea.

USER INPUT:
${userInput}

${context?.problem ? `EXISTING CONTEXT - Problem: ${JSON.stringify(context.problem)}\n` : ''}

TASK: Extract structured target user information. Return ONLY valid JSON matching this exact schema:
{
  "demographics": {
    "age_range": "string (required) - e.g., '25-45', '18-24'",
    "location": "string (required) - e.g., 'Urban US', 'Global', 'Europe'",
    "income_bracket": "string (optional) - e.g., '$50k-$100k'",
    "job_title": "string (optional) - For B2B targeting",
    "company_size": "string (optional) - For B2B, e.g., '10-50 employees'"
  },
  "psychographics": {
    "values": ["string"] (max 5 items, required) - What they value",
    "motivations": ["string"] (max 5 items, required) - What motivates them",
    "pain_points": ["string"] (max 5 items, required) - Their pain points"
  },
  "digital_behavior": {
    "primary_platforms": ["string"] (max 5 items) - Where they spend time online",
    "tech_comfort_level": "high" | "medium" | "low" (required) - Tech comfort",
    "preferred_communication": ["string"] (max 3 items) - How they prefer to communicate"
  },
  "user_segment_name": "string (max 100 chars, required) - Descriptive name for this segment"
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. If information is missing, return reasonable defaults but DO NOT make up specific demographics
3. user_segment_name should be descriptive (e.g., "Tech-savvy urban professionals aged 25-40")
4. demographics.location is required - use "Global" if unclear
5. demographics.age_range is required - use a reasonable range if unclear
6. Do NOT make up specific income levels, company names, or platforms without evidence

VALIDATION CHECKS:
- user_segment_name length: 5-100 characters
- values, motivations, pain_points arrays: max 5 items each
- primary_platforms array: max 5 items
- preferred_communication array: max 3 items
- tech_comfort_level must be: high, medium, or low

Return the JSON object now:`;
}

export function buildValuePropExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the VALUE PROPOSITION component from the user's business idea.

USER INPUT:
${userInput}

${context?.problem ? `EXISTING CONTEXT - Problem: ${JSON.stringify(context.problem)}\n` : ''}
${context?.target_user ? `EXISTING CONTEXT - Target User: ${JSON.stringify(context.target_user)}\n` : ''}

TASK: Extract structured value proposition. Return ONLY valid JSON matching this exact schema:
{
  "unique_value": "string (max 200 chars, required) - Core unique value in one sentence",
  "key_benefits": ["string"] (max 5 items, required) - Top benefits users get",
  "differentiation": "string (max 200 chars, required) - How it's different from alternatives",
  "target_outcome": "string (max 150 chars, required) - What outcome users achieve",
  "proof_points": ["string"] (max 5 items, optional) - Evidence or social proof"
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. unique_value must be specific and actionable, not generic
3. key_benefits should be concrete and measurable where possible
4. differentiation must explain HOW it's different, not just "better"
5. Do NOT make up proof_points, testimonials, or specific metrics
6. If proof_points cannot be inferred, return empty array []

VALIDATION CHECKS:
- unique_value length: 10-200 characters
- differentiation length: 10-200 characters
- target_outcome length: 10-150 characters
- key_benefits array: 1-5 items, required
- proof_points array: max 5 items, optional

Return the JSON object now:`;
}

export function buildRevenueExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the REVENUE component from the user's business idea.

USER INPUT:
${userInput}

${context?.value_prop ? `EXISTING CONTEXT - Value Prop: ${JSON.stringify(context.value_prop)}\n` : ''}
${context?.target_user ? `EXISTING CONTEXT - Target User: ${JSON.stringify(context.target_user)}\n` : ''}

TASK: Extract structured revenue model. Return ONLY valid JSON matching this exact schema:
{
  "model_type": "subscription" | "one-time" | "marketplace" | "ads" | "freemium" | "tiered" | "usage-based" (required),
  "price_point": number (required, > 0) - Base price or starting price",
  "currency": "string (required) - e.g., 'USD', 'EUR'",
  "pricing_structure": {
    "tiers": [{"name": "string", "price": number, "features": ["string"]}] (optional) - For tiered pricing,
    "unit": "string (optional) - e.g., 'per user', 'per month'"
  },
  "revenue_projections": {
    "month_3": number (optional),
    "month_6": number (optional),
    "month_12": number (optional)
  },
  "payment_frequency": "one-time" | "monthly" | "annual" | "usage-based" (required)
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. price_point MUST be a positive number - if unclear, return null but structure remains
3. Do NOT make up specific revenue projections without evidence
4. model_type must match the business model described
5. currency defaults to "USD" if unclear
6. If pricing_structure.tiers are not specified, return null for that field

VALIDATION CHECKS:
- price_point must be > 0
- model_type must be one of the enum values
- payment_frequency must be one of: one-time, monthly, annual, usage-based
- currency must be a valid currency code (3 letters)

Return the JSON object now:`;
}

export function buildDistributionExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the DISTRIBUTION component from the user's business idea.

USER INPUT:
${userInput}

${context?.target_user ? `EXISTING CONTEXT - Target User: ${JSON.stringify(context.target_user)}\n` : ''}
${context?.value_prop ? `EXISTING CONTEXT - Value Prop: ${JSON.stringify(context.value_prop)}\n` : ''}

TASK: Extract structured distribution channels. Return ONLY valid JSON matching this exact schema:
{
  "channels": ["string"] (required, min 1) - Array of channel types (e.g., "digital", "retail", "direct_sales", "online_marketplace"),
  "primary_channel": "string (required) - Must be one of the channels",
  "channel_strategy": {
    "[channel_name]": {
      "rationale": "string (max 150 chars) - Why this channel",
      "target_users": "string (max 100 chars) - Which users reached"
    }
  },
  "acquisition_cost_estimate": number (optional) - Estimated CAC
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. channels array must have at least 1 item
3. primary_channel must be one of the values in channels array
4. channel_strategy should have entries for each channel
5. Do NOT make up specific CAC numbers without evidence - return null if unclear
6. Channels should align with target_user.digital_behavior

VALIDATION CHECKS:
- channels array: min 1 item, required
- primary_channel must exist in channels array
- channel_strategy keys should match channels
- acquisition_cost_estimate should be > 0 if provided

Return the JSON object now:`;
}

export function buildCostsExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the COSTS component from the user's business idea.

USER INPUT:
${userInput}

${context?.revenue ? `EXISTING CONTEXT - Revenue: ${JSON.stringify(context.revenue)}\n` : ''}
${context?.distribution ? `EXISTING CONTEXT - Distribution: ${JSON.stringify(context.distribution)}\n` : ''}

TASK: Extract structured cost information. Return ONLY valid JSON matching this exact schema:
{
  "fixed_costs": {
    "[category]": number - e.g., "infrastructure": 100, "team": 5000, "office": 2000
  },
  "variable_costs": {
    "[category]": number - e.g., "per_customer": 10, "processing_fee": 0.03
  },
  "initial_investment": number (optional) - Startup costs",
  "monthly_recurring": number (optional) - Monthly recurring costs total",
  "cost_breakdown": "string (max 200 chars, required) - High-level description"
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. fixed_costs and variable_costs are objects with category: value pairs
3. If specific costs are unclear, estimate reasonably but indicate uncertainty in cost_breakdown
4. Do NOT make up specific dollar amounts without evidence - use ranges if needed
5. cost_breakdown must explain the major cost categories

VALIDATION CHECKS:
- cost_breakdown length: 10-200 characters, required
- All cost values must be >= 0
- fixed_costs and variable_costs should have at least one category

Return the JSON object now:`;
}

export function buildRisksExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the RISKS component from the user's business idea.

USER INPUT:
${userInput}

${context ? `EXISTING CONTEXT: ${JSON.stringify(context, null, 2)}\n` : ''}

TASK: Extract structured risks. Return ONLY valid JSON matching this exact schema:
{
  "risks": [
    {
      "risk_type": "market" | "execution" | "financial" | "competitive" | "regulatory" | "timing" | "team" (required),
      "description": "string (max 150 chars, required) - Clear risk description",
      "severity": "critical" | "high" | "medium" | "low" (required)",
      "probability": "high" | "medium" | "low" (required)",
      "mitigation": "string (max 200 chars, optional) - How to mitigate"
    }
  ],
  "overall_risk_level": "critical" | "high" | "medium" | "low" (required)"
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. risks array: max 10 items
3. Identify real risks based on the business model - do not be overly optimistic
4. overall_risk_level should reflect the highest severity risk
5. If no specific risks can be identified, still return structure with at least 1 generic risk
6. Do NOT make up specific regulatory or competitive risks without evidence

VALIDATION CHECKS:
- risks array: 1-10 items, required
- Each risk must have: risk_type, description, severity, probability
- overall_risk_level must be one of: critical, high, medium, low

Return the JSON object now:`;
}

export function buildAssumptionsExtractionPrompt(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>
): string {
  return `Extract the ASSUMPTIONS component from the user's business idea.

USER INPUT:
${userInput}

${context ? `EXISTING CONTEXT: ${JSON.stringify(context, null, 2)}\n` : ''}

TASK: Extract structured assumptions. Return ONLY valid JSON matching this exact schema:
{
  "assumptions": [
    {
      "assumption_type": "market" | "product" | "customer" | "financial" | "timing" | "competition" (required),
      "statement": "string (max 200 chars, required) - The assumption statement",
      "validation_method": "string (max 150 chars, required) - How to test this assumption",
      "confidence": "high" | "medium" | "low" (required)",
      "critical": boolean (required) - Is this critical to success?
    }
  ]
}

CRITICAL RULES:
1. Return ONLY the JSON object, no additional text
2. assumptions array: min 3, max 15 items
3. Identify key assumptions that must be true for the business to succeed
4. validation_method should be specific and actionable
5. Mark truly critical assumptions as critical: true
6. Do NOT make up assumptions - extract from the business description

VALIDATION CHECKS:
- assumptions array: 3-15 items, required
- Each assumption must have: assumption_type, statement, validation_method, confidence, critical
- At least one assumption should have critical: true

Return the JSON object now:`;
}

