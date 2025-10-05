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

// Tier-1 business, technology, and entrepreneurship domains
const CURATED_DOMAINS = [
  // Original Core Sources
  'techcrunch.com',
  'wired.com',
  'hbr.org', // Harvard Business Review
  'technologyreview.com',
  'theverge.com',
  'entrepreneur.com',
  'fastcompany.com',
  'sifted.eu',
  'forbes.com',
  'inc.com',
  'businessinsider.com',
  'bloomberg.com',
  'reuters.com',
  'wsj.com', // Wall Street Journal
  
  // Business & Strategy Publications
  'mckinsey.com',
  'stratechery.com',
  'economist.com',
  'ft.com', // Financial Times
  'hbsp.harvard.edu',
  
  // Technology & Innovation
  'arstechnica.com',
  'venturebeat.com',
  'spectrum.ieee.org',
  'protocol.com',
  'theinformation.com',
  
  // Startup & Entrepreneurship
  'ycombinator.com',
  'review.firstround.com',
  'a16z.com',
  'news.crunchbase.com',
  'producthunt.com',
  
  // Marketing & Growth
  'adage.com',
  'marketingprofs.com',
  
  // SaaS & Product
  'saastr.com',
  'chartmogul.com',
  
  // No-Code & Tools
  'zapier.com',
  'webflow.com'
];

const ALLOWED_DOMAINS = CURATED_DOMAINS;

// Expanded keywords focused on business opportunities
const CURATED_KEYWORDS = [
  // AI & Technology Opportunities
  'ai', 'artificial intelligence', 'machine learning', 'automation', 'tech', 'technology', 'digital transformation',
  // Business & Startup Opportunities  
  'startup', 'startups', 'founder', 'entrepreneur', 'business', 'venture', 'funding', 'investment', 'vc', 'market gap',
  // No-code & SaaS Opportunities
  'no-code', 'nocode', 'low-code', 'saas', 'tool', 'platform', 'software', 'app', 'productivity',
  // Business Model Innovation
  'subscription', 'marketplace', 'platform business', 'business model', 'revenue model', 'monetization',
  // Market Trends & Opportunities
  'trend', 'opportunity', 'market', 'consumer behavior', 'demand', 'industry shift', 'disruption',
  // Growth & Scaling
  'growth', 'marketing', 'product', 'strategy', 'scale', 'launch', 'go-to-market', 'gtm',
  // Creator & Service Economy
  'creator', 'content', 'influencer', 'freelance', 'gig economy', 'service business', 'consulting'
];

