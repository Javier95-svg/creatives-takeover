import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      session_id, 
      business_idea, 
      industry, 
      start_date, 
      user_experience_level,
      wizard_answers 
    } = await req.json();

    console.log('Generating roadmap for:', { business_idea, industry, start_date, hasWizardAnswers: !!wizard_answers });

    // Authenticate user
    const user = await getUserFromAuth(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check and deduct credits before processing
    const creditCost = CREDIT_COSTS.ROADMAP_GENERATION;
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      'Roadmap Generation',
      session_id,
      { business_idea, industry, user_experience_level }
    );

    if (!creditCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: creditCheck.error || 'Insufficient credits',
          required: creditCost
        }),
        { 
          status: creditCheck.errorCode === 'INSUFFICIENT_CREDITS' ? 402 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Calculate target launch date (30 days from start)
    const startDateObj = new Date(start_date);
    const targetLaunchDate = new Date(startDateObj);
    targetLaunchDate.setDate(targetLaunchDate.getDate() + 30);

    // Build personalized prompt using wizard answers
    const contextualPrompt = wizard_answers ? `
PERSONALIZED BUSINESS CONTEXT (use these exact details in all tasks):

Business Concept & Problem (Days 1-2): ${wizard_answers.overview || business_idea}
Target Customer Profile (Days 3-4): ${wizard_answers.market || 'Not specified'}
Week 1 Validation Plan (Days 5-7): ${wizard_answers.problem || 'Market validation needed'}
MVP Design & Features (Days 8-14): ${wizard_answers.solution || 'MVP to be defined'}
Week 3 Launch Channels (Days 15-21): ${wizard_answers.channels || 'Launch channels TBD'}
Pricing Model (Days 22-25): ${wizard_answers.pricing || 'Pricing strategy needed'}
Day 30 Success Goals (Days 26-30): ${wizard_answers.goals || 'Define success metrics'}

CRITICAL: Every task MUST reference the user's specific inputs above. Don't use generic examples.
` : '';

    // Generate tasks using AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Create a highly personalized 30-day launch roadmap for this specific business:

${contextualPrompt}

Industry: ${industry}
Experience Level: ${user_experience_level}
Start Date: ${start_date}

Generate 30 days of PERSONALIZED, actionable tasks divided into 4 weeks:

WEEK 1 (Days 1-7): VALIDATE
- Days 1-2: Research and validate "${wizard_answers?.overview || business_idea}"
- Days 3-4: Find and interview "${wizard_answers?.market || 'target customers'}"
- Days 5-7: Execute validation plan: "${wizard_answers?.problem || 'validation activities'}"
- Goal: Confirm demand exists for this specific solution

WEEK 2 (Days 8-14): BUILD MVP
- Build specifically: "${wizard_answers?.solution || 'MVP features'}"
- Keep it minimal - only core features
- Create landing page with value prop for "${wizard_answers?.market || 'target audience'}"
- Goal: Working prototype that solves the validated problem

WEEK 3 (Days 15-21): LAUNCH
- Launch on these channels: "${wizard_answers?.channels || 'primary channels'}"
- Get first users from "${wizard_answers?.market || 'target customer segments'}"
- Implement early access strategy
- Goal: First real users testing the product

WEEK 4 (Days 22-30): FIRST CUSTOMER
- Set up pricing: "${wizard_answers?.pricing || 'pricing model'}"
- Sales outreach to validated leads
- Conversion optimization
- Goal: ${wizard_answers?.goals || 'First paying customer'}

TASK REQUIREMENTS:
- Reference specific user inputs (their problem, customers, MVP features, channels, pricing)
- 3-5 tasks per day
- Realistic hours (2-6 hours each)
- Priority: critical/high/medium/low
- Clear success criteria that builds toward their stated Day 30 goal

Make this feel like THEIR roadmap, not a generic template.`
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_roadmap',
            parameters: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      day_number: { type: 'number', minimum: 1, maximum: 30 },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                      estimated_hours: { type: 'number' },
                      ai_reasoning: { type: 'string' }
                    },
                    required: ['day_number', 'title', 'priority', 'estimated_hours']
                  }
                }
              },
              required: ['tasks']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_roadmap' } }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tasks generated');

    const tasksData = JSON.parse(toolCall.function.arguments);

    // Create roadmap
    const { data: roadmap, error: roadmapError } = await supabase
      .from('launch_roadmaps')
      .insert({
        user_id: user.id,
        session_id,
        business_idea,
        start_date,
        target_launch_date: targetLaunchDate.toISOString().split('T')[0],
        total_tasks: tasksData.tasks.length,
        status: 'active',
      })
      .select()
      .single();

    if (roadmapError) throw roadmapError;

    // Create tasks
    const tasks = tasksData.tasks.map((task: any) => ({
      roadmap_id: roadmap.id,
      user_id: user.id,
      title: task.title,
      description: task.description || null,
      week_number: Math.ceil(task.day_number / 7),
      day_number: task.day_number,
      priority: task.priority,
      estimated_hours: task.estimated_hours,
      due_date: new Date(startDateObj.getTime() + (task.day_number - 1) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0],
      ai_generated: true,
      ai_reasoning: task.ai_reasoning || null,
      status: 'todo',
    }));

    const { data: createdTasks, error: tasksError } = await supabase
      .from('roadmap_tasks')
      .insert(tasks)
      .select();

    if (tasksError) throw tasksError;

    console.log('Roadmap created with', createdTasks?.length, 'tasks');

    return new Response(
      JSON.stringify({
        success: true,
        roadmap,
        tasks: createdTasks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
