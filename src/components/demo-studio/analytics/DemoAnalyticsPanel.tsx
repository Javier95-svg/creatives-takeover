import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Loader2,
  MousePointerClick,
  RefreshCw,
  TrendingDown,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getDemoMetrics } from '@/lib/demoStudio/api';
import type { DemoMetrics, DemoStudioMetricsWindow } from '@/lib/demoStudio/types';

interface DemoAnalyticsPanelProps {
  demoId: string;
  /** Published demo's public_id; null/undefined while the demo is still a draft. */
  publicId?: string | null;
  className?: string;
}

const WINDOW_LABELS: Record<DemoStudioMetricsWindow, string> = {
  all: 'All time',
  '30d': 'Last 30 days',
  '7d': 'Last 7 days',
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function DemoAnalyticsPanel({ demoId, publicId, className }: DemoAnalyticsPanelProps) {
  const [metrics, setMetrics] = useState<DemoMetrics | null>(null);
  const [window, setWindow] = useState<DemoStudioMetricsWindow>('all');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    publicId && typeof globalThis.window !== 'undefined'
      ? `${globalThis.window.location.origin}/demo/${publicId}`
      : '';

  const staleDays = metrics?.oldestAssetCapturedAt
    ? Math.floor((Date.now() - new Date(metrics.oldestAssetCapturedAt).getTime()) / 86_400_000)
    : 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMetrics(await getDemoMetrics(demoId, window));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, [demoId, window]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy.');
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" /> Demo analytics
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            How viewers move through this walkthrough — and where they drop off.
          </p>
        </div>
        <Select value={window} onValueChange={(value) => setWindow(value as DemoStudioMetricsWindow)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WINDOW_LABELS) as DemoStudioMetricsWindow[]).map((key) => (
              <SelectItem key={key} value={key}>
                {WINDOW_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!publicId && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm text-muted-foreground">
          This demo is still a draft. Publish it to get a shareable link and start collecting analytics.
        </div>
      )}

      {staleDays >= 30 && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
          <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>This demo's screenshots are {staleDays} days old. Open the editor and hit Replace to refresh stale steps.</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : metrics && metrics.views > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Unique viewers"
              value={String(metrics.uniqueViewers)}
              hint={`${metrics.views} total view${metrics.views === 1 ? '' : 's'}`}
            />
            <StatCard
              icon={CheckCircle2}
              label="Completion rate"
              value={`${metrics.completionRate}%`}
              hint={`${metrics.completions} reached the end`}
            />
            <StatCard
              icon={Eye}
              label="Avg. steps viewed"
              value={String(metrics.avgStepsViewed)}
              hint={`of ${metrics.funnel.length} step${metrics.funnel.length === 1 ? '' : 's'}`}
            />
            <StatCard
              icon={MousePointerClick}
              label="CTA clicks"
              value={String(metrics.ctaClicks)}
              hint={`${metrics.ctaClickRate}% of viewers`}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Step drop-off</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share of viewers who reached each step. Watch for the first big drop — that's where the story loses people.
            </p>
            <div className="mt-4 space-y-3">
              {metrics.funnel.map((row) => (
                <div key={row.stepId ?? row.stepIndex} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-semibold text-muted-foreground">
                        {row.stepIndex + 1}
                      </span>
                      <span className="truncate">{row.title}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                      {row.dropFromPrevPct > 0 && (
                        <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
                          <TrendingDown className="h-3 w-3" /> {row.dropFromPrevPct}%
                        </Badge>
                      )}
                      <span className="tabular-nums">
                        {row.reached} · {row.reachedPct}%
                      </span>
                    </span>
                  </div>
                  <Progress value={row.reachedPct} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
          <Eye className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">No views yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {publicId
              ? 'Share your demo link to start collecting analytics. Views, completion rate, and per-step drop-off will appear here.'
              : 'Publish and share this demo to start collecting analytics.'}
          </p>
          {shareUrl && (
            <div className="mx-auto mt-4 flex max-w-md items-center gap-2">
              <code className="block flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-left text-xs">
                {shareUrl}
              </code>
              <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => void copyShare()}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