// Expanded business opportunity-focused query variations for better category balance
const QUERY_VARIATIONS = [
  // AI & Tech Opportunities
  'AI business OR artificial intelligence startup OR automation opportunity',
  'machine learning applications OR AI tools for business',
  
  // Startup & Entrepreneurship
  'business opportunity OR market gap OR startup idea OR entrepreneurship',
  'startup validation OR MVP development OR early-stage funding',
  'bootstrapping strategies OR solopreneur business models',
  
  // Marketing & Growth
  'growth marketing OR content marketing strategies OR digital marketing trends',
  'product-led growth OR community-driven marketing',
  'B2B marketing OR SaaS marketing strategies',
  
  // SaaS & Product
  'no-code business OR SaaS opportunity OR software startup',
  'SaaS pricing models OR revenue optimization OR MRR growth',
  'API-first products OR developer tools OR productivity software',
  
  // Business Models
  'creator economy OR content monetization OR influencer business',
  'marketplace startup OR platform business OR subscription model',
  'Web3 business applications OR decentralized platforms',
  
  // Industry Verticals
  'HealthTech opportunities OR digital health startups',
  'EdTech innovation OR online learning platforms',
  'FinTech trends OR payment solutions OR financial services',
  'Climate tech OR sustainability business OR green technology',
  
  // Practical Business
  'service business OR consulting opportunity OR freelance market',
  'remote work tools OR distributed team management',
  'customer acquisition strategies OR sales automation',
  'building in public OR transparent entrepreneurship'
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

// Calculate trend and opportunity scores with business focus
function calculateScores(article: NewsAPIArticle): { trendScore: number; opportunityScore: number } {
  let trendScore = 40; // Base score
  let opportunityScore = 30;
  
  const title = article.title.toLowerCase();
  const description = (article.description || '').toLowerCase();
  const fullText = `${title} ${description}`;
  
  // Business opportunity keywords (higher weight)
  const opportunityKeywords = [
    'opportunity', 'market gap', 'new market', 'untapped', 'underserved', 'emerging', 'trend',
    'business model', 'revenue stream', 'monetization', 'startup idea', 'entrepreneur'
  ];
  
  opportunityKeywords.forEach(keyword => {
    if (fullText.includes(keyword)) {
      trendScore += 15;
      opportunityScore += 20;
    }
  });
  
  // High-value business keywords
  const businessKeywords = [
    'funding', 'investment', 'series a', 'series b', 'ipo', 'acquisition', 'merger',
    'growth', 'scale', 'expansion', 'market leader', 'disruption', 'innovation'
  ];
  
  businessKeywords.forEach(keyword => {
    if (fullText.includes(keyword)) {
      trendScore += 12;
      opportunityScore += 10;
    }
  });
  
  // Technology and AI keywords
  const techKeywords = ['ai', 'artificial intelligence', 'machine learning', 'automation', 'saas', 'platform'];
  techKeywords.forEach(keyword => {
    if (fullText.includes(keyword)) {
      trendScore += 10;
      opportunityScore += 12;
    }
  });
  
  // Boost for business-focused sources
  const businessSources = ['Harvard Business Review', 'Forbes', 'Entrepreneur', 'Inc.', 'Fast Company', 'Bloomberg'];
  if (businessSources.some(source => article.source.name.includes(source))) {
    trendScore += 20;
    opportunityScore += 15;
  }
  
  // Tech sources get moderate boost
  const techSources = ['TechCrunch', 'Wired', 'MIT Technology Review'];
  if (techSources.some(source => article.source.name.includes(source))) {
    trendScore += 15;
    opportunityScore += 10;
  }
  
  // Recent articles get higher scores
  const publishedDate = new Date(article.publishedAt);
  const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 24) {
    trendScore += 20;
    opportunityScore += 18;
  } else if (hoursOld < 72) {
    trendScore += 12;
    opportunityScore += 10;
  }
  
  return {
    trendScore: Math.min(100, Math.max(20, trendScore)),
    opportunityScore: Math.min(100, Math.max(15, opportunityScore))
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

// Business opportunity generation functions
function generateBusinessOpportunity(article: NewsAPIArticle, category: string, opportunityScore: number) {
  const title = article.title.toLowerCase();
  const description = (article.description || '').toLowerCase();
  const fullText = `${title} ${description}`;
  
  let marketGap = "New market opportunity identified";
  let targetAudience = "Businesses and entrepreneurs";
  let revenueModel = "Service-based or SaaS model";
  let entryBarrier = "Medium";
  
  // AI/Tech opportunities
  if (category === 'ai-tech') {
    marketGap = "AI automation and productivity tools are in high demand";
    targetAudience = "Small to medium businesses looking to automate processes";
    revenueModel = "SaaS subscription or per-use pricing";
    entryBarrier = fullText.includes('complex') || fullText.includes('technical') ? "High" : "Medium";
  }
  // Startup opportunities
  else if (category === 'startup') {
    marketGap = "Market validation and funding trends indicate new opportunities";
    targetAudience = "Aspiring entrepreneurs and early-stage founders";
    revenueModel = "Consulting, courses, or marketplace commissions";
    entryBarrier = "Medium";
  }
  // Marketing opportunities
  else if (category === 'marketing') {
    marketGap = "Content creation and digital marketing services are growing";
    targetAudience = "Content creators, small businesses, and marketing agencies";
    revenueModel = "Service packages, subscriptions, or commission-based";
    entryBarrier = "Low to Medium";
  }
  
  return {
    market_gap: marketGap,
    target_audience: targetAudience,
    revenue_model: revenueModel,
    entry_barrier: entryBarrier,
    time_sensitivity: opportunityScore > 70 ? "High - Act quickly" : "Medium - Good timing",
    success_factors: ["Market research", "MVP development", "Customer validation"]
  };
}

function determineSentiment(text: string): string {
  const positiveWords = ['growth', 'success', 'opportunity', 'breakthrough', 'innovation', 'expansion', 'boom'];
  const negativeWords = ['decline', 'loss', 'failure', 'crisis', 'shutdown', 'bankruptcy', 'struggle'];
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function determineMarketSize(text: string): string {
  if (text.includes('billion') || text.includes('trillion') || text.includes('massive')) return 'Large';
  if (text.includes('million') || text.includes('growing') || text.includes('expanding')) return 'Medium';
  return 'Small';
}

function determineCompetitionLevel(text: string): string {
  if (text.includes('saturated') || text.includes('competitive') || text.includes('crowded')) return 'High';
  if (text.includes('emerging') || text.includes('new') || text.includes('untapped')) return 'Low';
  return 'Medium';
}

function determineTimeSensitivity(text: string): string {
  if (text.includes('urgent') || text.includes('trending') || text.includes('hot')) return 'High';
  if (text.includes('stable') || text.includes('long-term') || text.includes('steady')) return 'Low';
  return 'Medium';
}

function extractGeographicRelevance(text: string): string[] {
  const regions = ['US', 'Europe', 'Asia', 'Global'];
  const found = [];
  
  if (text.includes('global') || text.includes('worldwide') || text.includes('international')) {
    found.push('Global');
  } else {
    if (text.includes('us') || text.includes('america') || text.includes('united states')) found.push('US');
    if (text.includes('europe') || text.includes('eu')) found.push('Europe');  
    if (text.includes('asia') || text.includes('china') || text.includes('japan')) found.push('Asia');
  }
  
  return found.length > 0 ? found : ['Global'];
}

function extractRevenueModels(text: string): string[] {
  const models = [];
  if (text.includes('subscription') || text.includes('saas')) models.push('Subscription');
  if (text.includes('marketplace') || text.includes('commission')) models.push('Commission');
  if (text.includes('service') || text.includes('consulting')) models.push('Service');
  if (text.includes('product') || text.includes('retail')) models.push('Product Sales');
  if (text.includes('advertising') || text.includes('ads')) models.push('Advertising');
  
  return models.length > 0 ? models : ['Service', 'Product Sales'];
}

function extractTargetAudience(text: string, category: string): string[] {
  const audiences = [];
  
  if (text.includes('small business') || text.includes('smb')) audiences.push('Small Businesses');
  if (text.includes('enterprise') || text.includes('large company')) audiences.push('Enterprise');
  if (text.includes('startup') || text.includes('founder')) audiences.push('Startups');
  if (text.includes('consumer') || text.includes('individual')) audiences.push('Consumers');
  if (text.includes('creator') || text.includes('influencer')) audiences.push('Content Creators');
  
  // Category-based defaults
  if (audiences.length === 0) {
    switch (category) {
      case 'ai-tech': audiences.push('Businesses', 'Tech Companies'); break;
      case 'startup': audiences.push('Entrepreneurs', 'Investors'); break;
      case 'marketing': audiences.push('Small Businesses', 'Content Creators'); break;
      default: audiences.push('Businesses', 'Entrepreneurs');
    }
  }
  
  return audiences;
}

function generateActionSteps(article: NewsAPIArticle, category: string): string[] {
  const baseSteps = [
    "Research the market opportunity thoroughly",
    "Validate the idea with potential customers",
    "Create a minimum viable product (MVP)"
  ];
  
  switch (category) {
    case 'ai-tech':
      return [
        "Learn about AI tools and automation trends",
        "Identify specific business pain points to solve",
        "Prototype a simple AI-powered solution",
        "Test with early adopters and iterate"
      ];
    case 'startup':
      return [
        "Analyze successful businesses in this space",
        "Network with industry experts and mentors",
        "Develop a lean business plan",
        "Seek feedback from potential investors"
      ];
    case 'marketing':
      return [
        "Study the latest marketing trends and tools",
        "Build a portfolio or case studies",
        "Start with a specific niche or service",
        "Scale through referrals and partnerships"
      ];
    default:
      return baseSteps;
  }
}

function calculateEntryDifficulty(text: string, category: string): number {
  let difficulty = 5; // Base difficulty (1-10 scale)
  
  // Increase difficulty for technical content
  if (text.includes('technical') || text.includes('complex') || text.includes('advanced')) {
    difficulty += 2;
  }
  
  // Decrease for service-based opportunities
  if (text.includes('service') || text.includes('consulting') || text.includes('simple')) {
    difficulty -= 1;
  }
  
  // Category-specific adjustments
  switch (category) {
    case 'ai-tech': difficulty += 1; break;
    case 'marketing': difficulty -= 1; break;
    case 'saas': difficulty += 2; break;
  }
  
  return Math.min(10, Math.max(1, difficulty));
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
    
    // Randomize query for live search behavior
    const randomQuery = QUERY_VARIATIONS[Math.floor(Math.random() * QUERY_VARIATIONS.length)];
    
    const {
      topics = randomQuery,
      sources,
      countries = 'us',
      pageSize = 25, // Increased for more variety
      recencyDays = 14 // Extended for more articles
    } = body;

    // Calculate date range with some randomization for freshness
    const fromDate = new Date();
    const randomDaysBack = Math.floor(Math.random() * recencyDays) + 1;
    fromDate.setDate(fromDate.getDate() - randomDaysBack);
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
    // Also constrain by curated domains for higher precision
    params.set('domains', CURATED_DOMAINS.join(','));
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

        // Enforce curated topic filtering (more flexible)
        const textForMatch = `${article.title} ${article.description || ''}`.toLowerCase();
        const matchesCurated = CURATED_KEYWORDS.some(kw => {
          // Support partial matches for better coverage
          if (kw.length <= 3) {
            // Short keywords need exact word match
            return new RegExp(`\\b${kw}\\b`, 'i').test(textForMatch);
          } else {
            // Longer keywords can be partial matches
            return textForMatch.includes(kw.toLowerCase());
          }
        });
        
        if (!matchesCurated) {
          console.log(`❌ Skipped: Not in curated topics (${article.title.substring(0, 50)}...)`);
          skipped++;
          continue;
        }

        // Determine category and generate business opportunity data
        const title = article.title.toLowerCase();
        const description = (article.description || '').toLowerCase();
        const fullText = `${title} ${description}`;
        
        let category = 'business';
        if (fullText.includes('ai') || fullText.includes('artificial intelligence') || fullText.includes('machine learning')) {
          category = 'ai-tech';
        } else if (fullText.includes('startup') || fullText.includes('funding') || fullText.includes('venture')) {
          category = 'startup';
        } else if (fullText.includes('marketing') || fullText.includes('creator') || fullText.includes('content')) {
          category = 'marketing';
        } else if (fullText.includes('saas') || fullText.includes('software') || fullText.includes('platform')) {
          category = 'saas';
        }

        // Generate business opportunity data
        const businessOpportunity = generateBusinessOpportunity(article, category, opportunityScore);

        // Prepare trend data with business opportunity fields
        const trendData = {
          title: article.title.substring(0, 200),
          description: article.description.substring(0, 500),
          category,
          trend_score: trendScore,
          opportunity_score: opportunityScore,
          keywords,
          sentiment: determineSentiment(fullText),
          market_size_indicator: determineMarketSize(fullText),
          competition_level: determineCompetitionLevel(fullText),
          time_sensitivity: determineTimeSensitivity(fullText),
          geographic_relevance: extractGeographicRelevance(fullText),
          article_url: verifiedUrl,
          article_source: article.source.name,
          author: article.author,
          publication_date: article.publishedAt,
          summary: article.description.substring(0, 300),
          business_opportunity: businessOpportunity,
          revenue_models: extractRevenueModels(fullText),
          target_audience: extractTargetAudience(fullText, category),
          action_steps: generateActionSteps(article, category),
          entry_difficulty: calculateEntryDifficulty(fullText, category),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
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