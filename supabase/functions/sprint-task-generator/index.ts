import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';
import { generateJsonText } from '../_shared/json-generation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
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

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'Sprint Task Generation',
      requestFingerprint: {
        sprintTitle,
        sprintDuration,
        fuzzyIdea,
      },
    });

    // Check and deduct credits before processing
    const creditCost = CREDIT_COSTS.SPRINT_TASK_GENERATION;
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      'Sprint Task Generation',
      undefined,
      { sprintTitle, sprintDuration, idempotencyKey }
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

    // Shared provider chain since 2026-11-16 (OpenAI alone had no credit from Nov 12).
    // A failure here refunds the credits below.
    try {
      const { text: content } = await generateJsonText({
        label: 'sprint-task-generator',
        feature: 'SPRINT_TASK_GENERATION',
        openaiModel: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000,
        timeoutMs: 45_000,
        system: `You are a sprint planning expert. Convert fuzzy ideas into actionable, time-boxed tasks for a ${sprintDuration}-day sprint. Each task should be 2-4 hours max. Return JSON with "tasks" array containing objects with: title (specific action), description (brief details), estimated_hours (0.5-4.0), priority (urgent/high/medium/low), tags (array of relevant keywords).`,
        prompt: `Sprint: "${sprintTitle}"\n\nIdea: ${fuzzyIdea}\n\nBreak this into ${Math.max(6, Math.min(20, sprintDuration))} specific, actionable tasks that can be completed in ${sprintDuration} days.`,
      });

      let tasks;
      try {
        const parsed = JSON.parse(content);
        tasks = parsed.tasks || [];
      } catch (parseError) {
        console.error('Failed to parse the AI response:', parseError);
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
    } catch (err) {
      console.error('AI processing failed, refunding credits:', err);
      await refundCredits(user.id, creditCost, 'Sprint Task Generation', 'Refund: AI processing failed', { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
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
