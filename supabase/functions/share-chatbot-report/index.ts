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

    const {
      conversationId,
      reportType,
      reportData,
      title,
      content,
      feedbackCategories,
      isAnonymous,
      tags,
      location,
    } = await req.json();

    console.log('Sharing report to community:', { userId: user.id, reportType, conversationId });

    // Generate AI summary if using Lovable AI
    let aiSummary = content;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY && content.length > 200) {
      try {
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
                content: 'You are a helpful assistant that summarizes business plans and reports. Create a concise, engaging summary that highlights key points and makes the post attractive to community members.',
              },
              {
                role: 'user',
                content: `Summarize this business report in 2-3 sentences:\n\n${content}`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData.choices[0]?.message?.content || content;
        }
      } catch (error) {
        console.error('Error generating AI summary:', error);
      }
    }

    // Create community post
    const { data: post, error: postError } = await supabaseClient
      .from('community_posts')
      .insert({
        user_id: user.id,
        title,
        content: aiSummary,
        tags: tags || [],
        location,
        source_type: 'chatbot_report',
        source_data: {
          report_type: reportType,
          conversation_id: conversationId,
          original_content: content,
        },
        feedback_requested: true,
        feedback_category: feedbackCategories,
      })
      .select()
      .single();

    if (postError) throw postError;

    // Create shared report record
    const { data: sharedReport, error: sharedError } = await supabaseClient
      .from('chatbot_shared_reports')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        community_post_id: post.id,
        report_type: reportType,
        report_data: reportData,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (sharedError) throw sharedError;

    console.log('Successfully shared to community:', { postId: post.id, sharedReportId: sharedReport.id });

    return new Response(
      JSON.stringify({
        success: true,
        post,
        sharedReport,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in share-chatbot-report:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
