import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICPAnalysis } from './types';

interface ICPPainPointsProps {
  painPoints: ICPAnalysis['painPoints'];
}

const severityColors: Record<'Critical' | 'High' | 'Medium' | 'Low', string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};

const severityBorderColors: Record<'Critical' | 'High' | 'Medium' | 'Low', string> = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-yellow-500',
  Low: 'border-l-blue-500',
};

const opportunityColor = (score: number) => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

const ICPPainPoints: React.FC<ICPPainPointsProps> = ({ painPoints }) => {
  const sorted = [...painPoints].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const topPain = sorted[0];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[1.9rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_42%),rgba(249,115,22,0.05)] shadow-[0_20px_60px_-36px_rgba(249,115,22,0.42)]">
        <CardContent className="grid gap-5 pt-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:bg-slate-950/60 dark:text-orange-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Pain map
            </div>
            <h3 className="mt-4 text-xl font-semibold">Highest-Leverage Pain Points</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/75">
              These are the pains most likely to create urgency, switching behavior, and a clear wedge.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-border/60 bg-background/85 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pain points ranked</p>
              <p className="mt-2 text-3xl font-semibold">{sorted.length}</p>
            </div>
            <div className="rounded-[1.35rem] border border-border/60 bg-background/85 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top opportunity</p>
              <p className={cn('mt-2 text-3xl font-semibold', opportunityColor(topPain?.opportunityScore ?? 0))}>
                {topPain ? `${topPain.opportunityScore}/10` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sorted.map((pain, index) => (
          <Card key={index} className={cn('rounded-[1.75rem] border border-border/60 border-l-4 shadow-sm', severityBorderColors[pain.severity])}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="mb-2 text-base font-semibold">{pain.painPoint}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('rounded-full border px-3 py-1 text-xs font-semibold', severityColors[pain.severity])}>
                      {pain.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Shows up when: {pain.whenItShowsUp}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-xs text-muted-foreground">Opportunity</p>
                  <div className="flex items-center gap-1">
                    <Zap className={cn('h-4 w-4', opportunityColor(pain.opportunityScore))} />
                    <span className={cn('text-lg font-bold', opportunityColor(pain.opportunityScore))}>
                      {pain.opportunityScore}/10
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.2rem] border border-border/50 bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current workaround</p>
                  <p className="text-sm">{pain.currentWorkaround}</p>
                </div>
                <div className="rounded-[1.2rem] border border-orange-200/60 bg-orange-50/80 p-4 dark:border-orange-900/40 dark:bg-orange-900/10">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-400">Why it stays unresolved</p>
                  <p className="text-sm">{pain.whyUnresolved}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/50 bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Switching barrier</p>
                  <p className="text-sm">{pain.switchingBarrier}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {topPain && (
        <Card className="rounded-[1.75rem] border border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Messaging Anchor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Lead with <strong>{topPain.painPoint}</strong>. It is the best candidate for a concrete promise because it combines urgency with a clear opening to switch.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ICPPainPoints;
