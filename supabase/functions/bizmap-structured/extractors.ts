// Component extraction functions using advanced AI models
// Uses ai-model-router with quality strategy for best model selection
// Enforces strict JSON schema - NO hallucination

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

import {
  buildProblemExtractionPrompt,
  buildTargetUserExtractionPrompt,
  buildValuePropExtractionPrompt,
  buildRevenueExtractionPrompt,
  buildDistributionExtractionPrompt,
  buildCostsExtractionPrompt,
  buildRisksExtractionPrompt,
  buildAssumptionsExtractionPrompt
} from './prompts.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface ExtractionResult {
  success: boolean;
  component?: BizMapComponent;
  errors: string[];
}

async function callModelRouter(
  prompt: string,
  systemPrompt: string,
  userId?: string
): Promise<{ content: string; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-model-router`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        provider: 'auto',
        strategy: 'quality', // Use best available model (GPT-5, Claude Sonnet 4, etc.)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Low temperature for consistency
        max_tokens: 1500,
        user_id: userId,
        function_name: 'bizmap-structured-extractor'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`Model router error: ${response.status} - ${errorText}`);
      return { content: '', errors };
    }

    const data = await response.json();
    
    if (!data.content) {
      errors.push('No content returned from model router');
      return { content: '', errors };
    }

    // Try to extract JSON from response (handle markdown code blocks)
    let jsonContent = data.content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      const lines = jsonContent.split('\n');
      const startIndex = lines.findIndex(l => l.includes('{'));
      const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('}'));
      if (startIndex >= 0 && endIndex >= startIndex) {
        jsonContent = lines.slice(startIndex, endIndex + 1).join('\n');
      }
    }

    return { content: jsonContent, errors: [] };
  } catch (error) {
    errors.push(`Extraction error: ${error.message}`);
    return { content: '', errors };
  }
}

export async function extractProblem(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildProblemExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured problem information. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as ProblemComponent;
    
    // Basic validation
    if (!component.problem_statement || !component.severity || !component.frequency || !component.pain_intensity) {
      return {
        success: false,
        errors: ['Missing required fields in problem component']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

export async function extractTargetUser(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildTargetUserExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured target user information. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as TargetUserComponent;
    
    // Basic validation
    if (!component.demographics?.age_range || !component.demographics?.location || 
        !component.user_segment_name || !component.digital_behavior?.tech_comfort_level) {
      return {
        success: false,
        errors: ['Missing required fields in target user component']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

export async function extractValueProp(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildValuePropExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured value proposition. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as ValuePropComponent;
    
    // Basic validation
    if (!component.unique_value || !component.differentiation || !component.target_outcome || 
        !component.key_benefits || component.key_benefits.length === 0) {
      return {
        success: false,
        errors: ['Missing required fields in value prop component']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

export async function extractRevenue(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildRevenueExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured revenue model. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as RevenueComponent;
    
    // Basic validation
    if (!component.model_type || !component.payment_frequency || 
        !component.currency || (component.price_point === undefined || component.price_point === null)) {
      return {
        success: false,
        errors: ['Missing required fields in revenue component']
      };
    }

    if (component.price_point <= 0) {
      return {
        success: false,
        errors: ['price_point must be greater than 0']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

export async function extractDistribution(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildDistributionExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured distribution channels. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as DistributionComponent;
    
    // Basic validation
    if (!component.channels || component.channels.length === 0 || !component.primary_channel) {
      return {
        success: false,
        errors: ['Missing required fields in distribution component']
      };
    }

    if (!component.channels.includes(component.primary_channel)) {
      return {
        success: false,
        errors: ['primary_channel must be one of the channels']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

export async function extractCosts(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildCostsExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured cost information. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as CostsComponent;
    
    // Basic validation
    if (!component.cost_breakdown) {
      return {
        success: false,
        errors: ['Missing required fields in costs component']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

export async function extractRisks(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildRisksExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured risks. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as RisksComponent;
    
    // Basic validation
    if (!component.risks || component.risks.length === 0 || !component.overall_risk_level) {
      return {
        success: false,
        errors: ['Missing required fields in risks component']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

export async function extractAssumptions(
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  const prompt = buildAssumptionsExtractionPrompt(userInput, context);
  const systemPrompt = 'You are a business analyst extracting structured assumptions. Return ONLY valid JSON matching the exact schema provided. Do not add any text outside the JSON object.';

  const { content, errors } = await callModelRouter(prompt, systemPrompt, userId);

  if (errors.length > 0 || !content) {
    return { success: false, errors };
  }

  try {
    const component = JSON.parse(content) as AssumptionsComponent;
    
    // Basic validation
    if (!component.assumptions || component.assumptions.length < 3) {
      return {
        success: false,
        errors: ['Missing required fields in assumptions component - need at least 3 assumptions']
      };
    }

    return { success: true, component, errors: [] };
  } catch (parseError) {
    return {
      success: false,
      errors: [`JSON parse error: ${parseError.message}`, `Content: ${content.substring(0, 200)}`]
    };
  }
}

// Main extraction function that routes to the appropriate extractor
export async function extractComponent(
  componentType: ComponentType,
  userInput: string,
  context?: Partial<Record<ComponentType, BizMapComponent>>,
  userId?: string
): Promise<ExtractionResult> {
  switch (componentType) {
    case 'problem':
      return extractProblem(userInput, context, userId);
    case 'target_user':
      return extractTargetUser(userInput, context, userId);
    case 'value_prop':
      return extractValueProp(userInput, context, userId);
    case 'revenue':
      return extractRevenue(userInput, context, userId);
    case 'distribution':
      return extractDistribution(userInput, context, userId);
    case 'costs':
      return extractCosts(userInput, context, userId);
    case 'risks':
      return extractRisks(userInput, context, userId);
    case 'assumptions':
      return extractAssumptions(userInput, context, userId);
    default:
      return {
        success: false,
        errors: [`Unknown component type: ${componentType}`]
      };
  }
}

