import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEWSAPI_KEY = Deno.env.get("NEWSAPI_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const CURATED_DOMAINS = [
  "techcrunch.com",
  "wired.com",
  "technologyreview.com",
  "theverge.com",
  "sifted.eu",
  "forbes.com",
  "inc.com",
  "businessinsider.com",
  "bloomberg.com",
  "reuters.com",
  "wsj.com",
  "ft.com",
  "economist.com",
  "venturebeat.com",
  "theinformation.com",
  "ycombinator.com",
  "review.firstround.com",
  "a16z.com",
  "news.crunchbase.com",
  "fastcompany.com",
];

type ContentType = "all" | "funding" | "market_trend" | "regulation" | "competitor" | "general";

interface NewsApiArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
}

function normalizeIndustry(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 80) : "";
}

function normalizeCachePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stripTracking(url: string) {
  try {
    const parsed = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "referrer"].forEach((param) =>
      parsed.searchParams.delete(param),
    );
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function classifyArticle(article: NewsApiArticle): Exclude<ContentType, "all"> {
  const text = `${article.title} ${article.description ?? ""} ${article.content ?? ""}`.toLowerCase();

  if (/(funding|raised|raises|series [abc]|seed round|pre-seed|venture|investment|invests|valuation)/i.test(text)) {
    return "funding";
  }
  if (/(regulation|regulatory|law|policy|compliance|antitrust|sec |fda |privacy rule|ban|approved)/i.test(text)) {
    return "regulation";
  }
  if (/(launches|announces|acquires|acquisition|merger|competitor|rival|market share|partnership)/i.test(text)) {
    return "competitor";
  }
  if (/(trend|growth|forecast|market|adoption|demand|consumer behavior|spending|report|survey)/i.test(text)) {
    return "market_trend";
  }
  return "general";
}

function summarize(article: NewsApiArticle) {
  const text = (article.description || article.content || "No summary available.")
    .replace(/\s+/g, " ")
    .replace(/\[\+\d+\schars\]$/i, "")
    .trim();
  if (text.length <= 320) return text;
  return `${text.slice(0, 317).trim()}...`;
}

function buildQuery(industry: string, contentType: ContentType) {
  const topicTerms: Record<ContentType, string> = {
    all: "(funding OR regulation OR market trend OR competitor OR startup OR launch)",
    funding: "(funding OR raised OR raises OR \"Series A\" OR seed OR venture OR valuation)",
    market_trend: "(\"market trend\" OR growth OR forecast OR adoption OR demand OR report)",
    regulation: "(regulation OR regulatory OR law OR policy OR compliance)",
    competitor: "(competitor OR rival OR launches OR acquisition OR partnership OR \"market share\")",
    general: "(startup OR technology OR business OR innovation)",
  };

  return `"${industry}" AND ${topicTerms[contentType] ?? topicTerms.all}`;
}

async function readCache(cacheKey: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("market_insights_cache")
    .select("insights_data, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.warn("Industry news cache read failed:", error.message);
    return null;
  }

  return data?.insights_data ?? null;
}

async function writeCache(cacheKey: string, queryParams: Record<string, unknown>, data: Record<string, unknown>) {
  if (!supabase) return;
  const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("market_insights_cache")
    .upsert(
      {
        cache_key: cacheKey,
        query_params: queryParams,
        insights_data: data,
        confidence_score: 0.75,
        data_sources: ["NewsAPI"],
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" },
    );

  if (error) {
    console.warn("Industry news cache write failed:", error.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!NEWSAPI_KEY) {
      throw new Error("NEWSAPI_KEY is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const industry = normalizeIndustry(body.industry);
    const contentType: ContentType = ["all", "funding", "market_trend", "regulation", "competitor", "general"].includes(
      body.contentType,
    )
      ? body.contentType
      : "all";
    const pageSize = Math.min(Math.max(Number(body.pageSize ?? 12), 4), 20);

    if (!industry) {
      return new Response(
        JSON.stringify({ success: true, industry: "", contentType, cached: false, articles: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cacheKey = `industry-news:${normalizeCachePart(industry)}:${contentType}`;
    const cached = await readCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 14);

    const params = new URLSearchParams({
      q: buildQuery(industry, contentType),
      from: fromDate.toISOString().split("T")[0],
      sortBy: "publishedAt",
      pageSize: String(pageSize * 2),
      language: "en",
      domains: CURATED_DOMAINS.join(","),
      apiKey: NEWSAPI_KEY,
    });

    const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`NewsAPI returned ${response.status}: ${text}`);
    }

    const payload = await response.json();
    const seenUrls = new Set<string>();
    const articles = ((payload.articles ?? []) as NewsApiArticle[])
      .filter((article) => article.title && article.url && article.publishedAt && article.source?.name)
      .map((article) => {
        const url = stripTracking(article.url);
        return {
          id: crypto.randomUUID(),
          headline: article.title,
          sourceName: article.source.name,
          publishedAt: article.publishedAt,
          summary: summarize(article),
          url,
          contentType: classifyArticle(article),
        };
      })
      .filter((article) => {
        if (seenUrls.has(article.url)) return false;
        seenUrls.add(article.url);
        return contentType === "all" || article.contentType === contentType;
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, pageSize);

    const result = {
      success: true,
      industry,
      contentType,
      cached: false,
      articles,
    };

    await writeCache(cacheKey, { industry, contentType, pageSize }, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Industry news feed error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        articles: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
