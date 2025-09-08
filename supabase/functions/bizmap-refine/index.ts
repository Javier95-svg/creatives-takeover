import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefineRequest {
  answers: Record<string, string>;
  stage?: string;
  region?: string;
}

interface RefinedContext {
  businessConcept: {
    coreIdea: string;
    industry: string;
    businessModel: string;
  };
  targetCustomer: {
    demographics: string;
    psychographics: string;
    currentBehavior: string;
  };
  problemSolution: {
    painPoint: string;
    currentSolutions: string;
    uniqueValue: string;
  };
  marketApproach: {
    channels: string[];
    positioning: string;
    pricing: string;
  };
  executionPlan: {
    timeline: string;
    resources: string;
    milestones: string[];
  };
  contextQuality: 'high' | 'medium' | 'low';
  missingElements: string[];
  suggestedFollowUps: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers, stage = "Explore", region = "Global" }: RefineRequest = await req.json();

    console.log('Refining context for answers:', Object.keys(answers));

    // Get user ID for logging
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Create cache key
    const cacheKey = `refine_${await hashInput(JSON.stringify({ answers, stage, region }))}`;

    // Construct the refining prompt
    const prompt = `
You are a business context analyzer. Analyze the following business answers and extract structured insights.

User Input:
- Business Overview: ${answers.overview || 'Not provided'}
- Target Market: ${answers.market || 'Not provided'}
- Problem: ${answers.problem || 'Not provided'}
- Solution: ${answers.solution || 'Not provided'}
- Marketing Channels: ${answers.channels || 'Not provided'}
- Pricing & Costs: ${answers.pricing || 'Not provided'}
- Goals & Timeline: ${answers.goals || 'Not provided'}

Stage: ${stage || 'Not specified'}
Region: ${region || 'Global'}

Analyze this information and return a JSON object with the following structure:
{
  "businessConcept": {
    "coreIdea": "One clear sentence describing what they're building",
    "industry": "Primary industry/sector",
    "businessModel": "How they make money (B2B, B2C, marketplace, etc.)"
  },
  "targetCustomer": {
    "demographics": "Age, income, location, job title, etc.",
    "psychographics": "Values, motivations, behaviors, pain points",
    "currentBehavior": "How they currently solve this problem"
  },
  "problemSolution": {
    "painPoint": "The core problem being solved",
    "currentSolutions": "How people handle this today",
    "uniqueValue": "What makes this solution different/better"
  },
  "marketApproach": {
    "channels": ["list", "of", "marketing", "channels"],
    "positioning": "How they want to be perceived",
    "pricing": "Pricing strategy and key numbers"
  },
  "executionPlan": {
    "timeline": "Key timeline and milestones",
    "resources": "Budget, team, time availability",
    "milestones": ["key", "milestones", "list"]
  },
  "contextQuality": "high|medium|low - based on specificity and completeness",
  "missingElements": ["list", "of", "missing", "or", "vague", "elements"],
  "suggestedFollowUps": ["specific", "questions", "to", "improve", "context"]
}

Focus on extracting concrete, actionable insights. If information is missing or vague, note it in missingElements and suggest specific follow-up questions.
Return only valid JSON, no additional text.`;

    // Use model router
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-model-router`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert business analyst who extracts structured insights from startup descriptions. Always respond with valid JSON only.' 
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        user_id: userId,
        function_name: 'bizmap-refine',
        cache_key: cacheKey
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Model router error:', errorText);
      throw new Error(`Model router error: ${response.status}`);
    }

    const data = await response.json();
    const refinedContext = JSON.parse(data.content);

    console.log('Context refinement completed, quality:', refinedContext.contextQuality);

    return new Response(
      JSON.stringify({
        success: true,
        refinedContext
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in bizmap-refine function:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function hashInput(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}