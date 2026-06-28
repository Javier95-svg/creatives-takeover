import React from 'react';
import { LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PMFScoreTrendPoint } from '@/hooks/usePMFLab';

interface PMFScoreTrendProps {
  trend: PMFScoreTrendPoint[];
}

const W = 100;
const H = 40;
const PAD = 5;
const THRESHOLD = 75;

const PMFScoreTrend: React.FC<PMFScoreTrendProps> = ({ trend }) => {
  if (!trend || trend.length < 2) return null;

  const n = trend.length;
  const xFor = (i: number) => PAD + (i / (n - 1)) * (W - 2 * PAD);
  const yFor = (score: number) => PAD + (1 - Math.max(0, Math.min(100, score)) / 100) * (H - 2 * PAD);

  const points = trend.map((p, i) => `${xFor(i)},${yFor(p.score)}`).join(' ');
  const thresholdY = yFor(THRESHOLD);

  const first = trend[0].score;
  const latest = trend[n - 1].score;
  const delta = latest - first;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            PMF score over time
          </p>
        </div>
        <span className={cn(
          'text-xs font-medium',
          delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground',
        )}>
          {delta > 0 ? '+' : ''}{delta} since first run · {n} runs
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-20"
        role="img"
        aria-label={`PMF score trend across ${n} runs, latest ${latest}`}
      >
        {/* 75 threshold line */}
        <line
          x1={PAD} y1={thresholdY} x2={W - PAD} y2={thresholdY}
          stroke="hsl(var(--success))" strokeWidth={0.5} strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
        {/* score path */}
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* points */}
        {trend.map((p, i) => (
          <circle
            key={p.id}
            cx={xFor(i)} cy={yFor(p.score)} r={1.2}
            fill={p.score >= THRESHOLD ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>First: {first}</span>
        <span className="text-success">Threshold: {THRESHOLD}</span>
        <span className="font-medium text-foreground">Latest: {latest}</span>
      </div>
    </div>
  );
};

export default PMFScoreTrend;
