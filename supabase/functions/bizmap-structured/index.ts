import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

import type {
  ComponentType,
  BizMapComponent,
  BizMapStructuredResponse,
  SubmitAnswerRequest,
  ValidationError
} from './types.ts';

import { extractComponent } from './extractors.ts';
import { validateComponent } from './validators.ts';
import { crossValidateComponents } from './cross-validator.ts';
import { validateWithExternalData } from './external-validator.ts';
import { getNextState, isValidComponentOrder } from './state-machine.ts';
import { getQuestionForComponent } from './questions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const action = path.split('/').pop() || 'answer';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Route requests
    switch (action) {
      case 'start':
        return handleStart(req, supabase, userId);
      case 'answer':
        return handleAnswer(req, supabase, userId);
      case 'status':
        return handleStatus(req, supabase, userId);
      case 'components':
        return handleGetComponents(req, supabase, userId);
      case 'validate':
        return handleValidate(req, supabase, userId);
      default:
        return handleAnswer(req, supabase, userId); // Default to answer
    }
  } catch (error: any) {
    console.error('BizMap Structured Error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message || 'Unknown error occurred',
        question: 'Please try again or contact support.',
        collectedComponents: {},
        validationErrors: [],
        completionPercentage: 0
      } as BizMapStructuredResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleStart(
  req: Request,
  supabase: any,
  userId: string | null
): Promise<Response> {
  // Create new session
  const { data: session, error } = await supabase
    .from('bizmap_sessions')
    .insert({
      user_id: userId,
      status: 'draft',
      completion_percentage: 0,
      current_component: 'problem'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  const question = getQuestionForComponent('problem');

  return new Response(
    JSON.stringify({
      status: 'collecting',
      currentComponent: 'problem',
      question,
      collectedComponents: {},
      validationErrors: [],
      completionPercentage: 0,
      sessionId: session.id
    } as BizMapStructuredResponse),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handleAnswer(
  req: Request,
  supabase: any,
  userId: string | null
): Promise<Response> {
  const requestData: SubmitAnswerRequest = await req.json();
  const { session_id, component_type, answer, context } = requestData;

  if (!session_id) {
    throw new Error('session_id is required');
  }

  if (!component_type) {
    throw new Error('component_type is required');
  }

  if (!answer || answer.trim().length === 0) {
    throw new Error('answer is required');
  }

  // Get existing session and components
  const { data: session, error: sessionError } = await supabase
    .from('bizmap_sessions')
    .select('*')
    .eq('id', session_id)
    .single();

  if (sessionError || !session) {
    throw new Error(`Session not found: ${session_id}`);
  }

  // Get existing components
  const { data: existingComponents, error: componentsError } = await supabase
    .from('bizmap_components')
    .select('component_type, component_data')
    .eq('session_id', session_id);

  if (componentsError) {
    throw new Error(`Failed to load components: ${componentsError.message}`);
  }

  // Build context from existing components
  const collectedComponents: Partial<Record<ComponentType, BizMapComponent>> = {};
  existingComponents?.forEach((comp: any) => {
    collectedComponents[comp.component_type as ComponentType] = comp.component_data;
  });

  // Validate component order
  if (!isValidComponentOrder(component_type, collectedComponents)) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: `Component ${component_type} cannot be collected yet. Please complete prerequisite components first.`,
        currentComponent: session.current_component,
        question: getQuestionForComponent(session.current_component as ComponentType, collectedComponents),
        collectedComponents,
        validationErrors: [],
        completionPercentage: session.completion_percentage
      } as BizMapStructuredResponse),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Extract component using LLM
  const extractionResult = await extractComponent(
    component_type,
    answer,
    collectedComponents,
    userId || undefined
  );

  if (!extractionResult.success) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: `Failed to extract ${component_type} component: ${extractionResult.errors.join(', ')}`,
        currentComponent: component_type,
        question: getQuestionForComponent(component_type, collectedComponents),
        collectedComponents,
        validationErrors: extractionResult.errors.map(err => ({
          component: component_type,
          message: err,
          severity: 'error' as const
        })),
        completionPercentage: session.completion_percentage
      } as BizMapStructuredResponse),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate component
  const validationResult = validateComponent(component_type, extractionResult.component!);

  // Save component to database
  const componentToSave = {
    ...extractionResult.component,
    validation_errors: [
      ...validationResult.errors.map(e => e.message),
      ...validationResult.warnings.map(w => w.message)
    ]
  };

  const { error: saveError } = await supabase
    .from('bizmap_components')
    .upsert({
      session_id,
      component_type,
      component_data: componentToSave,
      validation_status: validationResult.valid ? 'valid' : (validationResult.errors.length > 0 ? 'invalid' : 'warning'),
      validation_errors: validationResult.errors.map(e => e.message)
    }, {
      onConflict: 'session_id,component_type'
    });

  if (saveError) {
    throw new Error(`Failed to save component: ${saveError.message}`);
  }

  // Update collected components
  collectedComponents[component_type] = extractionResult.component!;

  // Cross-validate
  const crossValidationResult = crossValidateComponents(collectedComponents);

  // Validate with external data (async, don't block)
  validateWithExternalData(collectedComponents, supabase).then(externalResult => {
    // Save external data references
    supabase
      .from('bizmap_components')
      .update({
        external_data_refs: externalResult.externalDataRefs
      })
      .eq('session_id', session_id)
      .eq('component_type', component_type)
      .catch(err => console.error('Failed to save external data refs:', err));
  }).catch(err => console.error('External validation error:', err));

  // Get next state
  const nextState = getNextState(collectedComponents, component_type);

  // Update session
  await supabase
    .from('bizmap_sessions')
    .update({
      status: nextState.status,
      completion_percentage: nextState.completionPercentage,
      current_component: nextState.nextComponent,
      last_validated_at: new Date().toISOString()
    })
    .eq('id', session_id);

  // Prepare response
  const allValidationErrors: ValidationError[] = [
    ...validationResult.errors,
    ...validationResult.warnings,
    ...crossValidationResult.errors,
    ...crossValidationResult.warnings
  ];

  const question = nextState.nextComponent 
    ? getQuestionForComponent(nextState.nextComponent, collectedComponents)
    : 'All components collected! Your business map is complete.';

  return new Response(
    JSON.stringify({
      status: nextState.status,
      currentComponent: nextState.nextComponent,
      question,
      collectedComponents,
      validationErrors: allValidationErrors,
      completionPercentage: nextState.completionPercentage,
      sessionId: session_id
    } as BizMapStructuredResponse),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handleStatus(
  req: Request,
  supabase: any,
  userId: string | null
): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    throw new Error('session_id query parameter is required');
  }

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('bizmap_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Get components
  const { data: components, error: componentsError } = await supabase
    .from('bizmap_components')
    .select('component_type, component_data, validation_status, validation_errors')
    .eq('session_id', sessionId);

  if (componentsError) {
    throw new Error(`Failed to load components: ${componentsError.message}`);
  }

  const collectedComponents: Partial<Record<ComponentType, BizMapComponent>> = {};
  const validationErrors: ValidationError[] = [];

  components?.forEach((comp: any) => {
    collectedComponents[comp.component_type as ComponentType] = comp.component_data;
    if (comp.validation_errors && comp.validation_errors.length > 0) {
      comp.validation_errors.forEach((err: string) => {
        validationErrors.push({
          component: comp.component_type as ComponentType,
          message: err,
          severity: comp.validation_status === 'invalid' ? 'error' : 'warning'
        });
      });
    }
  });

  const question = session.current_component 
    ? getQuestionForComponent(session.current_component as ComponentType, collectedComponents)
    : 'All components collected!';

  return new Response(
    JSON.stringify({
      status: session.status as any,
      currentComponent: session.current_component as ComponentType | null,
      question,
      collectedComponents,
      validationErrors,
      completionPercentage: session.completion_percentage,
      sessionId: session.id
    } as BizMapStructuredResponse),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handleGetComponents(
  req: Request,
  supabase: any,
  userId: string | null
): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    throw new Error('session_id query parameter is required');
  }

  const { data: components, error } = await supabase
    .from('bizmap_components')
    .select('component_type, component_data, validation_status')
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to load components: ${error.message}`);
  }

  const collectedComponents: Partial<Record<ComponentType, BizMapComponent>> = {};
  components?.forEach((comp: any) => {
    collectedComponents[comp.component_type as ComponentType] = comp.component_data;
  });

  return new Response(
    JSON.stringify({
      success: true,
      components: collectedComponents
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handleValidate(
  req: Request,
  supabase: any,
  userId: string | null
): Promise<Response> {
  const requestData = await req.json();
  const { session_id } = requestData;

  if (!session_id) {
    throw new Error('session_id is required');
  }

  // Get all components
  const { data: components, error: componentsError } = await supabase
    .from('bizmap_components')
    .select('component_type, component_data')
    .eq('session_id', session_id);

  if (componentsError) {
    throw new Error(`Failed to load components: ${componentsError.message}`);
  }

  const collectedComponents: Partial<Record<ComponentType, BizMapComponent>> = {};
  components?.forEach((comp: any) => {
    collectedComponents[comp.component_type as ComponentType] = comp.component_data;
  });

  // Run all validations
  const allValidationErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // Validate each component
  Object.entries(collectedComponents).forEach(([type, component]) => {
    const result = validateComponent(type as ComponentType, component);
    allValidationErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  // Cross-validate
  const crossResult = crossValidateComponents(collectedComponents);
  allValidationErrors.push(...crossResult.errors);
  allWarnings.push(...crossResult.warnings);

  // External validation
  const externalResult = await validateWithExternalData(collectedComponents, supabase);
  allValidationErrors.push(...externalResult.errors);
  allWarnings.push(...externalResult.warnings);

  // Save validation results
  await supabase
    .from('bizmap_validations')
    .insert({
      session_id,
      validation_type: 'comprehensive',
      result: allValidationErrors.length === 0 ? 'pass' : 'fail',
      errors: allValidationErrors,
      warnings: allWarnings,
      validated_components: Object.keys(collectedComponents) as string[]
    });

  return new Response(
    JSON.stringify({
      success: true,
      valid: allValidationErrors.length === 0,
      errors: allValidationErrors,
      warnings: allWarnings,
      externalDataRefs: externalResult.externalDataRefs
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

