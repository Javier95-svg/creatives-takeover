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
    const { session_id, community_post_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    if (!user) throw new Error('Authentication required');

    // Fetch community post with comments
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('*, upvotes, downvotes, comment_count')
      .eq('id', community_post_id)
      .single();

    if (postError) throw postError;

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from('post_comments')
      .select('content')
      .eq('post_id', community_post_id);

    if (commentsError) throw commentsError;

    // Analyze feedback with AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const commentsText = comments?.map(c => c.content).join('\n\n') || 'No comments yet';

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
          content: `Analyze this community feedback on a business idea:

Post Content: ${post.content}
Upvotes: ${post.upvotes}
Downvotes: ${post.downvotes}
Comments: ${commentsText}

Provide sentiment analysis and actionable insights.`
        }],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_feedback',
            parameters: {
              type: 'object',
              properties: {
                overall_sentiment: {
                  type: 'string',
                  enum: ['positive', 'neutral', 'negative', 'mixed']
                },
                positive_percentage: { type: 'number', minimum: 0, maximum: 100 },
                negative_percentage: { type: 'number', minimum: 0, maximum: 100 },
                key_suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Top 3-5 actionable suggestions from community'
                },
                common_concerns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Main concerns or criticisms raised'
                },
                validation_score_adjustment: {
                  type: 'number',
                  description: 'Suggested adjustment to validation score based on feedback (-10 to +10)',
                  minimum: -10,
                  maximum: 10
                }
              },
              required: ['overall_sentiment', 'positive_percentage', 'negative_percentage']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_feedback' } }
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0]?.message?.tool_calls?.[0]?.function?.arguments || '{}');

    // Calculate community score (0-100)
    const netVotes = post.upvotes - post.downvotes;
    const engagementScore = (post.upvotes * 2) + (post.comment_count * 3);
    const communityScore = Math.min(100, Math.max(0, (engagementScore / (engagementScore + 10)) * 100));

    // Store feedback analysis
    const { data: feedback, error: feedbackError } = await supabase
      .from('bizmap_community_feedback')
      .insert({
        session_id,
        community_post_id,
        user_id: user.id,
        total_upvotes: post.upvotes,
        total_downvotes: post.downvotes,
        total_comments: post.comment_count,
        community_score: Math.round(communityScore * 100) / 100,
        sentiment_analysis: {
          overall_sentiment: analysis.overall_sentiment,
          positive_percentage: analysis.positive_percentage,
          negative_percentage: analysis.negative_percentage,
        },
        key_suggestions: analysis.key_suggestions || [],
        common_concerns: analysis.common_concerns || [],
        validation_adjustments: {
          score_delta: analysis.validation_score_adjustment || 0,
        },
        validation_score_delta: analysis.validation_score_adjustment || 0,
      })
      .select()
      .single();

    if (feedbackError) throw feedbackError;

    // Update validation score if adjustment warranted
    if (analysis.validation_score_adjustment && Math.abs(analysis.validation_score_adjustment) >= 5) {
      const { error: updateError } = await supabase
        .from('market_validation_scores')
        .update({
          overall_validation_score: supabase.rpc('GREATEST', [
            0,
            supabase.rpc('LEAST', [100, 'overall_validation_score + ' + analysis.validation_score_adjustment])
          ])
        })
        .eq('session_id', session_id);

      if (updateError) console.error('Error updating validation score:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
        community_score: communityScore,
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
