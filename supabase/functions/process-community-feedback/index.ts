import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { postId } = await req.json();

    console.log('Processing feedback for post:', postId);

    // Fetch all comments for the post
    const { data: comments, error: commentsError } = await supabaseClient
      .from('post_comments')
      .select('content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    if (!comments || comments.length === 0) {
      return new Response(
        JSON.stringify({
          summary: 'No feedback received yet',
          actionItems: [],
          totalComments: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to analyze feedback
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      // Fallback: basic summary without AI
      return new Response(
        JSON.stringify({
          summary: `Received ${comments.length} comments from the community`,
          actionItems: comments.slice(0, 5).map(c => c.content.substring(0, 100)),
          totalComments: comments.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const feedbackText = comments.map((c, i) => `${i + 1}. ${c.content}`).join('\n\n');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a business consultant analyzing community feedback. Extract key insights, common themes, and actionable recommendations from the feedback provided.',
          },
          {
            role: 'user',
            content: `Analyze this community feedback and provide:\n1. A brief summary (2-3 sentences)\n2. Top 5 actionable recommendations\n\nFeedback:\n${feedbackText}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI processing failed');
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0]?.message?.content || '';

    // Parse the AI response to extract summary and action items
    const lines = analysisText.split('\n').filter(line => line.trim());
    const summary = lines.slice(0, 3).join(' ');
    const actionItems = lines
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 5);

    console.log('Feedback processed successfully:', { totalComments: comments.length, actionItems: actionItems.length });

    return new Response(
      JSON.stringify({
        summary,
        actionItems,
        totalComments: comments.length,
        rawAnalysis: analysisText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-community-feedback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
