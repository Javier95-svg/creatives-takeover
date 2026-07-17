import { useState } from 'react';
import { Activity, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface HealthResult {
  checkedAt: string;
  status: 'healthy' | 'unhealthy';
  reddit: { status: string; httpStatus?: number; reason?: string; latencyMs?: number };
  configuration: { reddit: boolean; openai: boolean; perplexity: boolean; posthog: boolean };
}

export function PMFDiscoveryHealthCard() {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('pmf-customer-discovery', { body: { action: 'health' } });
      if (functionError || !data?.success) throw functionError || new Error(data?.error || 'Health check failed');
      setResult(data as HealthResult);
    } catch (err) {
      console.error('PMF discovery health check failed:', err);
      setError('Could not complete the source-health check.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="rounded-lg bg-primary/10 p-3"><Activity className="h-6 w-6 text-primary" /></div>
            <div><h3 className="font-semibold">PMF discovery health</h3><p className="text-sm text-muted-foreground">Live, sanitized runtime configuration and Reddit OAuth status.</p></div>
          </div>
          <Button size="sm" variant="outline" onClick={check} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Check
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <div className="space-y-3 rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-2">
              {result.status === 'healthy' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
              <span className="text-sm font-medium">Reddit: {result.reddit.status}</span>
              {typeof result.reddit.latencyMs === 'number' && <span className="text-xs text-muted-foreground">{result.reddit.latencyMs} ms</span>}
            </div>
            {result.reddit.reason && <p className="text-xs text-muted-foreground">Reason: {result.reddit.reason}{result.reddit.httpStatus ? ` · HTTP ${result.reddit.httpStatus}` : ''}</p>}
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.configuration).map(([name, configured]) => (
                <Badge key={name} variant="outline" className={configured ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}>{name}: {configured ? 'ready' : 'missing'}</Badge>
              ))}
            </div>
            <p className="text-caption text-muted-foreground">Checked {new Date(result.checkedAt).toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

