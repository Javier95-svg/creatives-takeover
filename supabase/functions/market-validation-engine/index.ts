import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from '../_shared/credit-deduction.ts';
import { CREDIT_COSTS } from '../_shared/credit-constants.ts';
import { resolveCreditIdempotencyKey } from '../_shared/request-idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

// Reddit API Configuration
const REDDIT_SUBREDDITS = ['Entrepreneur', 'SaaS', 'startups', 'indiebiz', 'smallbusiness', 'entrepreneurship'];
const REDDIT_USER_AGENT = 'BizMapAI/1.0 (Idea Validation Tool)';

// Reddit Discussion Interface
interface RedditDiscussion {
  title: string;
  content: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  url: string;
  created_utc: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevance_score: number;
  author?: string;
  post_id?: string;
}

// Query Reddit for discussions matching the business idea
async function queryRedditSubreddits(
  businessIdea: string, 
  keywords: string[], 
  subreddits: string[] = REDDIT_SUBREDDITS
): Promise<RedditDiscussion[]> {
  const discussions: RedditDiscussion[] = [];
  
  // Extract key terms from business idea
  const searchTerms = keywords.length > 0 ? keywords.join(' OR ') : businessIdea.split(' ').slice(0, 5).join(' ');
  
  console.log(`🔍 Searching Reddit for: "${searchTerms}"`);
  
  // Query each subreddit in parallel
  const searchPromises = subreddits.map(async (subreddit) => {
    try {
      // Use Reddit JSON API (no auth required, but rate-limited)
      const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchTerms)}&limit=10&sort=relevance&restrict_sr=1`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': REDDIT_USER_AGENT
        }
      });
      
      if (!response.ok) {
        console.warn(`Reddit API error for r/${subreddit}: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        return [];
      }
      
      // Transform Reddit posts into our format
      const posts = data.data.children
        .filter((item: any) => item.data && item.data.title)
        .slice(0, 5) // Limit to top 5 per subreddit
        .map((item: any) => {
          const post = item.data;
          return {
            title: post.title,
            content: post.selftext || post.title,
            subreddit: subreddit,
            upvotes: post.ups || 0,
            comments: post.num_comments || 0,
            url: `https://www.reddit.com${post.permalink}`,
            created_utc: post.created_utc || Date.now() / 1000,
            sentiment: 'neutral' as const, // Will be analyzed later
            relevance_score: 50, // Will be calculated later
            author: post.author,
            post_id: post.id
          };
        });
      
      console.log(`✅ Found ${posts.length} posts in r/${subreddit}`);
      return posts;
    } catch (error) {
      console.error(`Error querying r/${subreddit}:`, error);
      return [];
    }
  });
  
  const results = await Promise.all(searchPromises);
  const allPosts = results.flat();
  
  // Rate limit: Add delay between requests to avoid hitting limits
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return allPosts;
}

