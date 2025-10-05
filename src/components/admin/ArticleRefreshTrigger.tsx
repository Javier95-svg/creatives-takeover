import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Database } from "lucide-react";

export const ArticleRefreshTrigger = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState<{ saved: number; skipped: number } | null>(null);

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

  const triggerBoth = async () => {
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
            onClick={triggerNewsAggregator}
            disabled={isRefreshing}
            className="w-full"
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
                Trigger News Aggregator
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
            onClick={triggerBoth}
            disabled={isRefreshing || isAnalyzing}
            className="w-full"
            variant="default"
            size="lg"
          >
            {isRefreshing || isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Trigger Both (Full Refresh)
              </>
            )}
          </Button>
        </div>

        {stats && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg">
            <p className="text-sm font-medium">Last Refresh Results:</p>
            <p className="text-sm text-muted-foreground">
              ✅ {stats.saved} new articles added
              {stats.skipped > 0 && ` • ⏭️ ${stats.skipped} skipped (duplicates)`}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 space-y-1">
          <p><strong>News Aggregator:</strong> Fetches from NewsAPI using expanded source list (Business Insider, Forbes, The Verge, McKinsey, etc.)</p>
          <p><strong>Trends Analyzer:</strong> Uses Perplexity AI to find articles across 36 diverse topics (AI, SaaS, Marketing, Startups, etc.)</p>
          <p><strong>Expected time:</strong> 2-5 minutes per function</p>
        </div>
      </CardContent>
    </Card>
  );
};
