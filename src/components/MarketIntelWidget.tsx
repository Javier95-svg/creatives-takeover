import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, LineChart, Newspaper, Zap } from "lucide-react";

interface InsightItem {
  id: string;
  data_type: string;
  industry: string;
  title: string;
  summary: string;
  insights: string[];
  market_impact: string;
  opportunity_score: number;
  relevance_score: number;
  freshness_score: number;
  source: string;
  created_at: string;
}

export default function MarketIntelWidget() {
  const [industry, setIndustry] = useState("technology");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    data: InsightItem[];
    freshness_avg: number;
    confidence_score: number;
    sources_used: string[];
    cache_hit: boolean;
  } | null>(null);

  const runQuery = async (refresh_cache = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('market-data-aggregator', {
        body: {
          industries: [industry],
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          data_types: ['news', 'trend'],
          refresh_cache
        }
      });
      if (error) throw error;
      setData(data);
    } catch (err) {
      console.error('Market data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshBackend = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke('market-intelligence-refresh', { body: {} });
      await runQuery(true);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-foreground">Market Intelligence</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => runQuery(false)} disabled={loading}>
            <LineChart className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshBackend} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Keywords (optional)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Content */}
      {!data && !loading && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Enter an industry and click fetch to load insights
        </p>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4 border border-border/30 rounded-lg">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Simple stats */}
          <div className="text-xs text-muted-foreground mb-4">
            {data.sources_used.length} sources • {(data.confidence_score * 100).toFixed(0)}% confidence
          </div>

          {/* Insights grid */}
          <div className="space-y-3">
            {data.data.map((item) => (
              <div key={item.id} className="p-4 border border-border/30 rounded-lg hover:border-border/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {item.data_type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                {item.insights?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {item.insights.slice(0, 2).join(' • ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
