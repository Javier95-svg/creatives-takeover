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
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> Live Market Intelligence
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => runQuery(false)} disabled={loading}>
            <LineChart className="h-4 w-4 mr-2" /> Fetch
          </Button>
          <Button variant="secondary" size="sm" onClick={refreshBackend} disabled={refreshing}>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" style={{ animationDuration: refreshing ? '1s' : '0s' }} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <Input
            placeholder="Industry (e.g., technology, healthcare)"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
          <Input
            placeholder="Keywords, comma-separated (optional)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
        <Separator className="my-4" />

        {!data && !loading && (
          <div className="text-sm text-muted-foreground">Enter an industry and click Fetch to load real-time insights.</div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {data && !loading && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
              <Badge variant="secondary">Sources: {data.sources_used.length}</Badge>
              <Badge variant="outline">Confidence: {(data.confidence_score * 100).toFixed(0)}%</Badge>
              <Badge variant="outline">Freshness: {(data.freshness_avg * 100).toFixed(0)}%</Badge>
              {data.cache_hit && <Badge className="">Cache hit</Badge>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.data.map((item) => (
                <div key={item.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.data_type === 'news' ? 'default' : 'secondary'}>
                        {item.data_type === 'news' ? <Newspaper className="h-3 w-3 mr-1" /> : <LineChart className="h-3 w-3 mr-1" />}
                        {item.data_type}
                      </Badge>
                      <Badge variant="outline">{item.industry}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                  <div className="font-medium mb-1">{item.title}</div>
                  <div className="text-sm text-muted-foreground mb-2">{item.summary}</div>
                  {item.insights?.length > 0 && (
                    <ul className="text-sm list-disc pl-5 space-y-1">
                      {item.insights.slice(0, 3).map((ins, idx) => (
                        <li key={idx}>{ins}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <Badge variant="outline">Impact: {item.market_impact}</Badge>
                    <Badge variant="outline">Opp: {(item.opportunity_score * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline">Rel: {(item.relevance_score * 100).toFixed(0)}%</Badge>
                    <Badge variant="outline">Fresh: {(item.freshness_score * 100).toFixed(0)}%</Badge>
                    <Badge variant="secondary">{item.source}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
