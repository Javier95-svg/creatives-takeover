import React from 'react';
import { cn } from '@/lib/utils';
import type { PMFReadinessAnalysis } from '@/hooks/usePMFLab';

interface PMFDimensionBarsProps {
  dimensions: PMFReadinessAnalysis['dimensions'];
}

const DIMENSION_LABELS: Array<{ key: keyof PMFReadinessAnalysis['dimensions']; label: string; description: string }> = [
  {
    key: 'painClarity',
    label: 'Pain Clarity',
    description: 'How specific and recurring is the pain across conversations?',
  },
  {
    key: 'urgency',
    label: 'Urgency',
    description: 'Are people actively doing something about this problem today?',
  },
  {
    key: 'consistency',
    label: 'Consistency',
    description: 'Did different people independently say similar things?',
  },
  {
    key: 'demandProof',
    label: 'Demand Proof',
    description: 'Did people take a concrete action (join, pay, share, ask for pricing)?',
  },
  {
    key: 'founderSelfAwareness',
    label: 'Self-Awareness',
    description: 'Does the founder know what they still don\'t know?',
  },
];

const getBarColor = (score: number): string => {
  if (score >= 14) return 'bg-green-500';
  if (score >= 8) return 'bg-amber-500';
  return 'bg-red-500';
};

const getScoreBadge = (score: number): string => {
  if (score >= 14) return 'text-green-700 dark:text-green-400 bg-green-500/10';
  if (score >= 8) return 'text-amber-700 dark:text-amber-400 bg-amber-500/10';
  return 'text-red-700 dark:text-red-400 bg-red-500/10';
};

const PMFDimensionBars: React.FC<PMFDimensionBarsProps> = ({ dimensions }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Score Breakdown</h3>
      <div className="space-y-5">
        {DIMENSION_LABELS.map(({ key, label, description }) => {
          const dim = dimensions[key];
          const pct = Math.min(100, Math.max(0, (dim.score / 20) * 100));

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{description}</p>
                </div>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full shrink-0', getScoreBadge(dim.score))}>
                  {dim.score}/20
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', getBarColor(dim.score))}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Explanation */}
              {dim.explanation && (
                <p className="text-xs text-muted-foreground leading-relaxed">{dim.explanation}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PMFDimensionBars;