// Analyze sentiment and calculate relevance score using AI
async function analyzeRedditSentiment(
  posts: any[], 
  businessIdea: string,
  lovableApiKey: string
): Promise<RedditDiscussion[]> {
  if (posts.length === 0) return [];
  
  console.log(`🤖 Analyzing sentiment for ${posts.length} Reddit posts...`);
  
  try {
    // Use AI to analyze sentiment and relevance
    const analysisPrompt = `Analyze the following Reddit posts and determine:
1. Sentiment (positive, neutral, negative) - positive means the post shows demand/problems that need solving, negative means competition/oversaturated market
2. Relevance score (0-100) - how relevant is this discussion to the business idea

Business Idea: ${businessIdea}

Posts to analyze:
${posts.slice(0, 20).map((post, idx) => `${idx + 1}. Title: ${post.title}\n   Content: ${post.content.substring(0, 200)}...\n   Subreddit: r/${post.subreddit}`).join('\n\n')}

Return JSON array with format:
[
  {
    "index": 1,
    "sentiment": "positive" | "neutral" | "negative",
    "relevance_score": 0-100,
    "reasoning": "brief explanation"
  },
  ...
]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });
    
    if (!aiResponse.ok) {
      console.warn('AI sentiment analysis failed, using default values');
      return posts.map(post => ({
        ...post,
        sentiment: 'neutral' as const,
        relevance_score: 50
      }));
    }
    
    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0]?.message?.content || '';
    
    // Try to extract JSON from response
    let analysisResults: any[] = [];
    try {
      const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        analysisResults = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse AI analysis, using defaults');
    }
    
    // Apply analysis results to posts
    return posts.map((post, idx) => {
      const analysis = analysisResults.find((a: any) => a.index === idx + 1);
      return {
        ...post,
        sentiment: analysis?.sentiment || 'neutral',
        relevance_score: analysis?.relevance_score || 50
      };
    }).filter(post => post.relevance_score >= 30); // Filter out low-relevance posts
    
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    return posts.map(post => ({
      ...post,
      sentiment: 'neutral' as const,
      relevance_score: 50
    }));
  }
}

// Extract market insights from Reddit data
function extractMarketInsights(redditData: RedditDiscussion[]): {
  customerNeeds: string[];
  painPoints: string[];
  demandSignals: string[];
  competitionSignals: string[];
} {
  const insights = {
    customerNeeds: [] as string[],
    painPoints: [] as string[],
    demandSignals: [] as string[],
    competitionSignals: [] as string[]
  };
  
  // Analyze positive sentiment posts for demand signals
  const positivePosts = redditData.filter(p => p.sentiment === 'positive' && p.relevance_score >= 60);
  positivePosts.forEach(post => {
    insights.demandSignals.push(`${post.title} (r/${post.subreddit}, ${post.upvotes} upvotes)`);
  });
  
  // Analyze all posts for pain points (posts asking questions, complaining, seeking solutions)
  const highEngagementPosts = redditData
    .filter(p => p.comments > 5 || p.upvotes > 10)
    .sort((a, b) => (b.comments + b.upvotes) - (a.comments + a.upvotes))
    .slice(0, 10);
  
  highEngagementPosts.forEach(post => {
    if (post.content.toLowerCase().includes('problem') || 
        post.content.toLowerCase().includes('issue') ||
        post.content.toLowerCase().includes('need') ||
        post.title.includes('?')) {
      insights.painPoints.push(post.title);
    }
  });
  
  return insights;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_idea, industry, target_market, session_id } = await req.json();

    console.log('Starting market validation for:', { business_idea, industry, target_market });

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Credit cost defined outside the AI-processing block for refund availability
    const creditCost = CREDIT_COSTS.MARKET_VALIDATION;

    const idempotencyKey = await resolveCreditIdempotencyKey(req, {
      userId: user.id,
      feature: 'Market Validation',
      sessionId: session_id,
      requestFingerprint: { business_idea, industry, target_market },
    });

    // Check and deduct credits before processing
    const creditCheck = await checkAndDeductCredits(
      user.id,
      creditCost,
      'Market Validation',
      session_id,
      { business_idea, industry, target_market, idempotencyKey }
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

    // Use Lovable AI to analyze market potential
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Query Reddit for relevant discussions (runs in parallel with AI analysis)
    console.log('🔍 Starting Reddit search for market validation...');
    const keywords = [
      ...(business_idea.split(' ').slice(0, 10)),
      ...(target_market ? target_market.split(' ') : []),
      ...(industry ? [industry] : [])
    ].filter((kw, idx, arr) => arr.indexOf(kw) === idx && kw.length > 3); // Remove duplicates and short words
    
    let redditDiscussions: RedditDiscussion[] = [];
    try {
      const rawRedditPosts = await queryRedditSubreddits(business_idea, keywords);
      redditDiscussions = await analyzeRedditSentiment(rawRedditPosts, business_idea, LOVABLE_API_KEY);
      console.log(`✅ Found ${redditDiscussions.length} relevant Reddit discussions`);
    } catch (error) {
      console.error('Reddit query failed, continuing with AI-only validation:', error);
      // Continue without Reddit data - not critical for validation
    }
    
    // Extract market insights from Reddit
    const redditInsights = redditDiscussions.length > 0
      ? extractMarketInsights(redditDiscussions)
      : { customerNeeds: [], painPoints: [], demandSignals: [], competitionSignals: [] };

    // Wrap AI processing in try/catch for credit refund on failure
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
            content: `You are a market validation expert and customer research analyst. Analyze business ideas and provide comprehensive validation scores and customer insights.
            
Your job is to:
1. Assess market size potential (0-100)
2. Evaluate competition intensity (0-100, higher = more competitive)
3. Analyze demand strength (0-100)
4. Identify top 3-5 competitors with their strengths/weaknesses
5. Find differentiation opportunities
6. Analyze customer needs, requirements, and pain points
7. Identify key buying factors for customers
8. Segment target customers and their specific needs
9. Calculate overall validation score (weighted average)

Be realistic and data-driven. Consider:
- Market saturation
- Entry barriers
- Customer acquisition difficulty
- Revenue potential
- Execution complexity
- What customers actually need (not just what they say they want)
- Real pain points customers face with current solutions
- Requirements customers have when evaluating solutions
- What influences customer purchase decisions`
          },
          {
            role: 'user',
            content: `Validate this business idea:

Business Idea: ${business_idea}
Industry: ${industry}
Target Market: ${target_market}

${redditDiscussions.length > 0 ? `\nREAL MARKET DATA FROM REDDIT DISCUSSIONS:\n` +
`Found ${redditDiscussions.length} relevant discussions from Reddit communities.\n\n` +
`Demand Signals (${redditInsights.demandSignals.length}):\n${redditInsights.demandSignals.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
`Pain Points Identified (${redditInsights.painPoints.length}):\n${redditInsights.painPoints.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
`Top Relevant Reddit Posts:\n${redditDiscussions.slice(0, 5).map((p, i) => `${i + 1}. "${p.title}" (r/${p.subreddit}, ${p.upvotes} upvotes, ${p.comments} comments, sentiment: ${p.sentiment})`).join('\n')}\n\n` +
`Use this real community data to inform your analysis of customer needs, pain points, and demand strength. ` +
`Positive sentiment posts indicate demand/problems seeking solutions. High engagement (upvotes/comments) indicates strong interest.\n` : ''}

Provide a comprehensive market validation analysis.`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'validate_market',
            description: 'Return market validation scores and analysis',
            parameters: {
              type: 'object',
              properties: {
                market_size_score: {
                  type: 'number',
                  description: 'Market size potential score 0-100',
                  minimum: 0,
                  maximum: 100
                },
                competition_score: {
                  type: 'number',
                  description: 'Competition intensity 0-100 (higher = more competition)',
                  minimum: 0,
                  maximum: 100
                },
                demand_score: {
                  type: 'number',
                  description: 'Market demand strength 0-100',
                  minimum: 0,
                  maximum: 100
                },
                estimated_market_size_usd: {
                  type: 'number',
                  description: 'Estimated total addressable market in USD'
                },
                competitor_count: {
                  type: 'number',
                  description: 'Number of direct competitors'
                },
                top_competitors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      strengths: { type: 'array', items: { type: 'string' } },
                      weaknesses: { type: 'array', items: { type: 'string' } }
                    }
                  }
                },
                differentiation_opportunities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key opportunities to differentiate'
                },
                competitor_gaps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      gap_description: { type: 'string' },
                      opportunity_score: { type: 'number', minimum: 0, maximum: 100 }
                    }
                  }
                },
                confidence_level: {
                  type: 'string',
                  enum: ['low', 'medium', 'high']
                },
                customer_needs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Primary needs customers have in this niche (3-5 key needs)'
                },
                customer_requirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key requirements customers have when evaluating solutions (3-5 requirements)'
                },
                pain_points: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      point: { type: 'string', description: 'Description of the pain point' },
                      severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How severe this pain point is for customers' }
                    },
                    required: ['point', 'severity']
                  },
                  description: 'Specific pain points customers face with current solutions (3-5 pain points)'
                },
                buying_factors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      factor: { type: 'string', description: 'Factor that influences purchase decisions' },
                      importance: { type: 'number', minimum: 0, maximum: 100, description: 'Importance score 0-100' }
                    },
                    required: ['factor', 'importance']
                  },
                  description: 'What influences customer purchase decisions (3-5 factors)'
                },
                customer_segments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      segment: { type: 'string', description: 'Customer segment name' },
                      needs: { type: 'array', items: { type: 'string' }, description: 'Specific needs for this segment' },
                      size: { type: 'string', description: 'Estimated segment size (e.g., small, medium, large)' }
                    },
                    required: ['segment', 'needs']
                  },
                  description: 'Different customer segments with their specific needs (2-3 segments)'
                }
              },
              required: ['market_size_score', 'competition_score', 'demand_score', 'confidence_level', 'customer_needs', 'customer_requirements', 'pain_points', 'buying_factors']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'validate_market' } },
        // gemini-2.5-flash is a reasoning model: without an explicit output
        // budget it spends the default allotment on reasoning tokens and returns
        // an empty tool_calls array, which was failing this call 100% of the
        // time. The validate_market schema is large, so give it ample room.
        max_tokens: 4000
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI API error:', error);
      throw new Error(`AI API error: ${aiResponse.status} ${error?.slice(0, 300) ?? ''}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Capture WHY there's no tool call (finish_reason/content) so any future
      // failure records the real reason instead of a generic message.
      const finishReason = aiData?.choices?.[0]?.finish_reason ?? 'unknown';
      const snippet = (aiData?.choices?.[0]?.message?.content ?? '').toString().slice(0, 300);
      throw new Error(`No validation data returned from AI (finish_reason=${finishReason}) ${snippet}`);
    }

    const validationData = JSON.parse(toolCall.function.arguments);

    // Calculate overall validation score (weighted average)
    const overall_score = (
      (validationData.market_size_score * 0.35) +
      ((100 - validationData.competition_score) * 0.30) + // Invert competition - lower is better
      (validationData.demand_score * 0.35)
    );

    // Prepare customer needs data
    const customerNeedsData = {
      primary_needs: validationData.customer_needs || [],
      key_requirements: validationData.customer_requirements || [],
      pain_points: validationData.pain_points || [],
      buying_factors: validationData.buying_factors || [],
      customer_segments: validationData.customer_segments || []
    };

    // Store validation in database
    const { data: validationScore, error: dbError } = await supabase
      .from('market_validation_scores')
      .insert({
        user_id: user.id,
        session_id: session_id,
        business_idea,
        industry,
        target_market,
        market_size_score: validationData.market_size_score,
        competition_score: validationData.competition_score,
        demand_score: validationData.demand_score,
        overall_validation_score: Math.round(overall_score * 100) / 100,
        estimated_market_size_usd: validationData.estimated_market_size_usd || null,
        competitor_count: validationData.competitor_count || 0,
        top_competitors: validationData.top_competitors || [],
        competitor_gaps: validationData.competitor_gaps || [],
        differentiation_opportunities: validationData.differentiation_opportunities || [],
        customer_needs_data: customerNeedsData,
        reddit_discussions: redditDiscussions.length > 0 ? redditDiscussions : [],
        confidence_level: redditDiscussions.length > 0 ? 'high' : validationData.confidence_level,
        data_sources: [
          { name: 'AI Analysis', type: 'ai_inference', reliability_score: 75 },
          ...(redditDiscussions.length > 0 ? [{ name: 'Reddit Communities', type: 'api', reliability_score: 85, url: 'https://www.reddit.com' }] : [])
        ]
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Validation complete:', { overall_score: Math.round(overall_score) });

    return new Response(
      JSON.stringify({
        success: true,
        validation_score: validationScore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    } catch (aiError) {
      const err = aiError instanceof Error ? aiError : new Error(String(aiError));
      await refundCredits(user.id, creditCost, 'Market Validation', 'Refund: AI processing failed', { error: err.message });
      throw aiError;
    }

  } catch (error) {
    console.error('Error in market-validation-engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
