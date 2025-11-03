import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { corsHeaders, handleOptionsRequest, corsResponse } from '../_shared/cors.ts';

console.log('🔧 Initializing environment variables...');
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('🔍 Environment check:', {
  hasPerplexityKey: !!perplexityApiKey,
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey
});

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

if (!perplexityApiKey) {
  throw new Error('PERPLEXITY_API_KEY is not configured');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    console.log('🔍 Starting article discovery with Perplexity AI...');

    // Expanded and balanced topic clusters for better category distribution
    const insightaTopics = [
      // AI & Technology (AI-Tech category)
      'AI productivity tools for entrepreneurs',
      'machine learning applications for small business',
      'business automation tools and workflows',
      'AI-powered customer service solutions',
      
      // Startup & Validation (Startup category)
      'no-code MVP development strategies',
      'startup validation methods and frameworks',
      'bootstrapping vs venture capital funding',
      'Y Combinator startup advice and insights',
      'product-market fit strategies',
      
      // Marketing & Growth (Marketing category)
      'creative marketing strategies 2024',
      'growth hacking techniques for startups',
      'content marketing for B2B SaaS',
      'product-led growth strategies',
      'community-driven marketing approaches',
      'influencer marketing ROI measurement',
      
      // SaaS & Product (SaaS category)
      'SaaS pricing models and optimization',
      'customer onboarding best practices',
      'SaaS metrics and analytics',
      'API-first product strategies',
      
      // Business Models & Innovation
      'creator economy platforms and monetization',
      'subscription business model innovations',
      'marketplace business strategies',
      'Web3 practical business applications',
      
      // Industry Verticals
      'HealthTech entrepreneurship opportunities',
      'EdTech innovation and market trends',
      'FinTech regulatory opportunities',
      'Climate tech business opportunities',
      
      // Practical Entrepreneurship
      'solopreneur business models and systems',
      'remote team building and management',
      'customer acquisition for service businesses',
      'building in public strategies and benefits',
      'side hustle to full-time business transition'
    ];

    console.log('📰 Searching for articles on topics:', insightaTopics.slice(0, 12));

    // Generate article searches for each topic with model fallback (12 topics = ~24-36 articles)
    const articlePromises = insightaTopics.slice(0, 12).map(async (topic: string) => {
      const systemPrompt = `You are an expert business analyst specializing in identifying trending business articles and opportunities for entrepreneurs. Analyze articles about "${topic}" and provide structured data.`;

      const userPrompt = `Find 2-3 recent high-quality articles about "${topic}" published in the last 2 weeks. Focus on:

- Articles from reputable business publications (Forbes, TechCrunch, Entrepreneur, Harvard Business Review, MIT Technology Review, Fast Company, etc.)
- Actionable insights for entrepreneurs and business builders  
- Recent developments and practical strategies
- Include the EXACT article URL, title, publication source, author if available
- Brief summary highlighting key insights and business opportunities

Please provide structured data with this EXACT format:

ARTICLE 1:
- Title: [exact article title]
- URL: [direct link to the full article]  
- Source: [publication name]
- Author: [author name if available]
- Published: [publication date if available, format: YYYY-MM-DD]
- Summary: [2-3 sentence summary highlighting key insights and business opportunities]

ARTICLE 2: [same format]

IMPORTANT: Only provide actual published articles with real working URLs from credible business/tech publications. Do not generate hypothetical content.`;

      try {
        console.log(`🔎 Searching for articles on: ${topic} with Perplexity AI`);
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.2,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Perplexity AI error for topic "${topic}": ${response.status} - ${errorText}`);
          throw new Error(`Perplexity AI request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Found articles for topic: ${topic} using Perplexity AI`);
        return { topic, content: data.choices[0].message.content };
        
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
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          });
        }
      }
    }

    console.log(`📝 Processed ${articles.length} articles for database insertion`);

    // Filter out outdated articles (older than 60 days)
    const nowTs = Date.now();
    const maxAgeDays = 60;
    const recentArticles = articles.filter(a => {
      if (!a.publication_date) {
        console.log(`📅 No publication date for article: ${a.title.substring(0, 50)}... - keeping it`);
        return true;
      }
      const ts = new Date(a.publication_date).getTime();
      const isRecent = !Number.isNaN(ts) && (nowTs - ts) <= maxAgeDays * 24 * 60 * 60 * 1000;
      const daysAgo = !Number.isNaN(ts) ? Math.floor((nowTs - ts) / (24 * 60 * 60 * 1000)) : 'N/A';
      console.log(`📅 Article: ${a.title.substring(0, 50)}... | Date: ${a.publication_date} | Days ago: ${daysAgo} | Keep: ${isRecent}`);
      return isRecent;
    });

    console.log(`🗂️ After recency filter: ${recentArticles.length} articles`);

    // Validate URLs are reachable before recommending
    const validated = await Promise.all(
      recentArticles.map(async (a) => (await isUrlReachable(a.article_url)) ? a : null)
    );
    const validArticles = validated.filter((x): x is typeof recentArticles[number] => x !== null);

    console.log(`🔗 After URL validation: ${validArticles.length} articles`);

    if (validArticles.length === 0) {
      console.log('⚠️ No valid articles found after validation');
      return corsResponse({
        success: true,
        articles: [],
        message: 'No valid articles found after validation'
      });
    }

    // Deduplicate articles by URL to avoid duplicates
    const seenUrls = new Set();
    const uniqueArticles = validArticles.filter(article => {
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
      return corsResponse({
        success: true,
        articles: [],
        message: 'No unique articles found after deduplication'
      });
    }

    // Store articles in database with error handling, skipping duplicates
    const insertedArticles: any[] = [];
    for (const article of uniqueArticles) {
      const { data, error } = await supabase
        .from('trends')
        .insert(article)
        .select()
        .single();

      if (error) {
        const msg = (error as any)?.message || '';
        const code = (error as any)?.code || '';
        if (code === '23505' || msg.includes('duplicate key') || msg.includes('uq_trends_article_url')) {
          console.log(`↩️ Skipping duplicate article URL: ${article.article_url}`);
          continue;
        }
        console.error('❌ Database insert error for article:', article.article_url, error);
        throw error;
      }

      if (data) insertedArticles.push(data);
    }

    // Clean up expired articles
    await supabase
      .from('trends')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString());

    console.log(`✅ Successfully stored ${insertedArticles.length} articles`);

    return corsResponse({
      success: true,
      articles: insertedArticles,
      message: `Found and stored ${insertedArticles.length} trending articles`
    });

  } catch (error: any) {
    console.error('❌ Error in trends-analyzer function:', error);
    return corsResponse({ 
      error: error.message,
      success: false,
      details: 'Failed to fetch trending articles'
    }, 500);
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

// Validate that an external URL is reachable before recommending it
async function isUrlReachable(url: string, timeoutMs = 6000): Promise<boolean> {
  const target = url.trim();

  // Try a quick HEAD request first
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const head = await fetch(target, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (head.ok && head.status < 400) {
      return true;
    }
  } catch (_) {
    // Ignore and fallback to GET
  } finally {
    clearTimeout(timer);
  }

  // Fallback to a lightweight GET (some sites block HEAD)
  const controller2 = new AbortController();
  const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      signal: controller2.signal,
      headers: { 'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' }
    });
    return res.ok && res.status < 400;
  } catch (_) {
    return false;
  } finally {
    clearTimeout(timer2);
  }
}