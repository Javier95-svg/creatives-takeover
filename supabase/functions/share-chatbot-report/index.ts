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

    // Generate AI-enhanced summary using Lovable AI
    let aiSummary = content;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY) {
      try {
        // Extract structured data from reportData
        const extractedContent = reportData?.extractedContent || {};
        const businessContext = reportData?.industry ? reportData : {};
        const keyPoints = extractedContent.keyPoints || [];
        const messageTypes = extractedContent.messageTypes || [];
        
        // Build context-rich prompt for AI
        const contextInfo = [
          businessContext.industry ? `Industry: ${businessContext.industry}` : '',
          businessContext.stage ? `Stage: ${businessContext.stage}` : '',
          businessContext.targetMarket ? `Target Market: ${businessContext.targetMarket}` : '',
          keyPoints.length > 0 ? `Key Points:\n${keyPoints.map((p: string) => `- ${p}`).join('\n')}` : '',
        ].filter(Boolean).join('\n');

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
                content: `You are an expert business advisor helping entrepreneurs share their business plans with a community for feedback. Create an engaging, well-structured summary that:

1. Opens with a compelling hook about the business opportunity
2. Highlights what makes this business unique or differentiated
3. Identifies 2-3 key opportunities or strengths
4. Mentions main challenges or areas needing validation
5. Ends with a clear call for specific feedback areas

Keep it professional yet conversational. Use 3-4 concise paragraphs. Make it scannable and engaging for community members who want to provide valuable feedback.`,
              },
              {
                role: 'user',
                content: `Create an engaging community post summary for this business analysis:

${contextInfo}

Main Analysis:
${content.substring(0, 2000)}

Feedback Categories Requested: ${feedbackCategories?.join(', ') || 'General feedback'}`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData.choices[0]?.message?.content || content;
          console.log('AI summary generated successfully');
        } else {
          console.error('AI summarization failed:', aiResponse.status, await aiResponse.text());
        }
      } catch (error) {
        console.error('Error generating AI summary:', error);
        // Fallback to first 600 chars if AI fails
        aiSummary = content.substring(0, 600) + (content.length > 600 ? '...' : '');
      }
    } else {
      // No AI key, use smart truncation
      aiSummary = content.substring(0, 600) + (content.length > 600 ? '...' : '');
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
