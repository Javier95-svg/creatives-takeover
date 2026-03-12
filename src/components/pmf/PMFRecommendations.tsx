import React from 'react';
import { AlertTriangle, Info, Lightbulb, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PMFRecommendation } from '@/hooks/usePMFLab';

interface PMFRecommendationsProps {
  recommendations: PMFRecommendation[];
  nextExperiment?: string;
}

const PRIORITY_CONFIG = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-400',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    label: 'Critical',
  },
  important: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    icon: Info,
    iconColor: 'text-amber-500',
    label: 'Important',
  },
  nice: {
    border: 'border-l-green-500',
    bg: 'bg-green-500/5',
    badge: 'bg-green-500/10 text-green-700 dark:text-green-400',
    icon: Lightbulb,
    iconColor: 'text-green-500',
    label: 'Nice to have',
  },
};

const PMFRecommendations: React.FC<PMFRecommendationsProps> = ({ recommendations, nextExperiment }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recommendations</h3>

      <div className="space-y-3">
        {recommendations.map((rec, i) => {
          const config = PRIORITY_CONFIG[rec.priority];
          const Icon = config.icon;

          return (
            <div
              key={i}
              className={cn(
                'border-l-4 rounded-r-lg p-4 space-y-2',
                config.border,
                config.bg
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', config.iconColor)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{rec.title}</p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', config.badge)}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{rec.action}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{rec.timeframe}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {nextExperiment && (
        <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Your best next test</p>
          <p className="text-sm text-foreground leading-relaxed">{nextExperiment}</p>
        </div>
      )}
    </div>
  );
};

export default PMFRecommendations;
