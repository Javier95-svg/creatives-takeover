import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('🔧 Initializing environment variables...');
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('🔍 Environment check:', {
  hasPerplexityKey: !!perplexityApiKey,
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  perplexityKeyLength: perplexityApiKey?.length || 0
});

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting article discovery...');
    
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Insighta's popular topics for article discovery
    const insightaTopics = [
      'AI productivity tools for entrepreneurs',
      'no-code MVP development strategies', 
      'growth hacking techniques for startups',
      'creative marketing strategies 2024',
      'startup validation methods',
      'business automation tools',
      'solopreneur business models',
      'innovation leadership strategies'
    ];

    console.log('📰 Searching for articles on topics:', insightaTopics.slice(0, 4));

    // Generate article searches for each topic with model fallback
    const articlePromises = insightaTopics.slice(0, 4).map(async (topic: string) => {
      const prompt = `Find 2-3 recent high-quality articles about "${topic}" published in the last 2 weeks. Focus on:

- Articles from reputable business, tech, or entrepreneurship publications
- Actionable insights for entrepreneurs and business builders  
- Recent developments and practical strategies
- Include the article URL, title, publication source, author if available
- Brief summary highlighting key insights

Please provide structured data with:
ARTICLE 1:
- Title: [exact article title]
- URL: [direct link to article]  
- Source: [publication name]
- Author: [author name if available]
- Published: [publication date if available]
- Summary: [2-3 sentence summary of key insights]

ARTICLE 2: [same format]

Focus on finding actual published articles with real URLs, not generating hypothetical content.`;

      // Try models in order of preference
      const models = [
        'sonar-small-online',
        'sonar-large-online', 
        'sonar-huge-online',
        'llama-3.1-sonar-small-128k-online'
      ];

      try {
        console.log(`🔎 Searching for articles on: ${topic}`);
        
        for (const model of models) {
          try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${perplexityApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [
                  {
                    role: 'system',
                    content: 'You are a research assistant specializing in finding recent business and entrepreneurship articles. Always provide real, published articles with actual URLs from reputable sources.'
                  },
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                max_tokens: 1500,
                top_p: 0.9,
                search_recency_filter: 'month',
                return_images: false,
                return_related_questions: false
              }),
            });

            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Found articles for topic: ${topic} using model: ${model}`);
              return { topic, content: data.choices[0].message.content };
            } else {
              const errorText = await response.text();
              console.log(`⚠️ Model ${model} failed for topic "${topic}": ${response.status} - ${errorText}`);
              continue; // Try next model
            }
          } catch (modelError) {
            console.log(`⚠️ Model ${model} error for topic "${topic}":`, modelError.message);
            continue; // Try next model
          }
        }
        
        // If all models failed
        throw new Error(`All Perplexity models failed for topic: ${topic}`);
        
      } catch (error) {
        console.error(`❌ Error fetching articles for topic "${topic}":`, error);
        return { topic, content: null, error: error.message };
      }
    });

    const topicResults = await Promise.all(articlePromises);
    console.log('📊 Article search completed. Processing results...');

    // Parse and structure the articles
    const articles = [];
    for (const result of topicResults) {
      if (!result.content || result.error) {
        console.log(`⚠️ Skipping topic "${result.topic}" due to error:`, result.error);
        continue;
      }

      // Extract article data from AI response  
      const articleBlocks = result.content.split(/ARTICLE \d+:/);
      
      for (let i = 1; i < articleBlocks.length; i++) {
        const block = articleBlocks[i].trim();
        
        // Extract structured data using regex patterns
        const titleMatch = block.match(/Title:\s*(.+?)(?:\n|$)/i);
        const urlMatch = block.match(/URL:\s*(.+?)(?:\n|$)/i);
        const sourceMatch = block.match(/Source:\s*(.+?)(?:\n|$)/i);
        const authorMatch = block.match(/Author:\s*(.+?)(?:\n|$)/i);
        const publishedMatch = block.match(/Published:\s*(.+?)(?:\n|$)/i);
        const summaryMatch = block.match(/Summary:\s*(.+?)(?:\n\n|$)/is);

        if (titleMatch && urlMatch) {
          const title = titleMatch[1].trim().replace(/[\[\]]/g, '');
          const url = urlMatch[1].trim();
          const source = sourceMatch ? sourceMatch[1].trim() : 'Unknown Source';
          const author = authorMatch ? authorMatch[1].trim() : null;
          const summary = summaryMatch ? summaryMatch[1].trim() : title;
          
          // Skip if URL looks invalid
          if (!url.startsWith('http')) {
            continue;
          }

          const keywords = extractKeywords(title + ' ' + summary);
          const trendScore = calculateTrendScore(summary);
          const opportunityScore = calculateOpportunityScore(summary);
          
          articles.push({
            title: title.substring(0, 100),
            description: summary.substring(0, 250),
            category: getCategoryFromTopic(result.topic),
            trend_score: trendScore,
            opportunity_score: opportunityScore,
            keywords: keywords,
            sentiment: determineSentiment(summary),
            market_size_indicator: determineMarketSize(summary),
            geographic_relevance: extractGeography(summary),
            article_url: url,
            article_source: source,
            author: author,
            publication_date: parsePublishedDate(publishedMatch ? publishedMatch[1] : null),
            summary: summary.substring(0, 300),
            source_urls: [url],
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          });
        }
      }
    }

    console.log(`📝 Processed ${articles.length} articles for database insertion`);

    if (articles.length === 0) {
      console.log('⚠️ No articles found to insert');
      return new Response(JSON.stringify({
        success: true,
        articles: [],
        message: 'No articles found in this search'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplicate articles by URL to avoid duplicates
    const seenUrls = new Set();
    const uniqueArticles = articles.filter(article => {
      if (seenUrls.has(article.article_url)) {
        console.log(`⚠️ Skipping duplicate URL: ${article.article_url}`);
        return false;
      }
      seenUrls.add(article.article_url);
      return true;
    });

    console.log(`📝 After deduplication: ${uniqueArticles.length} unique articles`);

    if (uniqueArticles.length === 0) {
      console.log('⚠️ No unique articles to insert after deduplication');
      return new Response(JSON.stringify({
        success: true,
        articles: [],
        message: 'No unique articles found after deduplication'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store articles in database with error handling
    const { data: storedArticles, error: insertError } = await supabase
      .from('trends')
      .insert(uniqueArticles)
      .select();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw insertError;
    }

    // Clean up expired articles
    await supabase
      .from('trends')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString());

    console.log(`✅ Successfully stored ${storedArticles?.length || 0} articles`);

    return new Response(JSON.stringify({
      success: true,
      articles: storedArticles,
      message: `Found and stored ${storedArticles?.length || 0} trending articles`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in trends-analyzer function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      details: 'Failed to fetch trending articles'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to map topics to categories
function getCategoryFromTopic(topic: string): string {
  if (topic.toLowerCase().includes('ai')) return 'ai';
  if (topic.toLowerCase().includes('startup') || topic.toLowerCase().includes('mvp')) return 'startup';
  if (topic.toLowerCase().includes('growth') || topic.toLowerCase().includes('marketing')) return 'business';
  if (topic.toLowerCase().includes('no-code') || topic.toLowerCase().includes('automation')) return 'technology';
  return 'business';
}

// Helper function to parse publication dates
function parsePublishedDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  try {
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // If parsing fails, return a recent date as fallback
      return new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

function extractKeywords(text: string): string[] {
  const keywords = [];
  const commonPatterns = [
    /AI|artificial intelligence/gi,
    /blockchain|crypto|web3/gi,
    /sustainability|ESG|green/gi,
    /remote work|digital nomad/gi,
    /fintech|payments/gi,
    /healthcare|medtech/gi,
    /education|edtech/gi,
    /e-commerce|marketplace/gi,
    /SaaS|software/gi,
    /automation|robotics/gi
  ];

  commonPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()));
    }
  });

  return [...new Set(keywords)].slice(0, 10);
}

function calculateTrendScore(text: string): number {
  let score = 5.0; // Base score
  
  // Boost for growth indicators
  if (/growing|increasing|rising|surge|boom/gi.test(text)) score += 1.5;
  if (/billion|million|funding|investment/gi.test(text)) score += 1.0;
  if (/new|emerging|innovative|breakthrough/gi.test(text)) score += 0.8;
  if (/market|demand|adoption/gi.test(text)) score += 0.7;
  
  return Math.min(10.0, Math.max(1.0, score));
}

function calculateOpportunityScore(text: string): number {
  let score = 5.0;
  
  if (/opportunity|potential|untapped/gi.test(text)) score += 1.5;
  if (/early stage|nascent|emerging/gi.test(text)) score += 1.2;
  if (/disruption|transformation/gi.test(text)) score += 1.0;
  if (/gap|need|problem/gi.test(text)) score += 0.8;
  
  return Math.min(10.0, Math.max(1.0, score));
}

function determineSentiment(text: string): string {
  const positiveWords = /growth|opportunity|success|innovation|positive|bullish|optimistic/gi;
  const negativeWords = /decline|challenge|risk|negative|bearish|pessimistic|problem/gi;
  
  const positiveCount = (text.match(positiveWords) || []).length;
  const negativeCount = (text.match(negativeWords) || []).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function determineMarketSize(text: string): string {
  if (/billion|massive|huge|dominant/gi.test(text)) return 'mature';
  if (/growing|expanding|scaling/gi.test(text)) return 'growing';
  return 'emerging';
}

function extractGeography(text: string): string[] {
  const regions = [];
  const patterns = [
    { pattern: /US|United States|America/gi, region: 'North America' },
    { pattern: /Europe|EU|European/gi, region: 'Europe' },
    { pattern: /Asia|China|India|Japan/gi, region: 'Asia' },
    { pattern: /global|worldwide|international/gi, region: 'Global' }
  ];

  patterns.forEach(({ pattern, region }) => {
    if (pattern.test(text)) {
      regions.push(region);
    }
  });

  return regions.length > 0 ? regions : ['Global'];
}

function generateDescription(trendText: string, fullAnalysis: string): string {
  // Extract a concise description from the trend
  const sentences = trendText.split(/[.!?]+/);
  let description = sentences[0] || trendText;
  
  // Clean up and limit length
  description = description.replace(/^\d+\.\s*/, '').trim();
  if (description.length > 200) {
    description = description.substring(0, 197) + '...';
  }
  
  return description;
}