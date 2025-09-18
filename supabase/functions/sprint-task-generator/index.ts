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
    const { fuzzyIdea, sprintTitle, sprintDuration } = await req.json();

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

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let tasks;
    try {
      const parsed = JSON.parse(content);
      tasks = parsed.tasks || [];
    } catch {
      // Fallback parsing if JSON is malformed
      tasks = [
        { title: "Plan project structure", description: "Define project architecture and requirements", estimated_hours: 2.0, priority: "high", tags: ["planning"] },
        { title: "Set up development environment", description: "Install tools and configure workspace", estimated_hours: 1.5, priority: "high", tags: ["setup"] },
        { title: "Create MVP wireframes", description: "Design basic user interface layouts", estimated_hours: 3.0, priority: "medium", tags: ["design"] },
        { title: "Build core functionality", description: "Implement main features", estimated_hours: 4.0, priority: "high", tags: ["development"] },
        { title: "Test and refine", description: "Debug and improve user experience", estimated_hours: 2.5, priority: "medium", tags: ["testing"] }
      ];
    }

    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});