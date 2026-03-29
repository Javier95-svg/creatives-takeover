import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { METRIC_DEFINITIONS, PitchDeckAnalysis } from '@/types/pitchDeckAnalyzer';
import { BookOpen, DollarSign, BarChart3, Target, TrendingUp, Users } from 'lucide-react';

interface MetricsGridProps {
  subScores: PitchDeckAnalysis['subScores'];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  TrendingUp,
  BarChart3,
  DollarSign,
  Users,
  Target,
};

const getScoreLabel = (score: number) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Good';
  return 'Needs Work';
};

const getScoreBadge = (score: number) => {
  if (score >= 85) return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700';
  if (score >= 70) return 'border-sky-500/25 bg-sky-500/10 text-sky-700';
  if (score >= 55) return 'border-amber-500/25 bg-amber-500/10 text-amber-700';
  return 'border-rose-500/25 bg-rose-500/10 text-rose-700';
};

export const MetricsGrid: React.FC<MetricsGridProps> = ({ subScores }) => {
  const metrics = METRIC_DEFINITIONS.map((metric) => ({
    ...metric,
    score: subScores[metric.key as keyof typeof subScores],
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = iconMap[metric.icon || 'BarChart3'];

        return (
          <div
            key={metric.key}
            className="rounded-[26px] border border-border/60 bg-background/80 p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.9)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold leading-5">{metric.name}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              </div>

              <Badge variant="outline" className={getScoreBadge(metric.score)}>
                {metric.score}
              </Badge>
            </div>

            <div className="mt-5 space-y-2">
              <Progress value={metric.score} className="h-2.5" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Weight {(metric.weight * 100).toFixed(0)}%
                </span>
                <span className="font-medium">{getScoreLabel(metric.score)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
