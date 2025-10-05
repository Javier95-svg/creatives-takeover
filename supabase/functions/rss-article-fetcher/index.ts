import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RSS_SOURCES = [
  { name: 'McKinsey', url: 'https://www.mckinsey.com/featured-insights/rss/featured', category: 'Business Strategy' },
  { name: 'Harvard Business Review', url: 'https://hbr.org/feed', category: 'Business Strategy' },
  { name: 'a16z', url: 'https://a16z.com/feed/', category: 'Startup' },
  { name: 'YCombinator', url: 'https://news.ycombinator.com/rss', category: 'Startup' },
  { name: 'First Round Review', url: 'https://review.firstround.com/feed', category: 'Startup' },
  { name: 'SaaStr', url: 'https://www.saastr.com/feed/', category: 'SaaS' },
  { name: 'ChartMogul', url: 'https://chartmogul.com/blog/feed/', category: 'SaaS' },
  { name: 'AdAge', url: 'https://adage.com/feeds/rss', category: 'Marketing' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss', category: 'AI & Tech' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'AI & Tech' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'AI & Tech' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'AI & Tech' },
  { name: 'Stratechery', url: 'https://stratechery.com/feed/', category: 'Business Strategy' },
];

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface RSSArticle {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  source: string;
  category: string;
}

// Parse RSS/Atom feed
async function fetchRssFeed(feedUrl: string, sourceName: string, category: string): Promise<RSSArticle[]> {
  try {
    console.log(`\n📡 Fetching RSS feed: ${sourceName}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InsightaBot/1.0)',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch ${sourceName}: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    
    // Parse XML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    if (!doc) {
      console.error(`❌ Failed to parse XML for ${sourceName}`);
      return [];
    }
    
    const articles: RSSArticle[] = [];
    
    // Try RSS 2.0 format first
    let items = doc.querySelectorAll('item');
    
    // If no items, try Atom format
    if (items.length === 0) {
      items = doc.querySelectorAll('entry');
    }
    
    console.log(`✅ Found ${items.length} items in ${sourceName} feed`);
    
    // Only process recent articles (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const item of items) {
      try {
        // Extract title
        const title = item.querySelector('title')?.textContent?.trim();
        
        // Extract link (handle both RSS and Atom)
        let link = item.querySelector('link')?.textContent?.trim();
        if (!link) {
          link = item.querySelector('link')?.getAttribute('href')?.trim();
        }
        
        // Extract description
        let description = item.querySelector('description')?.textContent?.trim() || 
                         item.querySelector('summary')?.textContent?.trim() || 
                         item.querySelector('content')?.textContent?.trim() || '';
        
        // Clean HTML from description
        description = description.replace(/<[^>]*>/g, '').substring(0, 500);
        
        // Extract publication date
        const pubDateText = item.querySelector('pubDate')?.textContent?.trim() ||
                           item.querySelector('published')?.textContent?.trim() ||
                           item.querySelector('updated')?.textContent?.trim();
        
        if (!title || !link) {
          continue;
        }
        
        // Parse date
        let publishedAt = new Date().toISOString();
        if (pubDateText) {
          try {
            const parsedDate = new Date(pubDateText);
            if (!isNaN(parsedDate.getTime())) {
              // Skip articles older than 7 days
              if (parsedDate < sevenDaysAgo) {
                continue;
              }
              publishedAt = parsedDate.toISOString();
            }
          } catch (e) {
            console.log(`⚠️ Could not parse date: ${pubDateText}`);
          }
        }
        
        articles.push({
          title,
          url: link,
          description,
          publishedAt,
          source: sourceName,
          category
        });
        
      } catch (itemError) {
        console.error(`Error parsing item in ${sourceName}:`, itemError);
      }
    }
    
    console.log(`✅ Parsed ${articles.length} valid articles from ${sourceName}`);
    return articles;
    
  } catch (error) {
    console.error(`❌ Error fetching ${sourceName}:`, error.message);
    return [];
  }
}

// Check if article exists by URL
async function articleExists(url: string): Promise<boolean> {
  const { data } = await supabase
    .from('trends')
    .select('id')
    .eq('article_url', url)
    .limit(1);
  
  return (data?.length || 0) > 0;
}

// Calculate scores
function calculateScores(article: RSSArticle) {
  const ageInHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
  const freshnessScore = Math.max(0.1, 1 - (ageInHours / 168)); // Decay over 7 days
  
  // Base trend score on source authority
  const authorityScores: Record<string, number> = {
    'McKinsey': 0.95,
    'Harvard Business Review': 0.95,
    'a16z': 0.90,
    'Stratechery': 0.90,
    'YCombinator': 0.85,
    'First Round Review': 0.85,
    'TechCrunch': 0.80,
    'VentureBeat': 0.80,
    'IEEE Spectrum': 0.85,
    'Ars Technica': 0.75,
    'SaaStr': 0.80,
    'ChartMogul': 0.75,
    'AdAge': 0.75,
  };
  
  const baseScore = authorityScores[article.source] || 0.70;
  const trendScore = baseScore * freshnessScore;
  
  // Opportunity score based on business keywords
  const opportunityKeywords = ['opportunity', 'market', 'growth', 'startup', 'launch', 'revenue', 'scale', 'investment', 'funding'];
  const opportunityCount = opportunityKeywords.filter(kw => 
    article.title.toLowerCase().includes(kw) || article.description.toLowerCase().includes(kw)
  ).length;
  
  const opportunityScore = Math.min(0.95, 0.5 + (opportunityCount * 0.1));
  
  return { trendScore, opportunityScore, freshnessScore };
}

// Extract keywords
function extractKeywords(article: RSSArticle): string[] {
  const text = `${article.title} ${article.description}`.toLowerCase();
  const keywords = new Set<string>();
  
  const keywordPatterns = [
    'ai', 'artificial intelligence', 'machine learning', 'saas', 'startup', 'funding',
    'venture capital', 'marketing', 'growth', 'seo', 'content marketing', 'social media',
    'product', 'customer', 'revenue', 'business model', 'strategy', 'innovation',
    'technology', 'digital transformation', 'automation', 'analytics', 'data',
    'blockchain', 'crypto', 'fintech', 'ecommerce', 'marketplace', 'platform'
  ];
  
  for (const pattern of keywordPatterns) {
    if (text.includes(pattern)) {
      keywords.add(pattern);
    }
  }
  
  return Array.from(keywords);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting RSS article fetch from premium sources...');
    
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const sourceStats: Record<string, number> = {};
    
    // Fetch all RSS feeds in parallel
    const feedPromises = RSS_SOURCES.map(source => 
      fetchRssFeed(source.url, source.name, source.category)
    );
    
    const allFeedResults = await Promise.all(feedPromises);
    const allArticles = allFeedResults.flat();
    
    console.log(`\n📊 Total articles fetched: ${allArticles.length}`);
    
    // Process each article
    for (const article of allArticles) {
      try {
        console.log(`\n🔄 Processing: ${article.title.substring(0, 60)}...`);
        console.log(`   Source: ${article.source}`);
        
        // Check if exists
        if (await articleExists(article.url)) {
          console.log('❌ Skipped: Already exists in database');
          totalSkipped++;
          continue;
        }
        
        // Calculate scores
        const { trendScore, opportunityScore, freshnessScore } = calculateScores(article);
        const keywords = extractKeywords(article);
        
        // Prepare trend data
        const trendData = {
          title: article.title,
          description: article.description.substring(0, 500),
          category: article.category,
          trend_score: trendScore,
          opportunity_score: opportunityScore,
          source_name: `RSS - ${article.source}`,
          article_url: article.url,
          article_published_at: article.publishedAt,
          keywords: keywords,
          sentiment: 'neutral',
          market_size_estimate: null,
          geography: ['Global'],
          freshness_score: freshnessScore,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          is_active: true,
          business_opportunity: {
            market_gap: `Insights from ${article.source}`,
            target_audience: 'Entrepreneurs, Business Leaders',
            implementation_complexity: 'medium',
            time_to_market: '3-6 months',
            risk_factors: ['Market competition', 'Execution capability']
          }
        };
        
        // Insert into database
        const { error } = await supabase
          .from('trends')
          .insert(trendData);
        
        if (error) {
          console.error(`❌ Error inserting article: ${error.message}`);
          totalFailed++;
        } else {
          console.log(`✅ Saved: ${article.title.substring(0, 60)}...`);
          totalSaved++;
          sourceStats[article.source] = (sourceStats[article.source] || 0) + 1;
        }
        
      } catch (error) {
        console.error(`❌ Error processing article:`, error);
        totalFailed++;
      }
    }
    
    console.log(`\n📊 RSS Fetch Complete:`);
    console.log(`   ✅ Saved: ${totalSaved}`);
    console.log(`   ⏭️ Skipped: ${totalSkipped}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`\n📰 Articles by source:`);
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`);
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        saved: totalSaved,
        skipped: totalSkipped,
        failed: totalFailed,
        sourceStats,
        message: `RSS fetch complete: ${totalSaved} new articles from ${Object.keys(sourceStats).length} sources`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('❌ RSS fetcher error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
