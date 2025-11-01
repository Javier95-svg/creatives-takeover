import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, business_idea, industry, start_date, user_experience_level } = await req.json();

    console.log('Generating roadmap for:', { business_idea, industry, start_date });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    
    if (!user) throw new Error('Authentication required');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Calculate target launch date (30 days from start)
    const startDateObj = new Date(start_date);
    const targetLaunchDate = new Date(startDateObj);
    targetLaunchDate.setDate(targetLaunchDate.getDate() + 30);

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
          content: `Create a detailed 30-day launch roadmap for this business:

Business Idea: ${business_idea}
Industry: ${industry}
Experience Level: ${user_experience_level}
Start Date: ${start_date}

Generate 30 days of actionable tasks divided into 4 weeks:
- Week 1 (Days 1-7): VALIDATE - Market research, customer interviews, competitor analysis
- Week 2 (Days 8-14): BUILD MVP - Core features, basic product, landing page
- Week 3 (Days 15-21): LAUNCH - Marketing, early access, first users
- Week 4 (Days 22-30): FIRST CUSTOMER - Sales, outreach, conversion

Each task should:
- Be specific and actionable
- Have realistic estimated hours (2-6 hours)
- Include priority level
- Have clear success criteria
- Build toward getting the first paying customer

Generate 3-5 tasks per day focusing on speed and momentum.`
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
