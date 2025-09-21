import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Sprint task generator called');
    const body = await req.json();
    console.log('Request body:', body);
    
    const { fuzzyIdea, sprintTitle, sprintDuration } = body;

    if (!fuzzyIdea || !sprintTitle) {
      console.error('Missing required fields:', { fuzzyIdea: !!fuzzyIdea, sprintTitle: !!sprintTitle });
      return new Response(JSON.stringify({ error: 'Missing required fields: fuzzyIdea and sprintTitle are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Making OpenAI API call...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a sprint planning expert. Convert fuzzy ideas into actionable, time-boxed tasks for a ${sprintDuration}-day sprint. Each task should be 2-4 hours max. Return JSON with "tasks" array containing objects with: title (specific action), description (brief details), estimated_hours (0.5-4.0), priority (urgent/high/medium/low), tags (array of relevant keywords).`
          },
          {
            role: 'user',
            content: `Sprint: "${sprintTitle}"\n\nIdea: ${fuzzyIdea}\n\nBreak this into ${Math.max(6, Math.min(20, sprintDuration))} specific, actionable tasks that can be completed in ${sprintDuration} days.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response data:', data);
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in OpenAI response');
      throw new Error('No content received from OpenAI');
    }
    
    let tasks;
    try {
      console.log('Parsing OpenAI response:', content);
      const parsed = JSON.parse(content);
      tasks = parsed.tasks || [];
      console.log('Parsed tasks:', tasks);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Using fallback tasks');
      // Fallback parsing if JSON is malformed
      tasks = [
        { title: "Plan project structure", description: "Define project architecture and requirements", estimated_hours: 2.0, priority: "high", tags: ["planning"] },
        { title: "Set up development environment", description: "Install tools and configure workspace", estimated_hours: 1.5, priority: "high", tags: ["setup"] },
        { title: "Create MVP wireframes", description: "Design basic user interface layouts", estimated_hours: 3.0, priority: "medium", tags: ["design"] },
        { title: "Build core functionality", description: "Implement main features", estimated_hours: 4.0, priority: "high", tags: ["development"] },
        { title: "Test and refine", description: "Debug and improve user experience", estimated_hours: 2.5, priority: "medium", tags: ["testing"] }
      ];
    }

    console.log('Returning tasks:', tasks);
    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sprint task generator error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check the edge function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});