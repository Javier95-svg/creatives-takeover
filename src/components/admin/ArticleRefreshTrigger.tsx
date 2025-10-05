import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Database } from "lucide-react";

export const ArticleRefreshTrigger = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRssFetching, setIsRssFetching] = useState(false);
  const [stats, setStats] = useState<{ saved: number; skipped: number; sourceStats?: Record<string, number> } | null>(null);

  const triggerNewsAggregator = async () => {
    setIsRefreshing(true);
    setStats(null);
    
    try {
      toast.info("Fetching articles from 40+ new sources...");
      
      const { data, error } = await supabase.functions.invoke('news-aggregator', {
        body: { 
          limit: 50,
          sortBy: 'publishedAt'
        }
      });

      if (error) throw error;

      setStats(data);
      toast.success(`News Aggregator complete! ${data.saved} new articles added, ${data.skipped} skipped.`);
    } catch (error: any) {
      console.error("News aggregator error:", error);
      toast.error(`Failed to fetch articles: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const triggerTrendsAnalyzer = async () => {
    setIsAnalyzing(true);
    setStats(null);
    
    try {
      toast.info("Analyzing trends from expanded topics...");
      
      const { data, error } = await supabase.functions.invoke('trends-analyzer');

      if (error) throw error;

      toast.success(`Trends Analyzer complete! ${data.articles?.length || 0} articles processed.`);
      setStats({ saved: data.articles?.length || 0, skipped: 0 });
    } catch (error: any) {
      console.error("Trends analyzer error:", error);
      toast.error(`Failed to analyze trends: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerRssFetcher = async () => {
    setIsRssFetching(true);
    setStats(null);
    
    try {
      toast.info("Fetching articles from RSS feeds (McKinsey, HBR, a16z, etc.)...");
      
      const { data, error } = await supabase.functions.invoke('rss-article-fetcher');

      if (error) throw error;

      setStats(data);
      toast.success(`RSS Fetch complete! ${data.saved} new articles from ${Object.keys(data.sourceStats || {}).length} premium sources.`);
    } catch (error: any) {
      console.error("RSS fetcher error:", error);
      toast.error(`Failed to fetch RSS articles: ${error.message}`);
    } finally {
      setIsRssFetching(false);
    }
  };

  const triggerBoth = async () => {
    await triggerRssFetcher();
    await triggerNewsAggregator();
  };

  const triggerAll = async () => {
    await triggerRssFetcher();
    await triggerNewsAggregator();
    await triggerTrendsAnalyzer();
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Article Catalogue Refresh
        </CardTitle>
        <CardDescription>
          Manually trigger the expanded article fetching system. This will pull from 40+ new reliable sources including McKinsey, Harvard Business Review, YCombinator, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Button
            onClick={triggerRssFetcher}
            disabled={isRssFetching}
            className="w-full"
            size="lg"
          >
            {isRssFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching from RSS Feeds...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch RSS Articles (Premium Sources)
              </>
            )}
          </Button>

          <Button
            onClick={triggerNewsAggregator}
            disabled={isRefreshing}
            className="w-full"
            variant="secondary"
            size="lg"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching from NewsAPI...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch NewsAPI Articles
              </>
            )}
          </Button>

          <Button
            onClick={triggerTrendsAnalyzer}
            disabled={isAnalyzing}
            className="w-full"
            variant="secondary"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with Perplexity AI...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Trigger Trends Analyzer
              </>
            )}
          </Button>

          <Button
            onClick={triggerAll}
            disabled={isRefreshing || isAnalyzing || isRssFetching}
            className="w-full"
            variant="default"
            size="lg"
          >
            {isRefreshing || isAnalyzing || isRssFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch All Sources (Full Refresh)
              </>
            )}
          </Button>
        </div>

        {stats && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg space-y-2">
            <p className="text-sm font-medium">Last Refresh Results:</p>
            <p className="text-sm text-muted-foreground">
              ✅ {stats.saved} new articles added
              {stats.skipped > 0 && ` • ⏭️ ${stats.skipped} skipped (duplicates)`}
            </p>
            {stats.sourceStats && Object.keys(stats.sourceStats).length > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs font-medium mb-1">📰 Articles by Source:</p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(stats.sourceStats).map(([source, count]) => (
                    <p key={source} className="text-xs text-muted-foreground">
                      • {source}: {count}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 space-y-1">
          <p><strong>RSS Articles:</strong> Fetches from 13+ premium RSS feeds (McKinsey, Harvard Business Review, a16z, YCombinator, First Round Review, SaaStr, ChartMogul, AdAge, IEEE Spectrum, VentureBeat, Ars Technica, TechCrunch, Stratechery)</p>
          <p><strong>NewsAPI Articles:</strong> Fetches from NewsAPI using mainstream sources (Business Insider, Forbes, The Verge, Wired)</p>
          <p><strong>Trends Analyzer:</strong> Uses Perplexity AI to find articles across 36 diverse topics (AI, SaaS, Marketing, Startups, etc.)</p>
          <p><strong>Expected time:</strong> RSS (1-2 min) • NewsAPI (2-3 min) • Trends (3-5 min)</p>
        </div>
      </CardContent>
    </Card>
  );
};
