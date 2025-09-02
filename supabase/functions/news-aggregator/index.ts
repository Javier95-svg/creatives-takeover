import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NEWSAPI_KEY = Deno.env.get('NEWSAPI_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Initialize Supabase client with service role for inserting data
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Allowlisted domains for news sources
const ALLOWED_DOMAINS = [
  'techcrunch.com', 'bloomberg.com', 'reuters.com', 'ap.org', 'bbc.com',
  'cnn.com', 'forbes.com', 'wsj.com', 'nytimes.com', 'theguardian.com',
  'axios.com', 'venturebeat.com', 'theverge.com', 'wired.com', 'arstechnica.com',
  'fastcompany.com', 'inc.com', 'entrepreneur.com', 'harvard.edu', 'mit.edu',
  'stanford.edu', 'github.com', 'medium.com', 'substack.com'
];

interface NewsAPIArticle {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: {
    name: string;
  };
  author?: string;
}

// Normalize URL by removing tracking parameters and fragments
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'referrer'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    urlObj.hash = ''; // Remove fragment
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Check if domain is in allowlist
function isDomainAllowed(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(allowed => 
      domain === allowed || domain.endsWith('.' + allowed)
    );
  } catch {
    return false;
  }
}

// Verify URL accessibility and extract canonical URL
async function verifyAndCanonicalizeUrl(url: string): Promise<string | null> {
  try {
    console.log(`🔍 Verifying URL: ${url}`);
    
    // First try HEAD request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'NewsAggregator/1.0' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`❌ HEAD request failed: ${response.status}`);
        return null;
      }
      
      // If HEAD worked, try to get canonical URL with GET
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 8000);
      
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        headers: { 'User-Agent': 'NewsAggregator/1.0' }
      });
      clearTimeout(getTimeoutId);
      
      if (getResponse.ok) {
        const html = await getResponse.text();
        
        // Extract canonical URL from HTML
        const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
        if (canonicalMatch) {
          const canonicalUrl = canonicalMatch[1];
          console.log(`✅ Found canonical URL: ${canonicalUrl}`);
          return normalizeUrl(canonicalUrl);
        }
      }
      
      return normalizeUrl(url);
    } catch (error) {
      clearTimeout(timeoutId);
      console.log(`❌ URL verification failed: ${error.message}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ URL verification error: ${error.message}`);
    return null;
  }
}

// Check if article already exists in database
async function articleExists(url: string, title: string): Promise<boolean> {
  const { data } = await supabase
    .from('trends')
    .select('id')
    .or(`article_url.eq.${url},title.eq.${title}`)
    .limit(1);
  
  return (data?.length || 0) > 0;
}

// Calculate trend and opportunity scores based on article metadata
function calculateScores(article: NewsAPIArticle): { trendScore: number; opportunityScore: number } {
  let trendScore = 50; // Base score
  let opportunityScore = 40;
  
  // Boost score for certain keywords
  const highValueKeywords = ['AI', 'startup', 'funding', 'IPO', 'acquisition', 'breakthrough', 'innovation'];
  const title = article.title.toLowerCase();
  const description = (article.description || '').toLowerCase();
  
  highValueKeywords.forEach(keyword => {
    if (title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())) {
      trendScore += 10;
      opportunityScore += 8;
    }
  });
  
  // Boost for reputable sources
  const reputableSources = ['Reuters', 'Bloomberg', 'TechCrunch', 'Forbes'];
  if (reputableSources.some(source => article.source.name.includes(source))) {
    trendScore += 15;
    opportunityScore += 10;
  }
  
  // Recent articles get higher scores
  const publishedDate = new Date(article.publishedAt);
  const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 24) {
    trendScore += 20;
    opportunityScore += 15;
  } else if (hoursOld < 72) {
    trendScore += 10;
    opportunityScore += 8;
  }
  
  return {
    trendScore: Math.min(100, Math.max(0, trendScore)),
    opportunityScore: Math.min(100, Math.max(0, opportunityScore))
  };
}

