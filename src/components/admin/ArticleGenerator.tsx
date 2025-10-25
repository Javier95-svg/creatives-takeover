import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Rss, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const ArticleGenerator = () => {
  const [isGeneratingRSS, setIsGeneratingRSS] = useState(false);
  const [isGeneratingTrends, setIsGeneratingTrends] = useState(false);
  const [rssResult, setRssResult] = useState<any>(null);
  const [trendsResult, setTrendsResult] = useState<any>(null);

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

  const triggerBoth = async () => {
    await triggerRSSFetcher();
    await triggerTrendsAnalyzer();
  };

  return (
    <div className="space-y-6">
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
          <div className="grid gap-4 md:grid-cols-3">
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
              disabled={isGeneratingRSS || isGeneratingTrends}
              variant="default"
              className="h-24 flex flex-col gap-2"
            >
              <CheckCircle2 className="h-6 w-6" />
              <span>Run Both</span>
              {(isGeneratingRSS || isGeneratingTrends) && <RefreshCw className="h-4 w-4 animate-spin" />}
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
                  <span className="font-semibold text-green-600">{rssResult.saved}</span>
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
                  <span className="font-semibold text-green-600">{trendsResult.articles?.length || 0}</span>
                </div>
                {trendsResult.message && (
                  <p className="text-muted-foreground text-xs">{trendsResult.message}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
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
