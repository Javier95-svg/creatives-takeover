import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Rss, TrendingUp, AlertCircle, CheckCircle2, Database, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const ArticleGenerator = () => {
  const [isGeneratingRSS, setIsGeneratingRSS] = useState(false);
  const [isGeneratingTrends, setIsGeneratingTrends] = useState(false);
  const [rssResult, setRssResult] = useState<any>(null);
  const [trendsResult, setTrendsResult] = useState<any>(null);
  const [articleCount, setArticleCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRunProgress, setAutoRunProgress] = useState(0);

  const triggerRSSFetcher = async () => {
    try {
      setIsGeneratingRSS(true);
      setRssResult(null);
      toast.info("Starting RSS article fetch from premium sources...");

      const { data, error } = await supabase.functions.invoke('rss-article-fetcher', {
        body: {}
      });

      if (error) throw error;

      setRssResult(data);
      toast.success(`RSS Fetch Complete: ${data.saved} new articles saved!`);
    } catch (error: any) {
      console.error('RSS fetch error:', error);
      toast.error(`RSS fetch failed: ${error.message}`);
    } finally {
      setIsGeneratingRSS(false);
    }
  };

  const triggerTrendsAnalyzer = async () => {
    try {
      setIsGeneratingTrends(true);
      setTrendsResult(null);
      toast.info("Starting Perplexity AI article discovery...");

      const { data, error } = await supabase.functions.invoke('trends-analyzer', {
        body: {}
      });

      if (error) throw error;

      setTrendsResult(data);
      toast.success(`Trends Analysis Complete: ${data.articles?.length || 0} articles found!`);
    } catch (error: any) {
      console.error('Trends analyzer error:', error);
      toast.error(`Trends analysis failed: ${error.message}`);
    } finally {
      setIsGeneratingTrends(false);
    }
  };

  const fetchArticleCount = async () => {
    try {
      const { count, error } = await supabase
        .from('trends')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      setArticleCount(count || 0);
    } catch (error) {
      console.error('Error fetching article count:', error);
    } finally {
      setLoadingCount(false);
    }
  };

  const triggerBoth = async () => {
    await triggerRSSFetcher();
    await triggerTrendsAnalyzer();
    await fetchArticleCount();
  };

  const autoGenerateArticles = async () => {
    try {
      setAutoRunning(true);
      setAutoRunProgress(0);
      toast.info("Starting automatic article generation (4 cycles)...");

      for (let i = 1; i <= 4; i++) {
        toast.info(`Cycle ${i}/4: Fetching articles...`);
        
        // Run RSS fetcher
        await triggerRSSFetcher();
        setAutoRunProgress((i - 0.5) * 25);
        
        // Wait 2 seconds between fetches
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Run trends analyzer
        await triggerTrendsAnalyzer();
        setAutoRunProgress(i * 25);
        
        // Wait 3 seconds before next cycle
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      await fetchArticleCount();
      toast.success("Auto-generation complete! Check article count.");
    } catch (error) {
      console.error('Auto-generation error:', error);
      toast.error("Auto-generation encountered an error");
    } finally {
      setAutoRunning(false);
      setAutoRunProgress(0);
    }
  };

  useEffect(() => {
    fetchArticleCount();
    const interval = setInterval(fetchArticleCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Article Count Status */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Active Articles in Database
            </div>
            <Badge variant={articleCount >= 40 ? "default" : "secondary"} className="text-lg px-4 py-1">
              {loadingCount ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                `${articleCount} / 60`
              )}
            </Badge>
          </CardTitle>
          <CardDescription>
            {articleCount >= 40 
              ? "✅ Good! Database has sufficient articles" 
              : `⚠️ Need ${40 - articleCount} more articles to reach target (40+)`}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Article Generator
          </CardTitle>
          <CardDescription>
            Populate the trends database with fresh articles from RSS feeds and AI-powered discovery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-run section */}
          {autoRunning && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse text-primary" />
                  Auto-generating articles...
                </span>
                <span className="font-semibold">{autoRunProgress}%</span>
              </div>
              <Progress value={autoRunProgress} className="h-2" />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Button 
              onClick={triggerRSSFetcher} 
              disabled={isGeneratingRSS}
              className="h-24 flex flex-col gap-2"
            >
              <Rss className="h-6 w-6" />
              <span>RSS Fetcher</span>
              {isGeneratingRSS && <RefreshCw className="h-4 w-4 animate-spin" />}
            </Button>

            <Button 
              onClick={triggerTrendsAnalyzer} 
              disabled={isGeneratingTrends}
              className="h-24 flex flex-col gap-2"
            >
              <TrendingUp className="h-6 w-6" />
              <span>AI Discovery</span>
              {isGeneratingTrends && <RefreshCw className="h-4 w-4 animate-spin" />}
            </Button>

            <Button 
              onClick={triggerBoth}
              disabled={isGeneratingRSS || isGeneratingTrends || autoRunning}
              variant="default"
              className="h-24 flex flex-col gap-2"
            >
              <CheckCircle2 className="h-6 w-6" />
              <span>Run Both</span>
              {(isGeneratingRSS || isGeneratingTrends) && <RefreshCw className="h-4 w-4 animate-spin" />}
            </Button>

            <Button 
              onClick={autoGenerateArticles}
              disabled={isGeneratingRSS || isGeneratingTrends || autoRunning}
              variant="secondary"
              className="h-24 flex flex-col gap-2 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground hover:opacity-90"
            >
              <Zap className="h-6 w-6" />
              <span>Auto Generate</span>
              <span className="text-xs">(4 cycles)</span>
              {autoRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
            </Button>
          </div>

          {rssResult && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Rss className="h-4 w-4" />
                  RSS Results
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Saved:</span>
                  <span className="font-semibold text-success">{rssResult.saved}</span>
                </div>
                <div className="flex justify-between">
                  <span>Skipped:</span>
                  <span className="text-muted-foreground">{rssResult.skipped}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="text-destructive">{rssResult.failed}</span>
                </div>
                {rssResult.sourceStats && (
                  <div className="pt-2 border-t">
                    <p className="font-medium mb-1">By Source:</p>
                    {Object.entries(rssResult.sourceStats).map(([source, count]: [string, any]) => (
                      <div key={source} className="flex justify-between text-xs">
                        <span>{source}:</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {trendsResult && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  AI Discovery Results
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Articles Found:</span>
                  <span className="font-semibold text-success">{trendsResult.articles?.length || 0}</span>
                </div>
                {trendsResult.message && (
                  <p className="text-muted-foreground text-xs">{trendsResult.message}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-start gap-2 p-4 bg-info-subtle dark:bg-info/20 rounded-lg border border-info dark:border-info">
            <AlertCircle className="h-5 w-5 text-info dark:text-info flex-shrink-0 mt-0.5" />
            <div className="text-sm text-info dark:text-info">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>RSS Fetcher:</strong> Pulls from 13 premium sources (HBR, TechCrunch, McKinsey, etc.)</li>
                <li><strong>AI Discovery:</strong> Uses Perplexity AI to find recent business opportunity articles</li>
                <li>Both methods deduplicate and validate articles before saving</li>
                <li>Target: 60+ active articles in the database</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