// Extract keywords from title and description
function extractKeywords(article: NewsAPIArticle): string[] {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were'];
  
  const words = text
    .split(/[^\w]+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10);
    
  return [...new Set(words)]; // Remove duplicates
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 News aggregator started');
    
    if (!NEWSAPI_KEY) {
      throw new Error('NEWSAPI_KEY not configured');
    }

    // Parse request body for customization options
    const body = await req.json().catch(() => ({}));
    const {
      topics = 'business OR technology OR AI OR startup OR innovation',
      sources,
      countries = 'us',
      pageSize = 20,
      recencyDays = 7
    } = body;

    // Calculate date range
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - recencyDays);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    console.log(`📊 Fetching articles: topics="${topics}", from=${fromDateStr}, pageSize=${pageSize}`);

    // Build NewsAPI query
    const params = new URLSearchParams({
      q: topics,
      from: fromDateStr,
      sortBy: 'popularity',
      pageSize: pageSize.toString(),
      apiKey: NEWSAPI_KEY,
      language: 'en'
    });

    if (sources) {
      params.set('sources', sources);
    }
    // Note: 'country' is not supported on the /everything endpoint. Do not include it.

    const newsApiUrl = `https://newsapi.org/v2/everything?${params.toString()}`;
    console.log(`🌐 Calling NewsAPI: ${newsApiUrl.replace(NEWSAPI_KEY, '[REDACTED]')}`);

    const response = await fetch(newsApiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ NewsAPI error: ${response.status} - ${errorText}`);
      throw new Error(`NewsAPI returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`📄 NewsAPI returned ${data.articles?.length || 0} articles`);

    if (!data.articles || data.articles.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No new articles found',
        saved: 0,
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const processed: any[] = [];
    let saved = 0;
    let skipped = 0;

    for (const article of data.articles) {
      try {
        console.log(`\n🔄 Processing: ${article.title}`);

        // Skip if missing essential data
        if (!article.title || !article.url || !article.description) {
          console.log('❌ Skipped: Missing essential data');
          skipped++;
          continue;
        }

        // Skip if too old
        const publishedDate = new Date(article.publishedAt);
        const daysOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld > recencyDays) {
          console.log(`❌ Skipped: Too old (${Math.round(daysOld)} days)`);
          skipped++;
          continue;
        }

        // Normalize and check domain
        const normalizedUrl = normalizeUrl(article.url);
        if (!isDomainAllowed(normalizedUrl)) {
          console.log(`❌ Skipped: Domain not allowed (${new URL(normalizedUrl).hostname})`);
          skipped++;
          continue;
        }

        // Check if already exists
        if (await articleExists(normalizedUrl, article.title)) {
          console.log('❌ Skipped: Already exists in database');
          skipped++;
          continue;
        }

        // Verify URL accessibility and get canonical URL
        const verifiedUrl = await verifyAndCanonicalizeUrl(normalizedUrl);
        if (!verifiedUrl) {
          console.log('❌ Skipped: URL not accessible');
          skipped++;
          continue;
        }

        // Calculate scores and extract metadata
        const { trendScore, opportunityScore } = calculateScores(article);
        const keywords = extractKeywords(article);

        // Determine category based on content
        const title = article.title.toLowerCase();
        const description = (article.description || '').toLowerCase();
        let category = 'business';
        
        if (title.includes('ai') || title.includes('artificial intelligence') || description.includes('ai')) {
          category = 'technology';
        } else if (title.includes('startup') || title.includes('funding') || title.includes('venture')) {
          category = 'startup';
        } else if (title.includes('marketing') || title.includes('creator') || title.includes('content')) {
          category = 'marketing';
        }

        // Prepare trend data for insertion
        const trendData = {
          title: article.title.substring(0, 200), // Limit title length
          description: article.description.substring(0, 500), // Limit description
          category,
          trend_score: trendScore,
          opportunity_score: opportunityScore,
          keywords,
          sentiment: 'neutral', // Could be enhanced with sentiment analysis
          market_size_indicator: 'Medium',
          geographic_relevance: ['US', 'Global'],
          article_url: verifiedUrl,
          article_source: article.source.name,
          author: article.author,
          publication_date: article.publishedAt,
          summary: article.description.substring(0, 300),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          is_active: true
        };

        // Insert into database
        const { error: insertError } = await supabase
          .from('trends')
          .insert(trendData);

        if (insertError) {
          console.error(`❌ Database insert error:`, insertError);
          skipped++;
          continue;
        }

        console.log(`✅ Saved: ${article.title}`);
        processed.push({
          title: article.title,
          url: verifiedUrl,
          score: trendScore
        });
        saved++;

      } catch (error) {
        console.error(`❌ Error processing article: ${error.message}`);
        skipped++;
      }
    }

    console.log(`\n📊 Processing complete: ${saved} saved, ${skipped} skipped`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully processed ${saved + skipped} articles`,
      saved,
      skipped,
      processed: processed.slice(0, 5) // Return sample of what was processed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ News aggregator error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});